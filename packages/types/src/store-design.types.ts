// ──────────────────────────────────────────────────────────────────────────────
// Store Design — Shared TypeScript Types
// Used by both apps/admin and apps/web
// ──────────────────────────────────────────────────────────────────────────────

// ── Status ───────────────────────────────────────────────────────────────────

export type StoreDesignStatus = 'draft' | 'published' | 'hidden' | 'archived';

// ── Access Level (DB plan names) ──────────────────────────────────────────────
// UI labels → DB values mapping:
//   "Free"    → 'free'
//   "Starter" → 'starter'
//   "Pro"     → 'growth'      ← mapped in useStoreDesignAccess
//   "Agency"  → 'agency' | 'enterprise'
//   "Custom"  → 'custom'

export type StoreDesignAccessLevel =
  | 'free'
  | 'starter'
  | 'growth'
  | 'agency'
  | 'enterprise'
  | 'custom';

// UI display label for each access level
export const ACCESS_LEVEL_LABELS: Record<StoreDesignAccessLevel, string> = {
  free:       'Free',
  starter:    'Starter',
  growth:     'Pro',        // UI says "Pro" but maps to "growth" in DB
  agency:     'Agency',
  enterprise: 'Agency',     // enterprise also shown as "Agency" in UI
  custom:     'Custom',
};

// Plan hierarchy (higher = more access)
export const PLAN_HIERARCHY: Record<string, number> = {
  free:       0,
  trial:      0,
  starter:    1,
  growth:     2,
  pro:        2,   // alias for growth in UI contexts
  agency:     3,
  enterprise: 3,   // same tier as agency
  custom:     4,
};

// ── Core StoreDesign type ─────────────────────────────────────────────────────

export interface StoreDesign {
  id:                string;
  title:             string;
  slug:              string;
  description:       string | null;
  short_description: string | null;
  category:          string | null;
  niche:             string | null;
  tags:              string[];
  preview_image:     string | null;
  thumbnail_image:   string | null;
  gallery_images:    string[];
  demo_url:          string | null;
  /** Protected — only returned by Edge Function with valid plan check */
  template_url?:     string | null;
  price:             number;
  compare_at_price:  number | null;
  currency:          string;
  is_free:           boolean;
  access_level:      StoreDesignAccessLevel;
  allowed_plans:     string[];
  upgrade_message:   string | null;
  is_premium:        boolean;
  is_featured:       boolean;
  is_trending:       boolean;
  is_published:      boolean;
  is_visible:        boolean;
  status:            StoreDesignStatus;
  sort_order:        number;
  seo_title:         string | null;
  seo_description:   string | null;
  /** JSON metadata: conversions, revenue, trend, themeName, etc. */
  metadata:          StoreDesignMetadata;
  created_at:        string;
  updated_at:        string;
  created_by:        string | null;
  updated_by:        string | null;
}

// ── Metadata shape (from the metadata JSONB column) ───────────────────────────

export interface StoreDesignMetadata {
  conversions?: number;
  trend?:       string;
  revenue?:     string;
  themeName?:   string;
  heroText?:    string;
  [key: string]: unknown;
}

// ── User-facing (safe) variant — never includes template_url ─────────────────

export type PublicStoreDesign = Omit<StoreDesign, 'template_url'> & {
  /** Derived at query time: is the current user's plan sufficient? */
  is_accessible?: boolean;
};

// ── Admin form / mutation input ───────────────────────────────────────────────

export interface StoreDesignFormValues {
  // Basic Info
  title:             string;
  slug:              string;
  short_description: string;
  description:       string;
  category:          string;
  niche:             string;
  tags:              string[];

  // Media
  preview_image:     string;
  thumbnail_image:   string;
  gallery_images:    string[];
  demo_url:          string;
  template_url:      string;

  // Pricing
  price:             number;
  compare_at_price:  number | null;
  currency:          string;
  is_free:           boolean;

  // Access
  access_level:      StoreDesignAccessLevel;
  allowed_plans:     string[];
  upgrade_message:   string;

  // Status & Flags
  status:            StoreDesignStatus;
  is_visible:        boolean;
  is_featured:       boolean;
  is_premium:        boolean;
  is_trending:       boolean;
  sort_order:        number;

  // SEO
  seo_title:         string;
  seo_description:   string;
}

// ── Filter / query params ─────────────────────────────────────────────────────

export interface StoreDesignFilters {
  search?:       string;
  status?:       StoreDesignStatus | 'all';
  category?:     string;
  niche?:        string;
  access_level?: StoreDesignAccessLevel | 'all';
  is_free?:      boolean | null;
  is_featured?:  boolean | null;
  is_trending?:  boolean | null;
}

export type StoreDesignSortBy =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'sort_order'
  | 'featured'
  | 'trending';

// ── Event tracking ────────────────────────────────────────────────────────────

export type StoreDesignEventType = 'view' | 'save' | 'click' | 'download';

export interface StoreDesignEvent {
  id:         string;
  design_id:  string;
  user_id:    string | null;
  event_type: StoreDesignEventType;
  metadata:   Record<string, unknown>;
  created_at: string;
}

// ── Shopify Page Settings ─────────────────────────────────────────────────────

export type ShopifyPageType   = 'Core' | 'Feature' | 'Custom';
export type ShopifyPageStatus = 'Active' | 'Disabled' | 'Coming Soon' | 'Maintenance';

export interface ShopifyPageSetting {
  id:               string;
  page_key:         string;
  name:             string;
  route:            string;
  page_type:        ShopifyPageType;
  status:           ShopifyPageStatus;
  plan_access:      string;
  usage_limit:      string;
  is_visible:       boolean;
  content_editable: boolean;
  sort_order:       number;
  icon_name:        string | null;
  updated_at:       string;
  updated_by:       string | null;
}

// ── Cursor pagination ─────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data:        T[];
  hasMore:     boolean;
  nextCursor:  string | null;  // ISO timestamp of last item's created_at
  totalCount?: number;         // Only returned on first page for admin table
}
