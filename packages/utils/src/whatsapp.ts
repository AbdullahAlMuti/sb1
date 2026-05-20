type PlaceholderMap = Record<string, string | number | null | undefined>;

const PHONE_RE = /^\d{8,15}$/;

export function isValidWhatsAppPhoneNumber(phoneNumber: string): boolean {
  return PHONE_RE.test(phoneNumber);
}

function sanitizeMessage(input: string): string {
  // Strip control chars (including newlines) and trim.
  const cleaned = input.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  // Keep messages reasonable to avoid accidental URL bloat.
  return cleaned.slice(0, 1000);
}

/**
 * Replace supported placeholders in a template.
 * Supported: {order_id}, {customer_name}, {product_name}, {listing_id}
 */
export function applyWhatsAppTemplate(template: string, vars: PlaceholderMap = {}): string {
  const safeVars: Record<string, string> = {
    order_id: vars.order_id == null ? "" : String(vars.order_id),
    customer_name: vars.customer_name == null ? "" : String(vars.customer_name),
    product_name: vars.product_name == null ? "" : String(vars.product_name),
    listing_id: vars.listing_id == null ? "" : String(vars.listing_id),
  };

  return template.replace(/\{(order_id|customer_name|product_name|listing_id)\}/g, (_, key) => {
    return safeVars[key] ?? "";
  });
}

/**
 * Build the official WhatsApp Click-to-Chat URL:
 * https://wa.me/{phone_number}?text={url_encoded_message}
 */
export function buildWhatsAppLink(params: {
  phone_number: string;
  message?: string | null;
}): string | null {
  const phone = (params.phone_number || "").trim();
  if (!isValidWhatsAppPhoneNumber(phone)) return null;

  const base = `https://wa.me/${phone}`;
  const msg = params.message == null ? "" : sanitizeMessage(String(params.message));
  if (!msg) return base;

  return `${base}?text=${encodeURIComponent(msg)}`;
}
