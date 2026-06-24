-- ============================================================
-- Homepage Content Table
-- Single JSONB row (scope='global') for DB-backed homepage copy.
-- Admin writes enforced server-side via is_admin() RLS.
-- Public reads allowed (anon) so the Edge Function proxy can serve
-- without auth; the Edge Function is the actual public-facing endpoint.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.homepage_content (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      text        NOT NULL DEFAULT 'global',
  version    integer     NOT NULL DEFAULT 1,
  content    jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT homepage_content_scope_unique UNIQUE (scope)
);

ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read published content.
CREATE POLICY "homepage_content_anon_select"
  ON public.homepage_content FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert/update/delete.
CREATE POLICY "homepage_content_admin_write"
  ON public.homepage_content FOR ALL
  TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Seed default content ─────────────────────────────────────────────────────

INSERT INTO public.homepage_content (scope, version, content)
VALUES (
  'global',
  1,
  '{
    "announcement": {
      "message": "Tournament Season Sale — 25% off Starter & Pro.",
      "link": { "label": "Claim the deal", "href": "#pricing" },
      "accentColors": ["#16a34a", "#f59e0b", "#dc2626", "#2563eb"]
    },
    "nav": {
      "links": [
        { "label": "How it works", "href": "/how-it-works" },
        { "label": "Features",     "href": "/features" },
        { "label": "Pricing",      "href": "/pricing" },
        { "label": "Blog",         "href": "/blog" }
      ],
      "megaDrops": [
        {
          "label": "Product",
          "groups": [
            {
              "heading": "Core workflow",
              "items": [
                {
                  "icon": "ScanSearch",
                  "title": "Supplier Scraper",
                  "subtitle": "One-click capture from Amazon, Walmart & AliExpress",
                  "href": "/features#scraper"
                },
                {
                  "icon": "Tags",
                  "title": "SKU Engine",
                  "subtitle": "Auto-generate trackable SKUs for every variant",
                  "href": "/features#sku"
                },
                {
                  "icon": "Calculator",
                  "title": "Profit Calculator",
                  "subtitle": "Set prices that protect your margin before you list",
                  "href": "/calculator"
                },
                {
                  "icon": "Boxes",
                  "title": "Bulk Upload",
                  "subtitle": "Queue dozens of products and publish in the background",
                  "href": "/features#bulk"
                }
              ]
            },
            {
              "heading": "Dashboard & insights",
              "items": [
                {
                  "icon": "LayoutDashboard",
                  "title": "Live Dashboard",
                  "subtitle": "Listings, orders, and revenue update in real time",
                  "href": "/features#dashboard"
                },
                {
                  "icon": "PanelRightOpen",
                  "title": "Side-Panel Editor",
                  "subtitle": "Edit titles, images, and variants beside the product page",
                  "href": "/features#editor"
                }
              ]
            }
          ]
        },
        {
          "label": "Resources",
          "groups": [
            {
              "items": [
                {
                  "icon": "BookOpen",
                  "title": "Documentation",
                  "subtitle": "Setup guides, API reference, and troubleshooting",
                  "href": "/documentation"
                },
                {
                  "icon": "Newspaper",
                  "title": "Blog",
                  "subtitle": "Tips, strategies, and eBay dropshipping news",
                  "href": "/blog"
                },
                {
                  "icon": "HelpCircle",
                  "title": "FAQ",
                  "subtitle": "Answers to the most common seller questions",
                  "href": "/faq"
                }
              ]
            }
          ]
        }
      ],
      "loginCta":  { "label": "Log in",             "href": "/auth" },
      "primaryCta":{ "label": "Start $1 Trial",      "href": "/signup", "external": false }
    },
    "hero": {
      "eyebrow": "Amazon · Walmart · AliExpress → eBay",
      "titleLead": "List winning products to eBay in",
      "titleHighlight": "one click.",
      "subtitle": "SellerSuit scrapes supplier product data, builds optimized listings with SKUs and pricing, and auto-uploads them to eBay — so you spend minutes per listing, not hours.",
      "primaryCta":   { "label": "Add to Chrome — Free", "href": "https://chromewebstore.google.com/detail/sellersuit", "external": true,  "event": "cta_add_to_chrome_hero" },
      "secondaryCta": { "label": "See how it works",     "href": "/how-it-works",                                    "external": false, "event": "cta_how_it_works_hero" },
      "heroImageSrc": "",
      "heroImageAlt": "SellerSuit dashboard showing live eBay listings",
      "stats": [
        { "value": "200+",  "label": "Listings per hour" },
        { "value": "3",     "label": "Supported suppliers" },
        { "value": "50k+",  "label": "Active resellers" }
      ]
    },
    "logo_cloud": {
      "heading": "Source from the suppliers you already use",
      "proof": "Trusted by 50,000+ resellers",
      "logos": [
        { "name": "Amazon",     "src": "/logos/amazon.ico" },
        { "name": "Walmart",    "src": "/logos/walmart.ico" },
        { "name": "AliExpress", "src": "/logos/aliexpress.ico" },
        { "name": "eBay",       "src": "/logos/ebay.ico" }
      ]
    },
    "use_cases": {
      "eyebrow": "Built for every workflow",
      "heading": "From solo seller to full-scale operation.",
      "intro": "SellerSuit adapts to how you work — whether you''re listing 10 products a day or 10,000.",
      "cards": [
        {
          "icon": "Zap",
          "heading": "Single-item listing",
          "description": "Open any supplier page, scrape in one click, edit in the side panel, and push to eBay in under 30 seconds."
        },
        {
          "icon": "Boxes",
          "heading": "Bulk listing campaigns",
          "description": "Queue an entire category of products, set a margin rule, and let the bulk lister publish them while you sleep."
        },
        {
          "icon": "TrendingUp",
          "heading": "Price monitoring",
          "description": "Track supplier price changes and automatically reprice your eBay listings to protect your margin."
        },
        {
          "icon": "Sparkles",
          "heading": "AI-powered descriptions",
          "description": "Generate eBay-optimized, policy-compliant listing descriptions from raw supplier data using built-in AI."
        }
      ]
    },
    "benefits": {
      "eyebrow": "Why SellerSuit",
      "heading": "Everything a reseller needs, nothing they don''t.",
      "intro": "Designed to eliminate the copy-paste grind and give you back time to focus on sourcing winners.",
      "items": [
        { "icon": "Clock",          "label": "30-second listings",    "description": "From supplier page to live eBay listing in under a minute." },
        { "icon": "ShieldCheck",    "label": "eBay policy-safe",      "description": "AI strips supplier names, URLs, and banned phrases automatically." },
        { "icon": "DollarSign",     "label": "Real margin visibility", "description": "Factor in all fees and shipping before a single listing goes live." },
        { "icon": "BarChart2",      "label": "Live order tracking",   "description": "Synced orders and revenue update in real time on your dashboard." }
      ]
    },
    "features": {
      "eyebrow": "How it works",
      "heading": "Three steps from supplier page to live listing.",
      "intro": "No spreadsheets, no copy-paste. The extension does the heavy lifting — you just review and confirm.",
      "blocks": [
        {
          "number": 1,
          "heading": "Scrape the supplier page",
          "description": "Open any Amazon, Walmart, or AliExpress product. SellerSuit captures the title, images, all variants, and the current price — instantly, in one click.",
          "bullets": [
            { "icon": "Image",      "label": "High-res images captured automatically" },
            { "icon": "Tags",       "label": "All variants and options extracted" },
            { "icon": "Zap",        "label": "Under 3 seconds per product" }
          ],
          "imageSrc": "",
          "imageAlt": "SellerSuit side panel showing scraped product data"
        },
        {
          "number": 2,
          "heading": "Edit, price, and optimize",
          "description": "Auto-generate SKUs, set your margin with the profit engine, and refine the AI-written title and description — all in the side-panel editor, right beside the product page.",
          "bullets": [
            { "icon": "Calculator",  "label": "Profit engine calculates fees and shipping" },
            { "icon": "Sparkles",    "label": "AI writes eBay-optimized descriptions" },
            { "icon": "Edit3",       "label": "Edit titles, images, and variants inline" }
          ],
          "imageSrc": "",
          "imageAlt": "Profit calculator and side-panel editor"
        },
        {
          "number": 3,
          "heading": "Auto-upload to eBay",
          "description": "Push the finished listing — or a whole batch — straight to your eBay account. Track everything from the live dashboard without ever touching eBay''s seller hub.",
          "bullets": [
            { "icon": "Rocket",         "label": "Single listing or bulk queue" },
            { "icon": "LayoutDashboard","label": "Live dashboard syncs orders in real time" },
            { "icon": "RefreshCw",      "label": "Auto-reprice when supplier costs change" }
          ],
          "imageSrc": "",
          "imageAlt": "SellerSuit dashboard with live eBay listings"
        }
      ]
    },
    "trust": {
      "eyebrow": "Built for trust",
      "heading": "Compliant, secure, and built on proven infrastructure.",
      "paragraph": "SellerSuit is built on Supabase for data security and Stripe for payments. All listing pipelines are designed to stay within eBay seller policy. Read more in our <a>documentation</a>.",
      "paragraphLink": { "label": "documentation", "href": "/documentation" },
      "badges": [
        { "label": "eBay Policy Compliant",  "description": "Listings generated within eBay''s seller guidelines" },
        { "label": "Stripe Payments",        "description": "Billing handled securely by Stripe" },
        { "label": "Supabase Infrastructure","description": "Data stored on Supabase Postgres with RLS" },
        { "label": "SSL Encrypted",          "description": "All traffic encrypted end-to-end" }
      ]
    },
    "mission": {
      "eyebrow": "Our mission",
      "heading": "Make eBay arbitrage accessible to every seller.",
      "paragraph": "We built SellerSuit because we saw talented resellers spending 80% of their time on busywork — copy-paste titles, manual image uploads, guessing margins. The extension handles the grind so you can focus on what matters: finding winning products and scaling your store.",
      "cta": { "label": "Read our story", "href": "/about", "external": false }
    },
    "community": {
      "eyebrow": "Join the community",
      "heading": "Built with resellers, for resellers.",
      "intro": "Connect with thousands of eBay sellers, share strategies, and get help when you need it.",
      "channels": [
        {
          "icon": "MessageCircle",
          "name": "Discord",
          "blurb": "Live chat, strategy discussions, and direct access to the SellerSuit team.",
          "actionLabel": "Join Discord",
          "href": "https://discord.gg/sellersuit"
        },
        {
          "icon": "Newspaper",
          "name": "Blog",
          "blurb": "In-depth guides on sourcing strategies, eBay SEO, and scaling your store.",
          "actionLabel": "Read the blog",
          "href": "/blog"
        },
        {
          "icon": "BookOpen",
          "name": "Documentation",
          "blurb": "Step-by-step setup guides, API reference, and troubleshooting for every feature.",
          "actionLabel": "Browse docs",
          "href": "/documentation"
        },
        {
          "icon": "Mail",
          "name": "Support",
          "blurb": "Got a question or found a bug? Our team responds within 24 hours.",
          "actionLabel": "Contact us",
          "href": "/contact"
        }
      ]
    },
    "final_cta": {
      "heading": "Start listing winners today.",
      "subheading": "Add the free extension and run your first listing in minutes. Upgrade to a paid plan only when you''re ready to scale.",
      "primaryCta":   { "label": "Add to Chrome — Free", "href": "https://chromewebstore.google.com/detail/sellersuit", "external": true,  "event": "cta_add_to_chrome_final" },
      "secondaryCta": { "label": "Compare plans",         "href": "#pricing",                                           "external": false, "event": "cta_compare_plans_final" }
    },
    "footer": {
      "tagline": "The all-in-one toolkit for eBay dropshipping: scrape suppliers, build listings, and scale with confidence.",
      "columns": [
        {
          "title": "Product",
          "links": [
            { "label": "How it works", "href": "/how-it-works" },
            { "label": "Features",     "href": "/features" },
            { "label": "Pricing",      "href": "/pricing" },
            { "label": "Calculator",   "href": "/calculator" }
          ]
        },
        {
          "title": "Resources",
          "links": [
            { "label": "Blog",           "href": "/blog" },
            { "label": "Documentation",  "href": "/documentation" },
            { "label": "Troubleshooting","href": "/documentation#troubleshooting" }
          ]
        },
        {
          "title": "Company",
          "links": [
            { "label": "About",   "href": "/about" },
            { "label": "Contact", "href": "/contact" }
          ]
        },
        {
          "title": "Legal",
          "links": [
            { "label": "Privacy", "href": "/privacy-policy" },
            { "label": "Terms",   "href": "/terms-of-service" },
            { "label": "Refunds", "href": "/refund" }
          ]
        }
      ],
      "badges": [
        { "label": "eBay Policy Compliant" },
        { "label": "Stripe Secured" },
        { "label": "SSL Encrypted" }
      ],
      "social": [
        { "icon": "Twitter",  "name": "Twitter",  "href": "https://twitter.com/sellersuit" },
        { "icon": "Youtube",  "name": "YouTube",  "href": "https://youtube.com/@sellersuit" },
        { "icon": "Linkedin", "name": "LinkedIn", "href": "https://linkedin.com/company/sellersuit" }
      ],
      "copyright": "SellerSuit. All rights reserved."
    }
  }'::jsonb
)
ON CONFLICT (scope) DO UPDATE
  SET version    = homepage_content.version + 1,
      content    = EXCLUDED.content,
      updated_at = timezone('utc', now());
