/**
 * DEV-only sample blog content. Used by the data layer as a fallback when the
 * `marketing_posts` table is empty or not yet migrated, so the blog UI is
 * developable/verifiable before content exists. In production builds
 * `import.meta.env.DEV` is statically false, so this is tree-shaken out.
 */
import type {
  MarketingCategory,
  MarketingPostWithRelations,
} from "@repo/types";

const now = "2026-06-14T10:00:00Z";

export const SAMPLE_CATEGORIES: MarketingCategory[] = [
  { id: "c1", slug: "ebay-dropshipping", name: "eBay Dropshipping", description: "Strategies, policy, and automation for dropshipping on eBay.", sort_order: 1, created_at: now, updated_at: now },
  { id: "c2", slug: "amazon-to-ebay", name: "Amazon to eBay", description: "Sourcing and listing Amazon products on eBay the right way.", sort_order: 2, created_at: now, updated_at: now },
  { id: "c3", slug: "product-research", name: "Product Research", description: "Finding winning products and profitable niches.", sort_order: 3, created_at: now, updated_at: now },
  { id: "c4", slug: "seller-tips", name: "Seller Tips", description: "Pricing, fees, optimization, and scaling your store.", sort_order: 4, created_at: now, updated_at: now },
];

const author = {
  id: "a1",
  slug: "sellersuit-team",
  name: "SellerSuit Team",
  avatar_url: null,
  bio: "The SellerSuit team helps eBay sellers automate sourcing and listing.",
  created_at: now,
  updated_at: now,
};

function post(
  partial: Partial<MarketingPostWithRelations> &
    Pick<MarketingPostWithRelations, "slug" | "title" | "content">,
  category: MarketingCategory,
): MarketingPostWithRelations {
  return {
    id: partial.slug,
    excerpt: null,
    cover_image_url: null,
    category_id: category.id,
    author_id: author.id,
    status: "published",
    published_at: now,
    seo_title: null,
    meta_description: null,
    canonical_url: null,
    og_image_url: null,
    keywords: [],
    reading_minutes: 8,
    faq: [],
    created_at: now,
    updated_at: now,
    category,
    author,
    ...partial,
  } as MarketingPostWithRelations;
}

export const SAMPLE_POSTS: MarketingPostWithRelations[] = [
  post(
    {
      slug: "amazon-to-ebay-dropshipping-guide-2026",
      title: "Amazon to eBay Dropshipping: The Complete 2026 Guide",
      excerpt:
        "How to source winning products on Amazon and list them on eBay profitably — pricing, policy, automation, and the mistakes that get accounts suspended.",
      meta_description:
        "Step-by-step 2026 guide to Amazon-to-eBay dropshipping: sourcing, pricing, eBay policy, and automating listings with SellerSuit.",
      keywords: ["amazon to ebay", "ebay dropshipping", "dropshipping 2026"],
      reading_minutes: 11,
      faq: [
        { q: "Is Amazon to eBay dropshipping allowed?", a: "eBay permits dropshipping from wholesale suppliers but prohibits sourcing directly from another retail marketplace and having them ship to your buyer. Use compliant suppliers and fulfilment." },
        { q: "How much can you make?", a: "Margins typically run 10–25% after eBay and payment fees. Volume and product research drive total profit." },
      ],
      content: `
        <h2>Why Amazon to eBay still works in 2026</h2>
        <p>eBay has 130M+ active buyers and far less seller competition than Amazon in many categories. Sourcing trending products and listing them with optimized titles remains one of the fastest ways to start an online store with low upfront cost.</p>
        <h2>Step 1 — Find products that sell</h2>
        <p>Look for items with steady demand, healthy margins after fees, and reliable supply. Avoid gated categories and fragile, oversized, or restricted items.</p>
        <h3>What makes a good product</h3>
        <ul><li>Sells consistently (not a one-off spike)</li><li>20%+ margin after eBay + payment fees</li><li>Lightweight and easy to ship</li><li>Not brand-gated or VeRO-protected</li></ul>
        <h2>Step 2 — List it the right way</h2>
        <p>Your title is the single biggest ranking factor in eBay search. Use all 80 characters with the keywords buyers actually type. Add item specifics, clean photos, and a clear description.</p>
        <h2>Step 3 — Automate the busywork</h2>
        <p>Manually copying product data is the bottleneck. SellerSuit scrapes the product and builds an optimized eBay listing in one click, so you can list dozens of items in the time it used to take to do one.</p>
        <h2>Staying compliant</h2>
        <p>Keep handling times realistic, monitor stock and price changes, and never have a retail marketplace ship branded packaging to your buyer. Compliance is what keeps your account alive long-term.</p>
      `,
    },
    SAMPLE_CATEGORIES[1],
  ),
  post(
    {
      slug: "ebay-fees-explained-2026",
      title: "eBay Fees Explained (2026): What You Actually Keep",
      excerpt:
        "Final value fees, payment processing, store subscriptions, and the hidden costs that eat your margin — with a worked example.",
      meta_description:
        "A clear breakdown of eBay seller fees in 2026: final value fees, payment processing, and how to price so you stay profitable.",
      keywords: ["ebay fees", "final value fee", "ebay seller costs"],
      reading_minutes: 7,
      content: `
        <h2>The fees that matter</h2>
        <p>Most new sellers underestimate fees and end up pricing at a loss. Here's what actually comes out of each sale.</p>
        <h3>Final value fee</h3>
        <p>eBay charges a percentage of the total sale (item + shipping), typically ~12–14% depending on category, plus a small per-order fee.</p>
        <h3>Worked example</h3>
        <p>Sell a $30 item: ~$4.00 final value fee, leaving you to cover product cost and shipping from the rest. Always model fees before you list.</p>
      `,
    },
    SAMPLE_CATEGORIES[3],
  ),
  post(
    {
      slug: "find-winning-products-ebay",
      title: "How to Find Winning Products to Sell on eBay",
      excerpt:
        "A repeatable product-research process: demand signals, competition checks, and margin math you can run in minutes.",
      meta_description:
        "Learn a repeatable process to find winning, profitable products to dropship on eBay in 2026.",
      keywords: ["product research", "winning products", "ebay niches"],
      reading_minutes: 9,
      content: `
        <h2>Start with demand, not gut feel</h2>
        <p>Validate that people are already buying. Check sold listings, search volume, and seasonality before committing.</p>
        <h2>Check the competition</h2>
        <p>If a few sellers dominate with hundreds of sales, you'll need a sharper angle. Look for under-served variations.</p>
        <h2>Do the margin math</h2>
        <p>Product cost + shipping + eBay fees must leave a worthwhile margin. If it doesn't clear 20%, keep looking.</p>
      `,
    },
    SAMPLE_CATEGORIES[2],
  ),
];
