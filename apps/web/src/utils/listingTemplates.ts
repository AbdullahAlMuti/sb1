export interface ListingTemplate {
  id: string;
  name: string;
  description: string;
  htmlContent: string;
  isDefault: boolean;
  status: 'Available' | 'Locked' | 'Coming Soon';
}

export const LISTING_TEMPLATES: ListingTemplate[] = [
  {
    id: 'default-professional',
    name: 'Default Professional Template',
    description: 'A clean and professional eBay description layout suitable for most products.',
    isDefault: true,
    status: 'Available',
    htmlContent: `<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <header style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #1e3a8a; font-size: 24px; margin: 0; font-weight: 700; line-height: 1.3;">{title}</h1>
  </header>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Product Description</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {description}
    </div>
  </section>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Key Features</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {features}
    </div>
  </section>

  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Specifications</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {specifications}
    </div>
  </section>
  
  <footer style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>📦</span> Shipping & Handling
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Fast and free shipping on all orders. We package professionally and ship within 1 business day.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>🔄</span> 30-Day Returns Policy
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Shop with confidence. If you're not completely satisfied, return the item within 30 days for a full refund.</p>
    </div>
  </footer>
</div>`
  }
];

const STORAGE_KEY = 'selected_listing_template_id';

/**
 * Returns the list of available templates
 */
export function getListingTemplates(): ListingTemplate[] {
  return LISTING_TEMPLATES;
}

/**
 * Gets the selected listing template ID from local storage
 */
export function getSelectedListingTemplateId(): string {
  const id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    // Return default template's ID
    const def = LISTING_TEMPLATES.find(t => t.isDefault);
    return def ? def.id : 'default-professional';
  }
  return id;
}

/**
 * Gets the active selected template object
 */
export function getSelectedListingTemplate(): ListingTemplate {
  const selectedId = getSelectedListingTemplateId();
  const template = LISTING_TEMPLATES.find(t => t.id === selectedId);
  return template || LISTING_TEMPLATES[0];
}

/**
 * Selects/activates a listing template, saves to localStorage,
 * and broadcasts synchronization events
 */
export function selectListingTemplate(templateId: string): void {
  localStorage.setItem(STORAGE_KEY, templateId);
  
  // Sync to chrome extension
  if (typeof window !== 'undefined') {
    window.postMessage({ type: 'SYNC_LISTING_TEMPLATE', templateId }, '*');
  }
}
