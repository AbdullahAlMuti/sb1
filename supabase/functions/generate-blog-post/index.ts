import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveExtensionOrLegacyAuth, createServiceClient } from '../_shared/extension-session.ts';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlogGenerationRequest {
  listingIds: string[];
  generationMode: 'manual' | 'bulk' | 'auto';
  contentStyle?: 'detailed_review' | 'comparison' | 'buying_guide' | 'quick_summary';
  includeProsCons?: boolean;
  includeSpecifications?: boolean;
  affiliateTag?: string;
  customPrompt?: string;
}

interface Listing {
  id: string;
  title: string;
  amazon_asin: string;
  amazon_url: string;
  amazon_price: number;
  sku: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: 'generate-blog-post:ip',
      key: getClientIp(req),
      limit: 15,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;

    const userLimit = await checkRateLimit(supabase, {
      bucket: 'generate-blog-post:user',
      key: userId,
      limit: 20,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const { 
      listingIds, 
      generationMode = 'manual',
      contentStyle = 'detailed_review',
      includeProsCons = true,
      includeSpecifications = true,
      affiliateTag = '',
      customPrompt = ''
    }: BlogGenerationRequest = await req.json();

    // SECURITY: Input validation to prevent DoS attacks
    if (!listingIds || listingIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No listings provided' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Limit array length to prevent DoS
    if (listingIds.length > 50) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Maximum 50 listings allowed per request' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: Limit custom prompt length to prevent API abuse
    if (customPrompt && customPrompt.length > 2000) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Custom prompt exceeds maximum length of 2000 characters' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating blog posts for ${listingIds.length} listings in ${generationMode} mode`);

    // Fetch listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, amazon_asin, amazon_url, amazon_price, sku')
      .in('id', listingIds)
      .eq('user_id', userId);

    if (listingsError || !listings || listings.length === 0) {
      console.error('Error fetching listings:', listingsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch listings' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const listing of listings) {
      try {
        console.log(`Generating blog post for listing: ${listing.title || listing.amazon_asin}`);
        
        const systemPrompt = buildSystemPrompt(contentStyle, includeProsCons, includeSpecifications);
        const userPrompt = buildUserPrompt(listing, affiliateTag, customPrompt);

        // Call Lovable AI Gateway
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for listing ${listing.id}:`, aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            results.push({
              listingId: listing.id,
              success: false,
              error: 'Rate limit exceeded. Please try again later.'
            });
            continue;
          }
          if (aiResponse.status === 402) {
            results.push({
              listingId: listing.id,
              success: false,
              error: 'AI credits exhausted. Please add more credits.'
            });
            continue;
          }
          
          results.push({
            listingId: listing.id,
            success: false,
            error: 'Failed to generate content'
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const generatedContent = aiData.choices?.[0]?.message?.content;

        if (!generatedContent) {
          results.push({
            listingId: listing.id,
            success: false,
            error: 'No content generated'
          });
          continue;
        }

        // Parse the generated content
        const parsedContent = parseGeneratedContent(generatedContent, listing);

        // Build affiliate link
        const affiliateLink = buildAffiliateLink(listing.amazon_url, affiliateTag);

        // Save to database
        const { data: blogPost, error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            user_id: userId,
            listing_id: listing.id,
            title: parsedContent.title,
            content: parsedContent.content,
            excerpt: parsedContent.excerpt,
            affiliate_link: affiliateLink,
            amazon_asin: listing.amazon_asin,
            product_title: listing.title,
            product_price: listing.amazon_price,
            seo_keywords: parsedContent.keywords,
            meta_description: parsedContent.metaDescription,
            status: 'draft',
            generation_mode: generationMode
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error saving blog post for listing ${listing.id}:`, insertError);
          results.push({
            listingId: listing.id,
            success: false,
            error: 'Failed to save blog post'
          });
          continue;
        }

        console.log(`Successfully generated blog post for listing: ${listing.id}`);
        results.push({
          listingId: listing.id,
          blogPostId: blogPost.id,
          title: blogPost.title,
          success: true
        });

      } catch (error) {
        console.error(`Error processing listing ${listing.id}:`, error);
        results.push({
          listingId: listing.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Blog generation complete: ${successCount} success, ${failCount} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      results,
      summary: {
        total: listings.length,
        successful: successCount,
        failed: failCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-blog-post function:', error);
    const status = error instanceof Error && /(authorization|auth token|session)/i.test(error.message) ? 401 : 500;
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(
  contentStyle: string, 
  includeProsCons: boolean, 
  includeSpecifications: boolean
): string {
  let prompt = `You are an expert affiliate marketing content writer specializing in Amazon product reviews. 
You write SEO-optimized, engaging blog posts that help readers make informed purchasing decisions.
Your writing is honest, detailed, and includes relevant keywords naturally.

Output your response in the following JSON format:
{
  "title": "SEO-optimized blog post title (60-70 characters)",
  "metaDescription": "Compelling meta description (150-160 characters)",
  "excerpt": "Brief summary for previews (100-150 words)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "content": "Full HTML blog post content with headings, paragraphs, and formatting"
}`;

  switch (contentStyle) {
    case 'detailed_review':
      prompt += `\n\nWrite a comprehensive product review that covers:
- Product overview and key features
- Build quality and design
- Performance and usability
- Value for money analysis
- Who this product is best for`;
      break;
    case 'comparison':
      prompt += `\n\nWrite a comparison-style review that positions this product against alternatives:
- Key differentiators
- Unique selling points
- Market positioning
- Price-to-value ratio`;
      break;
    case 'buying_guide':
      prompt += `\n\nWrite a buying guide that helps readers understand:
- What to look for when buying this type of product
- Key specifications explained
- Common pitfalls to avoid
- Why this product stands out`;
      break;
    case 'quick_summary':
      prompt += `\n\nWrite a concise, scannable review that includes:
- Quick verdict at the top
- Key highlights in bullet points
- Bottom line recommendation`;
      break;
  }

  if (includeProsCons) {
    prompt += `\n\nInclude a clear Pros and Cons section with bullet points.`;
  }

  if (includeSpecifications) {
    prompt += `\n\nInclude a specifications/features breakdown section.`;
  }

  prompt += `\n\nIMPORTANT: 
- Use HTML tags for formatting (h2, h3, p, ul, li, strong, em)
- Include natural call-to-action phrases
- Optimize for the product keywords
- Make content at least 800 words for detailed reviews, 400 for quick summaries
- Sound authentic and helpful, not salesy`;

  return prompt;
}

function buildUserPrompt(listing: Listing, affiliateTag: string, customPrompt: string): string {
  let prompt = `Write a blog post for this Amazon product:

Product Title: ${listing.title || 'N/A'}
ASIN: ${listing.amazon_asin || 'N/A'}
Current Price: ${listing.amazon_price ? `$${listing.amazon_price}` : 'N/A'}
Product URL: ${listing.amazon_url || 'N/A'}`;

  if (affiliateTag) {
    prompt += `\n\nAffiliate Tag: ${affiliateTag} (incorporate naturally in call-to-action)`;
  }

  if (customPrompt) {
    prompt += `\n\nAdditional Instructions: ${customPrompt}`;
  }

  return prompt;
}

function parseGeneratedContent(content: string, listing: Listing): {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  metaDescription: string;
} {
  try {
    // Try to parse as JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || `Review: ${listing.title || listing.amazon_asin}`,
        content: parsed.content || content,
        excerpt: parsed.excerpt || '',
        keywords: parsed.keywords || [],
        metaDescription: parsed.metaDescription || ''
      };
    }
  } catch (e) {
    console.log('Could not parse as JSON, using raw content');
  }

  // Fallback: use raw content
  return {
    title: `Review: ${listing.title || listing.amazon_asin}`,
    content: content,
    excerpt: content.substring(0, 300) + '...',
    keywords: [],
    metaDescription: content.substring(0, 160)
  };
}

function buildAffiliateLink(amazonUrl: string | null, affiliateTag: string): string {
  if (!amazonUrl) return '';
  
  try {
    const url = new URL(amazonUrl);
    if (affiliateTag) {
      url.searchParams.set('tag', affiliateTag);
    }
    return url.toString();
  } catch {
    return amazonUrl || '';
  }
}
