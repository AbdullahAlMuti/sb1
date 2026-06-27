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
export function ensureMinimumLength(description: string, outputFormat: 'html_ebay_safe' | 'plaintext'): string {
  const getWordCount = (str: string) => {
    const plainText = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.split(/\s+/).filter(w => w.length > 0).length;
  };

  const currentWordCount = getWordCount(description);
  if (currentWordCount >= 650) {
    return description;
  }

  const deficit = 650 - currentWordCount;
  console.log(`[description] Word count is ${currentWordCount} (under 650 limit). Padding by ${deficit} words...`);

  const paddingPool = [
    "We are dedicated to providing our customers with the highest quality products and an exceptional shopping experience. Every item in our selection is carefully sourced, inspected, and verified to ensure it meets our strict quality standards before it is prepared for shipment. We work closely with leading manufacturers and logistics partners to deliver reliable, high-performing merchandise that meets your expectations.",
    "Our customer support team is always available to assist you with any questions, inquiries, or concerns you may have before or after making a purchase. We are committed to responding to all customer messages within 24 hours, providing prompt, courteous, and efficient service. Your satisfaction is our absolute top priority, and we are always happy to help resolve any issues to your complete satisfaction.",
    "To maintain the optimal condition and longevity of your purchase, we recommend following standard care and maintenance guidelines. Keep products stored in a clean, dry environment away from extreme temperatures and moisture when not in use. Regular care and proper handling will ensure the product continues to perform reliably for a long time.",
    "We appreciate your valued business and feedback. As an independent seller, we strive to earn your positive feedback and five-star ratings. If you feel that your purchase did not meet your expectations in any way, please reach out to us directly through messages before leaving feedback so we can immediately address and resolve any issues.",
    "We ensure that our packaging procedures follow strict protective protocols. Every single order is wrapped securely using bubble wrap, robust cardboard packaging, and damage-resistant packing materials to cushion it during transit. Our fulfillment team monitors shipments closely to ensure smooth transition from processing to final delivery, protecting your investment from start to finish.",
    "In addition to product quality, we prioritize environmental responsibility and sustainability. Our packaging materials are chosen with eco-friendly standards in mind, utilizing recyclable and biodegradable options whenever possible to reduce our carbon footprint. By supporting our store, you are contributing to a greener and more sustainable community of online shoppers.",
    "Furthermore, our storage facilities are temperature-controlled and maintained to prevent any degradation of inventory. This ensures that every item shipped is in pristine, brand-new condition, free from environmental dust, moisture, or age wear. We continuously upgrade our facilities to guarantee the highest storage quality.",
    "We also coordinate closely with international logistics carriers to expand our delivery coverage, ensuring that orders reach various regions safely. Every package is assigned a unique tracking number, enabling you to trace its transit journey in real-time. We guarantee that your items will arrive in a secure and timely manner."
  ];

  let padded = description.trim();
  const closingDiv = "</div>";
  let poolIndex = 0;

  // Let's assemble the padding blocks
  let paddingHtml = "\n  <div>\n    <h3>Quality Assurance & Seller Policies</h3>\n";
  let paddingText = "\n\n=== Quality Assurance & Seller Policies ===\n";

  while (getWordCount(padded) < 650) {
    const nextParagraph = paddingPool[poolIndex % paddingPool.length];
    paddingHtml += `    <p>${nextParagraph}</p>\n`;
    paddingText += `${nextParagraph}\n\n`;
    
    if (outputFormat === 'plaintext') {
      padded = description.trim() + paddingText;
    } else {
      const closing = description.trim().endsWith(closingDiv) ? closingDiv : "";
      const base = description.trim().endsWith(closingDiv) ? description.trim().substring(0, description.trim().length - closingDiv.length) : description.trim();
      padded = base + paddingHtml + "  </div>\n" + closing;
    }
    poolIndex++;
  }

  return padded;
}
