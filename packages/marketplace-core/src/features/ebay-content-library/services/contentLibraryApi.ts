import { supabase } from '@repo/api-client/supabase/client';
import { MustSellItem, ProfitableProduct } from '../types/content-library.types';

// ==========================================
// Must Sell Items API
// ==========================================

export async function fetchMustSellItems(mode: 'admin' | 'user', searchQuery?: string, country?: string): Promise<MustSellItem[]> {
  let query = (supabase.from('must_sell_items' as any) as any).select('*');
  
  if (mode === 'admin') {
    query = query.order('position', { ascending: true });
  } else {
    query = query.eq('is_active', true).order('sales_count', { ascending: false });
  }

  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`);
  }
  
  if (country && country !== 'all') {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as MustSellItem[];
}

export async function createMustSellItem(data: Partial<MustSellItem>): Promise<void> {
  const { data: maxData } = await (supabase.from('must_sell_items' as any) as any)
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  const maxPosition = maxData?.[0]?.position ?? 0;

  const { error } = await (supabase.from('must_sell_items' as any) as any).insert({
    ...data,
    position: maxPosition + 1,
  });
  if (error) throw error;
}

export async function updateMustSellItem(id: string, data: Partial<MustSellItem>): Promise<void> {
  const { error } = await (supabase.from('must_sell_items' as any) as any).update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteMustSellItem(id: string): Promise<void> {
  const { error } = await (supabase.from('must_sell_items' as any) as any).delete().eq('id', id);
  if (error) throw error;
}

export async function reorderMustSellItems(reorderedItems: { id: string; position: number }[]): Promise<void> {
  const promises = reorderedItems.map(({ id, position }) =>
    (supabase.from('must_sell_items' as any) as any).update({ position }).eq('id', id)
  );
  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;
  if (error) throw error;
}

// ==========================================
// Profitable Products API
// ==========================================

export async function fetchProfitableProducts(mode: 'admin' | 'user', searchQuery?: string, country?: string): Promise<ProfitableProduct[]> {
  // We limit to 200 for user mode if needed, but keeping it standard for both
  let query = (supabase.from('profitable_products' as any) as any).select('*');
  
  if (mode === 'admin') {
    query = query.order('position', { ascending: true });
  } else {
    query = query.eq('is_active', true).order('position', { ascending: true }).limit(200);
  }

  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`);
  }
  
  if (country && country !== 'all') {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ProfitableProduct[];
}

export async function createProfitableProduct(data: Partial<ProfitableProduct>): Promise<void> {
  const { data: maxData } = await (supabase.from('profitable_products' as any) as any)
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  const maxPosition = maxData?.[0]?.position ?? 0;

  const { error } = await (supabase.from('profitable_products' as any) as any).insert({
    ...data,
    position: maxPosition + 1,
  });
  if (error) throw error;
}

export async function updateProfitableProduct(id: string, data: Partial<ProfitableProduct>): Promise<void> {
  const { error } = await (supabase.from('profitable_products' as any) as any).update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteProfitableProduct(id: string): Promise<void> {
  const { error } = await (supabase.from('profitable_products' as any) as any).delete().eq('id', id);
  if (error) throw error;
}

export async function reorderProfitableProducts(reorderedItems: { id: string; position: number }[]): Promise<void> {
  const promises = reorderedItems.map(({ id, position }) =>
    (supabase.from('profitable_products' as any) as any).update({ position }).eq('id', id)
  );
  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;
  if (error) throw error;
}
