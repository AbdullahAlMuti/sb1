import { useState, useEffect } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import type { ShopifyPageSetting } from '@repo/types';

export function useShopifyPageSettings() {
  const [settings, setSettings] = useState<ShopifyPageSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('shopify_page_settings')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (!error && data && mounted) {
          setSettings(data as ShopifyPageSetting[]);
        }
      } catch (err) {
        console.error('Error fetching page settings:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchSettings();

    // Setup realtime subscription
    const subscription = supabase
      .channel('shopify-page-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopify_page_settings' },
        () => {
          fetchSettings(); // Refetch on any change (update/insert/delete)
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  return { settings, isLoading };
}
