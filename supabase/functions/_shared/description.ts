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
  let html = `<div>\n`;

  for (const s of sortedSections) {
    if (!s.enabled) continue;

    if (s.type === 'opening') {
      if (s.key === 'title') {
        const titleText = productData.title || 'Premium Product';
        html += `  <h2>${titleText}</h2>\n`;
      } else {
        const content = aiJson[s.key] || '';
        if (content) {
          html += `  <div>\n    <p>${content}</p>\n  </div>\n`;
        }
      }
    } else if (s.type === 'features') {
      const bullets = aiJson[s.key];
      if (Array.isArray(bullets) && bullets.length > 0) {
        html += `  <div>\n`;
        if (s.title) {
          html += `    <h3>${s.title}</h3>\n`;
        }
        html += `    <ul>\n`;
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
              rows += `      <tr><td><strong>${label}</strong></td><td>${value}</td></tr>\n`;
            }
          }
        }
      } else if (specs && typeof specs === 'object') {
        for (const [key, val] of Object.entries(specs)) {
          rows += `      <tr><td><strong>${key}</strong></td><td>${val}</td></tr>\n`;
        }
      }

      if (rows) {
        html += `  <div>\n`;
        if (s.title) {
          html += `    <h3>${s.title}</h3>\n`;
        }
        html += `    <table>\n`;
        html += rows;
        html += `    </table>\n  </div>\n`;
      }
    } else {
      const content = s.static_html || aiJson[s.key] || '';
      if (content) {
        html += `  <div>\n`;
        if (s.title && s.type !== 'contact') {
          html += `    <h3>${s.title}</h3>\n`;
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
 * Sanitizes and cleans the HTML/plaintext output according to exclusion rules.
 */
export function sanitize(text: string, rules: ExclusionRules): string {
  let cleaned = text;

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
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Restore basic linebreaks if it was formatted, or make sure tags are preserved
  cleaned = cleaned.replace(/>\s+</g, '><').trim();
 
  // 9. Strip all style attributes to enforce "no css"
  cleaned = cleaned.replace(/\s*style="[^"]*"/gi, '');

  return cleaned;
}

/**
 * Ensures that the plain text content of the final description is at least 500 characters.
 * If it is shorter, it appends high-quality, professional eBay store policy and service details.
 */
export function ensureMinimumLength(description: string, _outputFormat: 'html_ebay_safe' | 'plaintext'): string {
  // Intentionally a no-op. This used to pad every description to 650 words
  // with stock paragraphs about "temperature-controlled storage facilities",
  // "replies within 24 hours", "eco-friendly packaging" and requests for
  // five-star feedback — statements about the seller that the product data
  // cannot support and that may be untrue for the seller using this tool.
  // A description is as long as the facts allow; it is never padded.
  return typeof description === 'string' ? description.trim() : '';
}
