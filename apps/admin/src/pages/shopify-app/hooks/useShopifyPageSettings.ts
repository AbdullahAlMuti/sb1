import { useState, useCallback } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';
import type { ShopifyPageSetting } from '@repo/types';

const TABLE = 'shopify_page_settings' as const;

export function useShopifyPageSettings() {
  const [pages, setPages]       = useState<ShopifyPageSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPages((data as ShopifyPageSetting[]) || []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load page settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePage = useCallback(async (
    pageKey: string,
    updates: Partial<Omit<ShopifyPageSetting, 'id' | 'page_key' | 'updated_at'>>,
    userId: string,
  ) => {
    try {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update({ ...updates, updated_by: userId })
        .eq('page_key', pageKey)
        .select('*')
        .single();

      if (error) throw error;
      setPages(prev => prev.map(p => p.page_key === pageKey ? data as ShopifyPageSetting : p));
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update page setting');
    }
  }, []);

  const toggleVisibility = useCallback(async (
    pageKey: string,
    currentVisible: boolean,
    userId: string,
  ) => {
    await updatePage(pageKey, { is_visible: !currentVisible }, userId);
    toast.success(currentVisible ? 'Page hidden from sidebar.' : 'Page shown in sidebar.');
  }, [updatePage]);

  const updateStatus = useCallback(async (
    pageKey: string,
    status: ShopifyPageSetting['status'],
    userId: string,
  ) => {
    await updatePage(pageKey, { status }, userId);
    toast.success('Page status updated.');
  }, [updatePage]);

  const updateSortOrder = useCallback(async (
    orderedKeys: string[],
    userId: string,
  ) => {
    try {
      const updates = orderedKeys.map((key, idx) =>
        (supabase as any).from(TABLE).update({ sort_order: idx, updated_by: userId }).eq('page_key', key)
      );
      await Promise.all(updates);
      setPages(prev => {
        const map = new Map(prev.map(p => [p.page_key, p]));
        return orderedKeys.map((key, idx) => ({ ...map.get(key)!, sort_order: idx }));
      });
      toast.success('Page order saved.');
    } catch {
      toast.error('Failed to save page order');
    }
  }, []);

  return {
    pages,
    isLoading,
    fetchPages,
    updatePage,
    toggleVisibility,
    updateStatus,
    updateSortOrder,
  };
}
