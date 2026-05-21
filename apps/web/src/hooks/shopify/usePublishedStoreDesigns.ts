import { useState, useCallback } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import type { PublicStoreDesign, StoreDesignFilters, StoreDesignSortBy, PaginatedResult } from '@repo/types';

const PAGE_SIZE = 12;

// IMPORTANT: Never select template_url in user-facing queries
const USER_SELECT_FIELDS = `
  id, title, slug, short_description, category, niche, tags,
  preview_image, thumbnail_image, gallery_images,
  demo_url,
  price, compare_at_price, currency, is_free,
  access_level, allowed_plans, upgrade_message,
  is_premium, is_featured, is_trending,
  is_published, is_visible, status,
  sort_order, metadata,
  created_at, updated_at
`;

export function usePublishedStoreDesigns() {
  const [designs, setDesigns] = useState<PublicStoreDesign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<any>(null);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [niches, setNiches] = useState<string[]>([]);

  // Fetch unique categories and niches for filters
  const fetchFilterOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_designs')
        .select('category, niche')
        .eq('is_published', true)
        .eq('is_visible', true);
        
      if (error) throw error;
      
      const uniqueCats = Array.from(new Set(data.map(d => d.category).filter(Boolean))) as string[];
      const uniqueNiches = Array.from(new Set(data.map(d => d.niche).filter(Boolean))) as string[];
      
      setCategories(uniqueCats.sort());
      setNiches(uniqueNiches.sort());
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  }, []);

  const buildQuery = (filters: StoreDesignFilters, sortBy: StoreDesignSortBy) => {
    let query = supabase
      .from('store_designs')
      .select(USER_SELECT_FIELDS)
      .eq('is_published', true)
      .eq('is_visible', true);

    if (filters.search) {
      // Basic ilike search on title, niche, tags (using OR)
      query = query.or(`title.ilike.%${filters.search}%,niche.ilike.%${filters.search}%`);
    }
    
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    
    if (filters.is_free === true) {
      query = query.eq('is_free', true);
    }
    
    if (filters.is_featured === true) {
      query = query.eq('is_featured', true);
    }
    
    if (filters.is_trending === true) {
      query = query.eq('is_trending', true);
    }
    
    // Sort logic
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'featured':
        query = query.order('is_featured', { ascending: false }).order('sort_order', { ascending: true });
        break;
      case 'trending':
        query = query.order('is_trending', { ascending: false }).order('sort_order', { ascending: true });
        break;
      case 'sort_order':
      default:
        query = query.order('sort_order', { ascending: true });
        break;
    }
    
    // Tiebreaker for consistent pagination
    if (sortBy !== 'newest') {
      query = query.order('created_at', { ascending: false });
    }

    return query;
  };

  const fetchDesigns = useCallback(async (
    filters: StoreDesignFilters,
    sortBy: StoreDesignSortBy = 'sort_order',
    reset: boolean = false
  ) => {
    setIsLoading(true);
    try {
      let query = buildQuery(filters, sortBy);
      query = query.limit(PAGE_SIZE);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (reset) {
        setDesigns(data as PublicStoreDesign[]);
      } else {
        setDesigns(prev => {
          // simple deduplication just in case
          const existingIds = new Set(prev.map(d => d.id));
          const newUnique = data.filter(d => !existingIds.has(d.id));
          return [...prev, ...(newUnique as PublicStoreDesign[])];
        });
      }
      
      setHasMore(data.length === PAGE_SIZE);
      
      if (data.length > 0) {
        const lastItem = data[data.length - 1];
        setNextCursor({
          sort_order: lastItem.sort_order,
          created_at: lastItem.created_at,
          price: lastItem.price
        });
      } else {
        setNextCursor(null);
      }
      
    } catch (err) {
      console.error('Error fetching designs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (filters: StoreDesignFilters, sortBy: StoreDesignSortBy = 'sort_order') => {
    if (!hasMore || isLoading || !nextCursor) return;
    
    setIsLoading(true);
    try {
      let query = buildQuery(filters, sortBy);
      
      // Cursor logic
      switch (sortBy) {
        case 'newest':
          query = query.lt('created_at', nextCursor.created_at);
          break;
        case 'price_desc':
          query = query.lt('price', nextCursor.price);
          break;
        case 'price_asc':
          query = query.gt('price', nextCursor.price);
          break;
        case 'sort_order':
        default:
          // For simplicity in pagination with multiple orders, we often just use offset instead if cursor is too complex with tie-breakers, 
          // but we can try basic cursor on sort_order
          query = query.gt('sort_order', nextCursor.sort_order);
          break;
      }
      
      query = query.limit(PAGE_SIZE);
      const { data, error } = await query;
      
      if (error) throw error;
      
      setDesigns(prev => {
        const existingIds = new Set(prev.map(d => d.id));
        const newUnique = data.filter(d => !existingIds.has(d.id));
        return [...prev, ...(newUnique as PublicStoreDesign[])];
      });
      
      setHasMore(data.length === PAGE_SIZE);
      if (data.length > 0) {
        const lastItem = data[data.length - 1];
        setNextCursor({
          sort_order: lastItem.sort_order,
          created_at: lastItem.created_at,
          price: lastItem.price
        });
      }
      
    } catch (err) {
      console.error('Error loading more designs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, nextCursor]);

  return {
    designs,
    isLoading,
    hasMore,
    nextCursor,
    categories,
    niches,
    fetchFilterOptions,
    fetchDesigns,
    loadMore
  };
}
