export interface KPI {
  title: string;
  value: string;
  label: string;
  growth: string;
  trendData: number[];
}

export const MOCK_AD_KPIS: KPI[] = [
  {
    title: 'New Today',
    value: '124',
    label: 'New Winning Ads',
    growth: '+24.6%',
    trendData: [4, 5, 4, 7, 6, 12, 9, 15, 14, 19, 21, 24],
  },
  {
    title: '7-Day Scaling',
    value: '842',
    label: 'Scaling Ads',
    growth: '+18.3%',
    trendData: [8, 8, 10, 9, 13, 15, 12, 16, 14, 19, 22, 25],
  },
  {
    title: '15-Day Verified',
    value: '1,920',
    label: 'Verified Winners',
    growth: '+21.7%',
    trendData: [6, 6, 7, 6, 13, 10, 12, 9, 14, 11, 17, 19],
  },
  {
    title: '30-Day Proven',
    value: '4,856',
    label: 'Proven Winners',
    growth: '+26.8%',
    trendData: [5, 5, 6, 5, 7, 10, 14, 11, 13, 16, 21, 23],
  },
  {
    title: 'Monthly Breakouts',
    value: '7,642',
    label: 'Breakout Ads',
    growth: '+31.2%',
    trendData: [7, 6, 8, 7, 12, 10, 14, 13, 16, 15, 18, 21],
  },
];

export interface DashboardAd {
  id: string;
  title: string;
  headline: string;
  category: string;
  platform: string;
  country: string;
  badge: string;
  daysActive: number;
  score: number;
  image: string;
  price: string;
  adSpend: string;
  reach: string;
  activeAds: number;
  selfSellScore: number;
  opportunity: string;
  trendData: number[];
}

export const MOCK_TOP_ADS: DashboardAd[] = [
  {
    id: 'ad_1',
    title: 'Portable Turbo Fan',
    headline: 'Powerful Air Flow Small Size!',
    category: 'Gadgets',
    platform: 'Shopify',
    country: 'US',
    badge: 'Hot',
    daysActive: 32,
    score: 87,
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600',
    price: '$29.99',
    adSpend: '$48.7K',
    reach: '2.1M',
    activeAds: 78,
    selfSellScore: 87,
    opportunity: 'High Opportunity',
    trendData: [40, 50, 45, 60, 70, 85, 80],
  },
  {
    id: 'ad_2',
    title: 'Pet Hair Remover',
    headline: 'One Click Remove Hair!',
    category: 'Pet Supplies',
    platform: 'Shopify',
    country: 'UK',
    badge: 'Rising Fast',
    daysActive: 24,
    score: 81,
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',
    price: '$19.95',
    adSpend: '$32.1K',
    reach: '1.6M',
    activeAds: 45,
    selfSellScore: 81,
    opportunity: 'High Opportunity',
    trendData: [30, 40, 45, 55, 60, 75, 81],
  },
  {
    id: 'ad_3',
    title: '100 Languages Necklace',
    headline: 'I Love You in 100 Languages',
    category: 'Jewelry',
    platform: 'Shopify',
    country: 'US',
    badge: 'Low Competition',
    daysActive: 18,
    score: 78,
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600',
    price: '$39.90',
    adSpend: '$26.4K',
    reach: '980K',
    activeAds: 32,
    selfSellScore: 78,
    opportunity: 'Good Opportunity',
    trendData: [20, 30, 45, 40, 55, 70, 78],
  },
  {
    id: 'ad_4',
    title: 'Sink Drain Strainer',
    headline: 'No More Clogged Sink!',
    category: 'Home Improvement',
    platform: 'Shopify',
    country: 'US',
    badge: 'Untapped',
    daysActive: 15,
    score: 74,
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600',
    price: '$16.99',
    adSpend: '$19.6K',
    reach: '720K',
    activeAds: 28,
    selfSellScore: 74,
    opportunity: 'Good Opportunity',
    trendData: [10, 20, 35, 40, 50, 60, 74],
  },
  {
    id: 'ad_5',
    title: 'Nail Care Electric Trimmer',
    headline: 'Don’t Ruin Your Beautiful Nails',
    category: 'Beauty',
    platform: 'Shopify',
    country: 'US',
    badge: 'High Profit',
    daysActive: 21,
    score: 72,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
    price: '$18.90',
    adSpend: '$15.2K',
    reach: '610K',
    activeAds: 23,
    selfSellScore: 72,
    opportunity: 'Good Opportunity',
    trendData: [15, 25, 30, 45, 50, 65, 72],
  },
];

export const MOCK_EXTRA_ADS: DashboardAd[] = [
  {
    id: 'ad_6',
    title: 'LED Night Light',
    headline: 'Motion Sensor LED Night Light',
    category: 'Home Decor',
    platform: 'Shopify',
    country: 'CA',
    badge: 'New Today',
    daysActive: 7,
    score: 69,
    image: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600',
    price: '$14.99',
    adSpend: '$8.9K',
    reach: '340K',
    activeAds: 17,
    selfSellScore: 69,
    opportunity: 'Emerging Opportunity',
    trendData: [5, 10, 15, 25, 40, 50, 69],
  },
  {
    id: 'ad_7',
    title: 'Mini Projector',
    headline: 'Turn Any Wall Into a Cinema',
    category: 'Electronics',
    platform: 'Shopify',
    country: 'US',
    badge: 'Scaling',
    daysActive: 45,
    score: 84,
    image: 'https://images.unsplash.com/photo-1601944179066-29786cb9d32a?w=600',
    price: '$59.99',
    adSpend: '$74.2K',
    reach: '3.8M',
    activeAds: 92,
    selfSellScore: 84,
    opportunity: 'High Opportunity',
    trendData: [50, 55, 60, 65, 70, 80, 84],
  },
  {
    id: 'ad_8',
    title: 'Car Vacuum Cleaner',
    headline: 'Deep Clean Your Car in Minutes',
    category: 'Automotive',
    platform: 'Shopify',
    country: 'AU',
    badge: 'High Profit',
    daysActive: 28,
    score: 76,
    image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600',
    price: '$34.95',
    adSpend: '$21.8K',
    reach: '870K',
    activeAds: 39,
    selfSellScore: 76,
    opportunity: 'Good Opportunity',
    trendData: [20, 30, 35, 50, 60, 70, 76],
  },
];

export const MOCK_ALL_ADS = [...MOCK_TOP_ADS, ...MOCK_EXTRA_ADS];

export const MOCK_SIGNALS = [
  { text: 'Pet Hair Remover is scaling in UK', time: '2m ago' },
  { text: 'Sink cleaner ads increased 42%', time: '5m ago' },
  { text: '18 low-competition products found', time: '7m ago' },
  { text: 'US beauty niche up 31%', time: '8m ago' },
  { text: '12 Shopify stores added this product', time: '10m ago' },
  { text: 'New TikTok-style creative detected', time: '11m ago' },
  { text: 'Germany market showing growth', time: '13m ago' },
  { text: 'Ad spend on gadgets up 28%', time: '15m ago' },
];

export const MOCK_NICHES = [
  { name: 'Home Improvement', growth: '+256%' },
  { name: 'Pet Supplies', growth: '+189%' },
  { name: 'Beauty & Personal Care', growth: '+145%' },
  { name: 'Kitchen Gadgets', growth: '+132%' },
  { name: 'Fitness & Health', growth: '+118%' },
];

export const MOCK_SAVED_ITEMS = [
  { name: 'Mini Projector', time: 'Saved 2h ago' },
  { name: 'Car Vacuum Cleaner', time: 'Saved 6h ago' },
  { name: 'LED Night Light', time: 'Saved 1d ago' },
  { name: 'Waterproof Phone Case', time: 'Saved 2d ago' },
];

export interface MetaAdData {
  id: string;
  productId: number;
  productName: string;
  pageName: string;
  advertiserName: string;
  adLibraryId: number;
  platform: string;
  country: string;
  status: string;
  startDate: string;
  daysActive: number;
  creativeType: string;
  adCopy: string;
  headline: string;
  callToAction: string;
  landingPageUrl: string;
  estimatedSpend: string;
  estimatedReach: string;
  activeVariations: number;
  engagementRate: string;
  trendScore: number;
  saturationLevel: string;
  competitionLevel: string;
  detectedStorePlatform: string;
  productPrice: string;
}

export const metaAdsDummyData: MetaAdData[] = [
  {
    id: 'meta_ad_001',
    productId: 1,
    productName: 'Portable Turbo Fan',
    pageName: 'CoolGadget Deals',
    advertiserName: 'CoolGadget Deals',
    adLibraryId: 93847291001,
    platform: 'Facebook, Instagram',
    country: 'US',
    status: 'Active',
    startDate: '2026-04-19',
    daysActive: 32,
    creativeType: 'Video',
    adCopy: 'Stay cool anywhere with this powerful pocket-sized turbo fan. Perfect for summer, travel, office and outdoor use.',
    headline: 'Powerful Air Flow Small Size!',
    callToAction: 'Shop Now',
    landingPageUrl: 'https://example-store.com/products/portable-turbo-fan',
    estimatedSpend: '$48.7K',
    estimatedReach: '2.1M',
    activeVariations: 78,
    engagementRate: '4.8%',
    trendScore: 87,
    saturationLevel: 'Medium',
    competitionLevel: 'Low',
    detectedStorePlatform: 'Shopify',
    productPrice: '$29.99',
  },
  {
    id: 'meta_ad_002',
    productId: 2,
    productName: 'Pet Hair Remover',
    pageName: 'Happy Pet Finds',
    advertiserName: 'Happy Pet Finds',
    adLibraryId: 93847291002,
    platform: 'Facebook, Instagram',
    country: 'UK',
    status: 'Active',
    startDate: '2026-04-27',
    daysActive: 24,
    creativeType: 'Video',
    adCopy: 'Remove pet hair from sofas, carpets and clothes in seconds. No batteries, no refills, just swipe and clean.',
    headline: 'One Click Remove Hair!',
    callToAction: 'Shop Now',
    landingPageUrl: 'https://example-store.com/products/pet-hair-remover',
    estimatedSpend: '$32.1K',
    estimatedReach: '1.6M',
    activeVariations: 45,
    engagementRate: '5.3%',
    trendScore: 81,
    saturationLevel: 'Low',
    competitionLevel: 'Medium',
    detectedStorePlatform: 'Shopify',
    productPrice: '$19.95',
  },
  {
    id: 'meta_ad_003',
    productId: 3,
    productName: '100 Languages Necklace',
    pageName: 'LoveGift Studio',
    advertiserName: 'LoveGift Studio',
    adLibraryId: 93847291003,
    platform: 'Facebook, Instagram',
    country: 'US',
    status: 'Active',
    startDate: '2026-05-03',
    daysActive: 18,
    creativeType: 'Image',
    adCopy: 'A romantic necklace that says I love you in 100 languages. A perfect gift for anniversaries, birthdays and special moments.',
    headline: 'I Love You in 100 Languages',
    callToAction: 'Shop Now',
    landingPageUrl: 'https://example-store.com/products/100-languages-necklace',
    estimatedSpend: '$26.4K',
    estimatedReach: '980K',
    activeVariations: 32,
    engagementRate: '3.9%',
    trendScore: 78,
    saturationLevel: 'Low',
    competitionLevel: 'Low',
    detectedStorePlatform: 'Shopify',
    productPrice: '$39.90',
  },
  {
    id: 'meta_ad_004',
    productId: 4,
    productName: 'Sink Drain Strainer',
    pageName: 'CleanHome Essentials',
    advertiserName: 'CleanHome Essentials',
    adLibraryId: 93847291004,
    platform: 'Facebook, Instagram',
    country: 'US',
    status: 'Active',
    startDate: '2026-05-06',
    daysActive: 15,
    creativeType: 'Video',
    adCopy: 'Stop clogged sinks before they happen. Easy to clean, reusable and perfect for every kitchen.',
    headline: 'No More Clogged Sink!',
    callToAction: 'Shop Now',
    landingPageUrl: 'https://example-store.com/products/sink-drain-strainer',
    estimatedSpend: '$19.6K',
    estimatedReach: '720K',
    activeVariations: 28,
    engagementRate: '4.1%',
    trendScore: 74,
    saturationLevel: 'Low',
    competitionLevel: 'Low',
    detectedStorePlatform: 'Shopify',
    productPrice: '$16.99',
  },
  {
    id: 'meta_ad_005',
    productId: 5,
    productName: 'Nail Care Electric Trimmer',
    pageName: 'Beauty Tool Lab',
    advertiserName: 'Beauty Tool Lab',
    adLibraryId: 93847291005,
    platform: 'Facebook, Instagram',
    country: 'US',
    status: 'Active',
    startDate: '2026-04-30',
    daysActive: 21,
    creativeType: 'Video',
    adCopy: 'Shape, polish and maintain beautiful nails at home with this compact electric nail care tool.',
    headline: 'Don’t Ruin Your Beautiful Nails',
    callToAction: 'Shop Now',
    landingPageUrl: 'https://example-store.com/products/nail-care-electric-trimmer',
    estimatedSpend: '$15.2K',
    estimatedReach: '610K',
    activeVariations: 23,
    engagementRate: '3.7%',
    trendScore: 72,
    saturationLevel: 'Medium',
    competitionLevel: 'Medium',
    detectedStorePlatform: 'Shopify',
    productPrice: '$18.90',
  },
];
