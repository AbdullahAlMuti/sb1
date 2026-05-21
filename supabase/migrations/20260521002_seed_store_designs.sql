-- ============================================================
-- Seed: 7 Existing Mock Store Designs → DB
-- Also seeds the 11 Shopify page settings (DB-backed sidebar config)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. SEED STORE DESIGNS
-- Source: apps/web/src/pages/integrations/shopify/shopify.mock.ts
-- All seeded as published + visible + free + draft status then published
-- Thumbnail paths preserved from mock; admin should upload real images
-- and update URLs via the admin panel.
-- ──────────────────────────────────────────────────────────

INSERT INTO public.store_designs (
  title, slug, short_description, description,
  category, niche, tags,
  preview_image, thumbnail_image, gallery_images,
  demo_url, template_url,
  price, compare_at_price, currency, is_free,
  access_level, allowed_plans,
  is_premium, is_featured, is_trending,
  is_published, is_visible,
  status, sort_order,
  metadata
)
VALUES

-- 1. Be Yours (Trending Hero Design)
(
  'Be Yours',
  'be-yours',
  'Be Your Own Kind of Beautiful.',
  'Clean, elegant, and conversion-optimized fashion store built for high AOV and repeat customers. Features sticky cart, trust badges, and urgency timers.',
  'Fashion', 'Fashion',
  ARRAY['fashion','custom-theme','high-aov','trending','hero'],
  '/mocks/designs/store_trending_beyours.png',
  '/mocks/designs/store_trending_beyours.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, TRUE, TRUE,
  TRUE, TRUE,
  'published', 0,
  '{"conversions": 96, "trend": "+18%", "revenue": "$214.8K", "themeName": "Custom", "heroText": "Be Your Own Kind of Beautiful."}'::jsonb
),

-- 2. Blendora
(
  'Blendora',
  'blendora',
  'Blend Better. Live Better.',
  'High-converting home and kitchen store template featuring product-focused layouts, social proof sections, and optimized checkout flow.',
  'Home & Kitchen', 'Home & Kitchen',
  ARRAY['home','kitchen','dawn-theme','blender','lifestyle'],
  '/mocks/designs/store_blendora.png',
  '/mocks/designs/store_blendora.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  'published', 1,
  '{"conversions": 94, "trend": "+14%", "revenue": "$128.4K", "themeName": "Dawn", "heroText": "Blend Better. Live Better."}'::jsonb
),

-- 3. Luméa Skin
(
  'Luméa Skin',
  'lumea-skin',
  'Unleash Your Natural Glow',
  'Premium beauty and skincare store template with editorial layouts, before/after sections, ingredient spotlights, and high-trust checkout design.',
  'Beauty & Skincare', 'Beauty & Skincare',
  ARRAY['beauty','skincare','prestige-theme','glow','premium'],
  '/mocks/designs/store_lumea.png',
  '/mocks/designs/store_lumea.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  'published', 2,
  '{"conversions": 92, "trend": "+11%", "revenue": "$97.6K", "themeName": "Prestige", "heroText": "Unleash Your Natural Glow"}'::jsonb
),

-- 4. Naturae Living
(
  'Naturae Living',
  'naturae-living',
  'Earthy goods for a better home',
  'Eco-friendly home and garden store with earthy tones, sustainability messaging, and collections-first navigation.',
  'Home & Garden', 'Home & Garden',
  ARRAY['eco','home','garden','impulse-theme','sustainable','earthy'],
  '/mocks/designs/store_naturae.png',
  '/mocks/designs/store_naturae.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  'published', 3,
  '{"conversions": 91, "trend": "+8%", "revenue": "$86.3K", "themeName": "Impulse", "heroText": "Earthy goods for a better home"}'::jsonb
),

-- 5. Gymzate
(
  'Gymzate',
  'gymzate',
  'Stronger Every Day',
  'High-energy fitness store template with bold typography, video hero, product bundles, and workout plan upsells.',
  'Fitness', 'Fitness',
  ARRAY['fitness','gym','turbo-theme','workout','strength','bold'],
  '/mocks/designs/store_gymzate.png',
  '/mocks/designs/store_gymzate.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  'published', 4,
  '{"conversions": 90, "trend": "+15%", "revenue": "$112.7K", "themeName": "Turbo", "heroText": "Stronger Every Day"}'::jsonb
),

-- 6. Pawfectly
(
  'Pawfectly',
  'pawfectly',
  'Happy pets, happy life.',
  'Lovable pet store template with lifestyle imagery, subscription product support, and emotional brand storytelling.',
  'Pets', 'Pets',
  ARRAY['pets','pet-supplies','dawn-theme','dogs','cats','lifestyle'],
  '/mocks/designs/store_pawfectly.png',
  '/mocks/designs/store_pawfectly.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  'published', 5,
  '{"conversions": 89, "trend": "+6%", "revenue": "$71.2K", "themeName": "Dawn", "heroText": "Happy pets, happy life."}'::jsonb
),

-- 7. Vestré
(
  'Vestré',
  'vestre',
  'Timeless Style. Modern You.',
  'Sophisticated fashion store with editorial product galleries, size guide integration, and loyalty program landing sections.',
  'Fashion', 'Fashion',
  ARRAY['fashion','clothing','prestige-theme','timeless','editorial','style'],
  '/mocks/designs/store_vestre.png',
  '/mocks/designs/store_vestre.png',
  ARRAY[]::text[],
  NULL, NULL,
  0, NULL, 'USD', TRUE,
  'free', ARRAY[]::text[],
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  'published', 6,
  '{"conversions": 88, "trend": "+9%", "revenue": "$93.1K", "themeName": "Prestige", "heroText": "Timeless Style. Modern You."}'::jsonb
)

ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 2. SEED SHOPIFY PAGE SETTINGS
-- Mirrors the static initialPages array in PagesAndFeaturesControl.tsx
-- ──────────────────────────────────────────────────────────

INSERT INTO public.shopify_page_settings (
  page_key, name, route, page_type, status,
  plan_access, usage_limit, is_visible, content_editable,
  sort_order, icon_name
)
VALUES
  ('dashboard',        'Dashboard',        '/dashboard',        'Core',    'Active', 'All Plans', '-',               TRUE, TRUE,  0,  'LayoutDashboard'),
  ('product-research', 'Product Research', '/product-research', 'Feature', 'Active', 'Starter+',  '500 searches / mo', TRUE, TRUE,  1,  'Search'),
  ('winning-products', 'Winning Products', '/winning-products', 'Feature', 'Active', 'Pro+',      '200 items / mo',  TRUE, TRUE,  2,  'Trophy'),
  ('store-explorer',   'Store Explorer',   '/store-explorer',   'Feature', 'Active', 'Starter+',  '50 lookups / mo', TRUE, TRUE,  3,  'Store'),
  ('store-designs',    'Store Designs',    '/store-designs',    'Feature', 'Active', 'Pro+',      '50 views / mo',   TRUE, TRUE,  4,  'Paintbrush'),
  ('ad-library',       'Ad Library',       '/ad-library',       'Feature', 'Active', 'Pro+',      '100 lookups / mo',TRUE, TRUE,  5,  'Image'),
  ('ai-copy-studio',   'AI Copy Studio',   '/ai-copy-studio',   'Feature', 'Active', 'Starter+',  '200 generations / mo', TRUE, TRUE, 6, 'Sparkles'),
  ('saved-items',      'Saved Items',      '/saved-items',      'Feature', 'Active', 'All Plans', '500 items',       TRUE, TRUE,  7,  'Bookmark'),
  ('settings',         'Settings',         '/settings',         'Core',    'Active', 'All Plans', '-',               TRUE, TRUE,  8,  'Settings'),
  ('billing',          'Billing',          '/billing',          'Core',    'Active', 'All Plans', '-',               TRUE, TRUE,  9,  'CreditCard'),
  ('help',             'Help',             '/help',             'Core',    'Active', 'All Plans', '-',               TRUE, TRUE,  10, 'HelpCircle')

ON CONFLICT (page_key) DO NOTHING;
