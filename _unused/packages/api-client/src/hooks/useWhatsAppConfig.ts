import { useQuery } from "@tanstack/react-query";
import { supabase } from "@repo/api-client/supabase/client";

export type WhatsAppModule = "dashboard";

export type WhatsAppConfig = {
  support_whatsapp_number: string | null;
  sales_whatsapp_number: string | null;
  order_whatsapp_number: string | null;
  admin_whatsapp_number: string | null;
  whatsapp_dashboard_enabled: boolean;
  whatsapp_dashboard_template: string | null;
};

const DEFAULT_CONFIG: WhatsAppConfig = {
  support_whatsapp_number: null,
  sales_whatsapp_number: null,
  order_whatsapp_number: null,
  admin_whatsapp_number: null,
  whatsapp_dashboard_enabled: false,
  whatsapp_dashboard_template: "Hi, I need help.",
};

export function useWhatsAppConfig() {
  return useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async (): Promise<WhatsAppConfig> => {
      const { data, error } = await supabase.functions.invoke("whatsapp-config");
      if (error) {
        // Keep UX stable even if the backend function is temporarily unavailable.
        console.error("WhatsApp config load failed:", error);
        return { ...DEFAULT_CONFIG };
      }
      return { ...DEFAULT_CONFIG, ...(data || {}) };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });
}
