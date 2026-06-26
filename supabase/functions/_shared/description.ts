export interface SectionConfig {
  key: string;
  type: 'opening' | 'features' | 'specifications' | 'whats_included' | 'condition' | 'shipping' | 'returns' | 'contact' | 'custom';
  enabled: boolean;
  order: number;
  title: string;
  ai_guidance: string | null;
  static_html: string | null;
}

export interface ExclusionRules {
  strip_supplier_names: boolean;
  supplier_names: string[];
  strip_product_ids: boolean;
  strip_prices: boolean;
  strip_urls: boolean;
  strip_images: boolean;
  blocked_terms: string[];
  banned_claim_phrases: string[];
  vero_brands: string[];
}

export interface DescriptionConfig {
  sections: SectionConfig[];
  exclusion_rules: ExclusionRules;
  prompt_skeleton: string;
  output_format: 'html_ebay_safe' | 'plaintext';
}

/**
 * Builds the AI generation prompt from description configuration and product data.
 */
export function buildPrompt(config: DescriptionConfig, productData: any): string {
  const aiSections = config.sections
    .filter(s => s.enabled && s.ai_guidance)
    .sort((a, b) => a.order - b.order);

  const sectionsGuidance = aiSections
    .map(s => `- "${s.key}": ${s.ai_guidance}`)
    .join('\n');

  const rules = config.exclusion_rules || {};
  const blockedTerms = [...(rules.blocked_terms || [])];
  if (rules.strip_supplier_names && Array.isArray(rules.supplier_names)) {
    blockedTerms.push(...rules.supplier_names);
  }
  const bannedClaims = rules.banned_claim_phrases || [];

  // Interpolate prompt skeleton
  let prompt = config.prompt_skeleton || '';
  
  // Replace standard placeholders
  prompt = prompt
    .replace(/{sections_guidance}/g, sectionsGuidance)
    .replace(/{blocked_terms}/g, blockedTerms.join(', '))
    .replace(/{banned_claim_phrases}/g, bannedClaims.join(', '))
    .replace(/{title}/g, productData.title || '')
    .replace(/{brand}/g, productData.brand || '')
    .replace(/{category}/g, productData.category || '')
    .replace(/{description}/g, productData.description || '')
    .replace(/{condition}/g, productData.condition || 'New')
    .replace(/{price}/g, productData.price || '');

  // Bullet points / Features formatting
  const bulletPointsText = Array.isArray(productData.bulletPoints) 
    ? productData.bulletPoints.join('\n- ') 
    : '';
  const featuresText = Array.isArray(productData.features) 
    ? productData.features.join('\n- ') 
    : '';
  const specsText = typeof productData.specifications === 'object' && productData.specifications !== null
    ? Object.entries(productData.specifications).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  prompt = prompt
    .replace(/{bulletPoints}/g, bulletPointsText)
    .replace(/{features}/g, featuresText)
    .replace(/{specifications}/g, specsText);

  return prompt;
}

/**
 * Renders description sections into clean HTML or plaintext based on config.
 */
export function renderSections(config: DescriptionConfig, aiJson: Record<string, any>, productData: any): string {
  const isPlaintext = config.output_format === 'plaintext';
  const sortedSections = [...config.sections].sort((a, b) => a.order - b.order);

  if (isPlaintext) {
    let text = '';
    for (const s of sortedSections) {
      if (!s.enabled) continue;

      if (s.type === 'opening') {
        if (s.key === 'title') {
          text += `${productData.title || 'Product'}\n\n`;
        } else {
          const content = aiJson[s.key] || '';
          if (content) text += `${content}\n\n`;
        }
      } else if (s.type === 'features') {
        const bullets = aiJson[s.key];
        if (Array.isArray(bullets) && bullets.length > 0) {
          if (s.title) text += `${s.title}\n`;
          text += bullets.map((b: string) => `- ${b}`).join('\n') + '\n\n';
        }
      } else if (s.type === 'specifications') {
        const specs = aiJson[s.key];
        if (specs) {
          if (s.title) text += `${s.title}\n`;
          if (Array.isArray(specs)) {
            text += specs.map((item: any) => `${item.label || 'Spec'}: ${item.value || ''}`).join('\n') + '\n\n';
          } else if (typeof specs === 'object') {
            text += Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\n';
          }
        }
      } else {
        const content = s.static_html || aiJson[s.key] || '';
        if (content) {
          if (s.title) text += `${s.title}\n`;
          // Strip HTML tag markers for plaintext conversion
          const cleanText = content.replace(/<[^>]*>/g, '').trim();
          text += `${cleanText}\n\n`;
        }
      }
    }
    return text.trim();
  }

  // HTML Rendering
  let html = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">\n`;

  for (const s of sortedSections) {
    if (!s.enabled) continue;

    if (s.type === 'opening') {
      if (s.key === 'title') {
        const titleText = productData.title || 'Premium Product';
        html += `  <h2 style="color: #333; margin: 15px 0;">${titleText}</h2>\n`;
      } else {
        const content = aiJson[s.key] || '';
        if (content) {
          html += `  <div style="margin: 15px 0;">\n    <p>${content}</p>\n  </div>\n`;
        }
      }
    } else if (s.type === 'features') {
      const bullets = aiJson[s.key];
      if (Array.isArray(bullets) && bullets.length > 0) {
        html += `  <div style="margin: 15px 0;">\n`;
        if (s.title) {
          html += `    <h3 style="color: #0066c0; border-bottom: 2px solid #0066c0; padding-bottom: 5px; margin-bottom: 10px;">${s.title}</h3>\n`;
        }
        html += `    <ul style="line-height: 1.8; margin-left: 20px;">\n`;
        html += bullets.map((f: string) => `      <li>${f}</li>`).join('\n') + `\n`;
        html += `    </ul>\n  </div>\n`;
      }
    } else if (s.type === 'specifications') {
      const specs = aiJson[s.key];
      let rows = '';
      if (Array.isArray(specs)) {
        for (const item of specs) {
          if (item && typeof item === 'object') {
            const label = item.label || item.name || '';
            const value = item.value || item.val || '';
            if (label && value) {
              rows += `      <tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>${label}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${value}</td></tr>\n`;
            }
          }
        }
      } else if (specs && typeof specs === 'object') {
        for (const [key, val] of Object.entries(specs)) {
          rows += `      <tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>${key}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${val}</td></tr>\n`;
        }
      }

      if (rows) {
        html += `  <div style="margin: 15px 0;">\n`;
        if (s.title) {
          html += `    <h3 style="color: #0066c0; border-bottom: 2px solid #0066c0; padding-bottom: 5px; margin-bottom: 10px;">${s.title}</h3>\n`;
        }
        html += `    <table style="width: 100%; border-collapse: collapse;">\n`;
        html += rows;
        html += `    </table>\n  </div>\n`;
      }
    } else {
      const content = s.static_html || aiJson[s.key] || '';
      if (content) {
        const titleColor = s.type === 'returns' ? '#2e7d32' : '#333';
        const bgColor = s.type === 'returns' ? '#e8f5e9' : s.type === 'shipping' ? '#f5f5f5' : 'transparent';
        const padding = bgColor !== 'transparent' ? '15px' : '0px';
        const borderRadius = bgColor !== 'transparent' ? '5px' : '0px';

        html += `  <div style="background: ${bgColor}; padding: ${padding}; margin: 15px 0; border-radius: ${borderRadius};">\n`;
        if (s.title && s.type !== 'contact') {
          html += `    <h3 style="color: ${titleColor}; margin-top: 0; margin-bottom: 10px;">${s.title}</h3>\n`;
        }
        html += `    ${content}\n`;
        html += `  </div>\n`;
      }
    }
  }

  html += `</div>`;
  return html;
}

/**
 * Strips XSS vectors from HTML before it is stored or sent to eBay.
 * This is not a full DOM-based sanitizer, but eliminates the highest-risk
 * injection patterns: script/style tags, event-handler attributes, and
 * javascript: / data: URIs. Applied unconditionally regardless of exclusion rules.
 */
function stripXss(html: string): string {
  // 1. Remove script blocks and their content.
  let out = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 2. Remove style blocks.
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // 3. Remove dangerous tags entirely (iframe, object, embed, form, input, svg, meta, link, base).
  out = out.replace(/<\/?(?:iframe|object|embed|form|input|textarea|select|button|meta|link|base|svg|math)\b[^>]*>/gi, '');
  // 4. Remove event-handler attributes (on*="..." or on*='...' or on*=...).
  out = out.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 5. Remove javascript: and data: URIs from href/src/action attributes.
  out = out.replace(/(href|src|action|formaction)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '');
  out = out.replace(/(href|src|action|formaction)\s*=\s*(?:"data:[^"]*"|'data:[^']*'|data:[^\s>]+)/gi, '');
  return out;
}

/**
 * Sanitizes and cleans the HTML/plaintext output according to exclusion rules.
 */
export function sanitize(text: string, rules: ExclusionRules, outputFormat?: string): string {
  // Always strip XSS vectors first, regardless of other exclusion rules.
  let cleaned = stripXss(text);

  // 1. Strip images
  if (rules.strip_images) {
    cleaned = cleaned.replace(/<img[^>]*>/gi, '');
  }

  // 2. Strip URLs (configurable)
  if (rules.strip_urls) {
    cleaned = cleaned.replace(/https?:\/\/[^\s<"']+/gi, '');
  }

  // 3. Strip Prices
  if (rules.strip_prices) {
    cleaned = cleaned.replace(/[\$\£\€\¥]\s*\d+(?:\.\d{2})?/g, '');
  }

  // 4. Strip Product IDs (ASINs, UPCs, EANs, ISBNs) and stray numeric values
  if (rules.strip_product_ids) {
    // ASIN (B0 followed by 8 alphanumeric characters)
    cleaned = cleaned.replace(/\bB0[A-Z0-9]{8}\b/gi, '');
    // UPC/EAN/ISBN: 10 to 13 digits
    cleaned = cleaned.replace(/\b\d{10,13}\b/g, '');
  }

  // 5. Strip supplier names
  if (rules.strip_supplier_names && Array.isArray(rules.supplier_names)) {
    for (const supplier of rules.supplier_names) {
      if (!supplier) continue;
      const escaped = supplier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }
  }

  // 6. Blocked terms
  if (Array.isArray(rules.blocked_terms)) {
    for (const term of rules.blocked_terms) {
      if (!term) continue;
      const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }
  }

  // 7. Banned claim phrases
  if (Array.isArray(rules.banned_claim_phrases)) {
    for (const claim of rules.banned_claim_phrases) {
      if (!claim) continue;
      const escaped = claim.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      cleaned = cleaned.replace(regex, '');
    }
  }

  // 8. VeRO Brands (flag/strip)
  if (Array.isArray(rules.vero_brands)) {
    for (const brand of rules.vero_brands) {
      if (!brand) continue;
      const escaped = brand.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }
  }

  // Clean up residual spaces/formatting glitches from replacements
  if (outputFormat === 'plaintext') {
    cleaned = cleaned.replace(/[ \t]+/g, ' ').trim(); // Preserve newlines
  } else {
    cleaned = cleaned.replace(/\s+/g, ' ');
    // Restore basic linebreaks if it was formatted, or make sure tags are preserved
    cleaned = cleaned.replace(/>\s+</g, '><').trim();
  }

  return cleaned;
}
