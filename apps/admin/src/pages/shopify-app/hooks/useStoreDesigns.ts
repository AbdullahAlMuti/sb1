import { useState, useCallback } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';
import type {
  StoreDesign,
  StoreDesignFormValues,
  StoreDesignFilters,
  StoreDesignSortBy,
  PaginatedResult,
} from '@repo/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABLE = 'store_designs' as const;
const AUDIT_TABLE = 'audit_logs' as const;
const BUCKET = 'store-design-images' as const;
const PAGE_SIZE = 20;

// All fields except template_url for regular admin listing
const ADMIN_SELECT_FIELDS = `
  id, title, slug, short_description, description,
  category, niche, tags,
  preview_image, thumbnail_image, gallery_images,
  demo_url, template_url,
  price, compare_at_price, currency, is_free,
  access_level, allowed_plans, upgrade_message,
  is_premium, is_featured, is_trending,
  is_published, is_visible, status,
  sort_order, seo_title, seo_description,
  metadata, created_at, updated_at, created_by, updated_by
`.trim();

// ── Audit log helper ──────────────────────────────────────────────────────────

async function writeAuditLog(
  userId: string,
  action: string,
  entityId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
) {
  try {
    await (supabase as any).from(AUDIT_TABLE).insert({
      user_id:     userId,
      action,
      entity_type: 'store_design',
      entity_id:   entityId,
      old_values:  oldValues ?? null,
      new_values:  newValues ?? null,
      metadata:    metadata ?? null,
    });
  } catch {
    // Audit failures should not break the main action
    console.warn('[audit] Failed to write audit log:', action, entityId);
  }
}

// ── Slug generator ────────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStoreDesigns() {
  const [designs, setDesigns]       = useState<StoreDesign[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore]       = useState(false);

  // ── Fetch (admin: all statuses, with cursor pagination) ───────────────────

  const fetchDesigns = useCallback(async (
    filters: StoreDesignFilters = {},
    sortBy: StoreDesignSortBy = 'sort_order',
    cursor: string | null = null,
    reset = true,
  ): Promise<PaginatedResult<StoreDesign>> => {
    setIsLoading(true);
    try {
      let query = (supabase as any)
        .from(TABLE)
        .select(ADMIN_SELECT_FIELDS, { count: 'exact' });

      // ── Filters ────────────────────────────────────────────────────────────
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,` +
          `short_description.ilike.%${filters.search}%,` +
          `niche.ilike.%${filters.search}%,` +
          `category.ilike.%${filters.search}%`
        );
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.niche) {
        query = query.eq('niche', filters.niche);
      }
      if (filters.access_level && filters.access_level !== 'all') {
        query = query.eq('access_level', filters.access_level);
      }
      if (filters.is_free !== undefined && filters.is_free !== null) {
        query = query.eq('is_free', filters.is_free);
      }
      if (filters.is_featured) {
        query = query.eq('is_featured', true);
      }
      if (filters.is_trending) {
        query = query.eq('is_trending', true);
      }

      // ── Cursor ────────────────────────────────────────────────────────────
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      // ── Sort ──────────────────────────────────────────────────────────────
      switch (sortBy) {
        case 'newest':     query = query.order('created_at', { ascending: false }); break;
        case 'oldest':     query = query.order('created_at', { ascending: true  }); break;
        case 'price_asc':  query = query.order('price',      { ascending: true  }); break;
        case 'price_desc': query = query.order('price',      { ascending: false }); break;
        case 'featured':   query = query.order('is_featured', { ascending: false }).order('sort_order', { ascending: true }); break;
        case 'trending':   query = query.order('is_trending', { ascending: false }).order('sort_order', { ascending: true }); break;
        default:           query = query.order('sort_order',  { ascending: true  }); break;
      }

      const { data, error, count } = await query.limit(PAGE_SIZE);
      if (error) throw error;

      const rows = (data as StoreDesign[]) || [];
      const more = rows.length === PAGE_SIZE;
      const nc   = more && rows.length > 0 ? rows[rows.length - 1].created_at : null;

      if (reset) {
        setDesigns(rows);
        setTotalCount(count ?? 0);
      } else {
        setDesigns(prev => [...prev, ...rows]);
      }
      setNextCursor(nc);
      setHasMore(more);

      return { data: rows, hasMore: more, nextCursor: nc, totalCount: count ?? 0 };
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load store designs');
      return { data: [], hasMore: false, nextCursor: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (
    filters: StoreDesignFilters = {},
    sortBy: StoreDesignSortBy = 'sort_order',
  ) => {
    if (!hasMore || !nextCursor) return;
    await fetchDesigns(filters, sortBy, nextCursor, false);
  }, [hasMore, nextCursor, fetchDesigns]);

  // ── Create ────────────────────────────────────────────────────────────────

  const createDesign = useCallback(async (
    values: StoreDesignFormValues,
    userId: string,
  ): Promise<StoreDesign | null> => {
    setIsSaving(true);
    try {
      const payload = {
        ...values,
        is_published: values.status === 'published',
        created_by:   userId,
        updated_by:   userId,
      };

      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert(payload)
        .select(ADMIN_SELECT_FIELDS)
        .single();

      if (error) throw error;
      const design = data as StoreDesign;

      setDesigns(prev => [design, ...prev]);
      setTotalCount(prev => prev + 1);

      await writeAuditLog(userId, 'STORE_DESIGN_CREATED', design.id,
        undefined,
        { title: design.title, status: design.status, access_level: design.access_level },
      );

      toast.success(`"${design.title}" created successfully.`);
      return design;
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create store design');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ── Update ────────────────────────────────────────────────────────────────

  const updateDesign = useCallback(async (
    id: string,
    values: Partial<StoreDesignFormValues>,
    userId: string,
    oldDesign?: StoreDesign,
  ): Promise<StoreDesign | null> => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };
      if (values.status !== undefined) {
        payload.is_published = values.status === 'published';
      }

      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select(ADMIN_SELECT_FIELDS)
        .single();

      if (error) throw error;
      const design = data as StoreDesign;

      setDesigns(prev => prev.map(d => d.id === id ? design : d));

      // Detect price/access changes for specialised audit actions
      const actions: string[] = ['STORE_DESIGN_UPDATED'];
      if (oldDesign && values.price !== undefined && oldDesign.price !== values.price) actions.push('STORE_DESIGN_PRICE_CHANGED');
      if (oldDesign && values.access_level && oldDesign.access_level !== values.access_level) actions.push('STORE_DESIGN_ACCESS_CHANGED');
      if (oldDesign && values.preview_image && oldDesign.preview_image !== values.preview_image) actions.push('STORE_DESIGN_IMAGE_CHANGED');

      for (const action of actions) {
        await writeAuditLog(
          userId, action, id,
          oldDesign ? { title: oldDesign.title, status: oldDesign.status, price: oldDesign.price, access_level: oldDesign.access_level } : undefined,
          { title: design.title, status: design.status, price: design.price, access_level: design.access_level },
        );
      }

      toast.success(`"${design.title}" updated successfully.`);
      return design;
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update store design');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ── Publish / Unpublish ───────────────────────────────────────────────────

  const publishDesign = useCallback(async (id: string, userId: string, oldDesign?: StoreDesign) => {
    const result = await updateDesign(id, { status: 'published' }, userId, oldDesign);
    if (result) {
      await writeAuditLog(userId, 'STORE_DESIGN_PUBLISHED', id,
        { status: oldDesign?.status }, { status: 'published' });
    }
    return result;
  }, [updateDesign]);

  const unpublishDesign = useCallback(async (id: string, userId: string, oldDesign?: StoreDesign) => {
    const result = await updateDesign(id, { status: 'draft' }, userId, oldDesign);
    if (result) {
      await writeAuditLog(userId, 'STORE_DESIGN_UNPUBLISHED', id,
        { status: oldDesign?.status }, { status: 'draft' });
    }
    return result;
  }, [updateDesign]);

  // ── Toggle Visibility ─────────────────────────────────────────────────────

  const toggleVisibility = useCallback(async (
    id: string,
    currentVisible: boolean,
    userId: string,
  ) => {
    const newVisible = !currentVisible;

    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ is_visible: newVisible, updated_by: userId })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update visibility');
      return;
    }

    setDesigns(prev => prev.map(d => d.id === id ? { ...d, is_visible: newVisible } : d));
    await writeAuditLog(
      userId,
      newVisible ? 'STORE_DESIGN_SHOWN' : 'STORE_DESIGN_HIDDEN',
      id,
      { is_visible: currentVisible },
      { is_visible: newVisible },
    );
    toast.success(newVisible ? 'Design is now visible.' : 'Design is now hidden.');
  }, []);

  // ── Archive ───────────────────────────────────────────────────────────────

  const archiveDesign = useCallback(async (
    id: string,
    userId: string,
    oldDesign?: StoreDesign,
  ) => {
    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ status: 'archived', is_published: false, is_visible: false, updated_by: userId })
      .eq('id', id);

    if (error) { toast.error('Failed to archive design'); return; }

    setDesigns(prev => prev.map(d =>
      d.id === id ? { ...d, status: 'archived', is_published: false, is_visible: false } : d
    ));
    await writeAuditLog(userId, 'STORE_DESIGN_ARCHIVED', id,
      { status: oldDesign?.status },
      { status: 'archived' },
    );
    toast.success('Design archived.');
  }, []);

  // ── Duplicate ─────────────────────────────────────────────────────────────

  const duplicateDesign = useCallback(async (
    id: string,
    userId: string,
  ): Promise<StoreDesign | null> => {
    setIsSaving(true);
    try {
      // Fetch source design
      const { data: src, error: fetchErr } = await (supabase as any)
        .from(TABLE).select(ADMIN_SELECT_FIELDS).eq('id', id).single();
      if (fetchErr) throw fetchErr;

      const source = src as StoreDesign;
      const baseSlug = `${source.slug}-copy`;

      // Ensure unique slug
      let slug = baseSlug;
      let attempt = 1;
      while (true) {
        const { data: existing } = await (supabase as any)
          .from(TABLE).select('id').eq('slug', slug).maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${++attempt}`;
      }

      const { created_at: _ca, updated_at: _ua, id: _id, ...rest } = source;
      const payload = {
        ...rest,
        title:        `${source.title} (Copy)`,
        slug,
        status:       'draft',
        is_published: false,
        sort_order:   source.sort_order + 1,
        created_by:   userId,
        updated_by:   userId,
      };

      const { data, error } = await (supabase as any)
        .from(TABLE).insert(payload).select(ADMIN_SELECT_FIELDS).single();
      if (error) throw error;

      const copy = data as StoreDesign;
      setDesigns(prev => [copy, ...prev]);
      setTotalCount(prev => prev + 1);

      await writeAuditLog(userId, 'STORE_DESIGN_DUPLICATED', copy.id,
        undefined,
        { title: copy.title, source_id: id },
        { source_id: id },
      );

      toast.success(`"${copy.title}" duplicated as draft.`);
      return copy;
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to duplicate design');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteDesign = useCallback(async (
    id: string,
    userId: string,
    oldDesign?: StoreDesign,
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
      if (error) throw error;

      setDesigns(prev => prev.filter(d => d.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));

      await writeAuditLog(userId, 'STORE_DESIGN_DELETED', id,
        oldDesign ? { title: oldDesign.title, status: oldDesign.status } : undefined,
        undefined,
      );

      toast.success('Design deleted.');
      return true;
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete design');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ── Update Sort Order ─────────────────────────────────────────────────────

  const updateSortOrder = useCallback(async (
    orderedIds: string[],
    userId: string,
  ) => {
    try {
      const updates = orderedIds.map((id, idx) =>
        (supabase as any).from(TABLE).update({ sort_order: idx, updated_by: userId }).eq('id', id)
      );
      await Promise.all(updates);

      setDesigns(prev => {
        const map = new Map(prev.map(d => [d.id, d]));
        return orderedIds.map((id, idx) => ({ ...map.get(id)!, sort_order: idx }));
      });

      await writeAuditLog(userId, 'STORE_DESIGN_ORDER_CHANGED', 'batch',
        undefined,
        { ordered_ids: orderedIds },
      );

      toast.success('Sort order saved.');
    } catch {
      toast.error('Failed to update sort order');
    }
  }, []);

  // ── Image Upload ──────────────────────────────────────────────────────────

  const uploadImage = useCallback(async (
    file: File,
    path: string, // e.g. 'previews/design-slug.webp'
  ): Promise<string | null> => {
    // Client-side validation
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    const ALLOWED   = ['image/webp', 'image/png', 'image/jpeg'];

    if (file.size > MAX_BYTES) {
      toast.error('Image must be 5 MB or smaller.');
      return null;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error('Only WebP, PNG, and JPG images are allowed.');
      return null;
    }

    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      toast.error(err?.message ?? 'Image upload failed');
      return null;
    }
  }, []);

  // ── Toggle Flag (featured / trending / premium) ───────────────────────────

  const toggleFlag = useCallback(async (
    id: string,
    flag: 'is_featured' | 'is_trending' | 'is_premium',
    currentValue: boolean,
    userId: string,
  ) => {
    const newValue = !currentValue;
    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ [flag]: newValue, updated_by: userId })
      .eq('id', id);

    if (error) { toast.error('Failed to update flag'); return; }
    setDesigns(prev => prev.map(d => d.id === id ? { ...d, [flag]: newValue } : d));
  }, []);

  return {
    // State
    designs,
    isLoading,
    isSaving,
    totalCount,
    hasMore,
    nextCursor,
    // Actions
    fetchDesigns,
    loadMore,
    createDesign,
    updateDesign,
    publishDesign,
    unpublishDesign,
    toggleVisibility,
    archiveDesign,
    duplicateDesign,
    deleteDesign,
    updateSortOrder,
    uploadImage,
    toggleFlag,
    generateSlug,
  };
}
