-- Create description configuration table
CREATE TABLE IF NOT EXISTS public.description_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope text NOT NULL DEFAULT 'global',
    version integer NOT NULL DEFAULT 1,
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    sections jsonb NOT NULL,
    exclusion_rules jsonb NOT NULL,
    prompt_skeleton text NOT NULL,
    output_format text NOT NULL DEFAULT 'html_ebay_safe',
    CONSTRAINT unique_scope UNIQUE (scope)
);

-- Enable RLS
ALTER TABLE public.description_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read description_config" ON public.description_config;
DROP POLICY IF EXISTS "Allow admins to manage description_config" ON public.description_config;

-- Add RLS Policies
CREATE POLICY "Allow authenticated users to read description_config"
ON public.description_config
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to manage description_config"
ON public.description_config
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Seed the global description configuration
INSERT INTO public.description_config (scope, version, sections, exclusion_rules, prompt_skeleton, output_format)
VALUES (
    'global',
    1,
    '[
      {
        "key": "title",
        "type": "opening",
        "order": 1,
        "title": "Title",
        "enabled": true,
        "ai_guidance": "Format the title as a clean heading.",
        "static_html": null
      },
      {
        "key": "opening",
        "type": "opening",
        "order": 2,
        "title": "Introduction",
        "enabled": true,
        "ai_guidance": "1-2 compelling sentences describing the product. Do not mention Amazon, Walmart, or other supplier names.",
        "static_html": null
      },
      {
        "key": "features",
        "type": "features",
        "order": 3,
        "title": "✨ Key Features",
        "enabled": true,
        "ai_guidance": "List key features in short, punchy bullet points.",
        "static_html": null
      },
      {
        "key": "specifications",
        "type": "specifications",
        "order": 4,
        "title": "📋 Specifications",
        "enabled": true,
        "ai_guidance": "Create key/value pairs of technical specifications.",
        "static_html": null
      },
      {
        "key": "shipping",
        "type": "shipping",
        "order": 5,
        "title": "📦 Shipping & Handling",
        "enabled": true,
        "ai_guidance": null,
        "static_html": "<p>• Fast & Free Shipping on all orders</p>\n<p>• Tracking number provided within 24 hours</p>\n<p>• Professionally packaged for safe delivery</p>"
      },
      {
        "key": "returns",
        "type": "returns",
        "order": 6,
        "title": "✅ Returns Policy",
        "enabled": true,
        "ai_guidance": null,
        "static_html": "<p>30-day hassle-free returns. If you''re not satisfied, return for a full refund.</p>"
      },
      {
        "key": "contact",
        "type": "contact",
        "order": 7,
        "title": "⭐ Thank you for shopping with us! ⭐",
        "enabled": true,
        "ai_guidance": null,
        "static_html": "<p style=\"margin: 0; color: #e65100;\"><strong>⭐ Thank you for shopping with us! ⭐</strong></p>\n<p style=\"margin: 5px 0 0 0; font-size: 12px;\">Questions? Message us anytime - we respond within 24 hours!</p>"
      }
    ]'::jsonb,
    '{
      "strip_supplier_names": true,
      "supplier_names": ["Amazon", "Walmart", "AliExpress"],
      "strip_product_ids": true,
      "strip_prices": true,
      "strip_urls": true,
      "strip_images": true,
      "blocked_terms": ["Prime", "Subscribe & Save", "Amazon''s Choice", "Sold by", "Fulfilled by", "Available at", "ASIN", "UPC", "ISBN", "Seller Rank", "Sales Rank"],
      "banned_claim_phrases": ["lifetime warranty", "100% satisfaction guaranteed", "100% guaranteed"],
      "vero_brands": ["Apple", "Nike", "Adidas", "Sony"]
    }'::jsonb,
    'You are a professional eBay listing description copywriter.
Generate structured description data for the product: {title}.

You MUST return ONLY a valid JSON object matching the requested structure.
Do not wrap in markdown code blocks or return HTML. Return a JSON object with keys corresponding to the AI-generated sections.

SECTION REQUIREMENTS:
{sections_guidance}

EXCLUSIONS & POLICY RULES:
- DO NOT mention any of the following terms or brands: {blocked_terms}
- DO NOT include unsupported claims or phrases: {banned_claim_phrases}
- DO NOT mention prices or currency values.
- DO NOT include any HTTP/HTTPS links or domain names.
- DO NOT mention product identifiers like ASIN, UPC, EAN, or ISBN numbers.

PRODUCT DATA:
Title: {title}
Brand: {brand}
Category: {category}
Original Description: {description}
Bullet Points: {bulletPoints}
Features: {features}
Specifications: {specifications}
Condition: {condition}
Price: {price}',
    'html_ebay_safe'
)
ON CONFLICT (scope) DO UPDATE
SET version = description_config.version + 1,
    sections = EXCLUDED.sections,
    exclusion_rules = EXCLUDED.exclusion_rules,
    prompt_skeleton = EXCLUDED.prompt_skeleton,
    output_format = EXCLUDED.output_format,
    updated_at = timezone('utc'::text, now());
