// ─── Shopify Dashboard Mock Data ───
// Premium static data for Dropea Shopify growth suite.

export interface ShopifyKPI {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  period: string;
  icon: 'trophy' | 'store' | 'megaphone' | 'target';
}

export const MOCK_KPIS: ShopifyKPI[] = [
  {
    label: 'Product Opportunities',
    value: '14,820',
    change: '+12.4%',
    changeType: 'up',
    period: 'Updated 2h ago',
    icon: 'trophy',
  },
  {
    label: 'Stores Tracked',
    value: '8,732',
    change: '+8.2%',
    changeType: 'up',
    period: 'Real-time monitoring',
    icon: 'store',
  },
  {
    label: 'Ad Creatives',
    value: '2.45M',
    change: '+15.3%',
    changeType: 'up',
    period: 'Updated daily',
    icon: 'megaphone',
  },
  {
    label: 'AI Credits Used',
    value: '180 / 1,000',
    change: '18%',
    changeType: 'up',
    period: 'Resets in 12 days',
    icon: 'target',
  },
];

export interface ProblemSolver {
  title: string;
  subtitle: string;
  icon: 'search' | 'store' | 'ad' | 'ai' | 'pen';
  href: string;
}

export const MOCK_PROBLEM_SOLVERS: ProblemSolver[] = [
  {
    title: 'Find a product to sell',
    subtitle: 'High demand, low competition opportunities',
    icon: 'search',
    href: '/dashboard/shopify/winning-products',
  },
  {
    title: 'Validate a product idea',
    subtitle: 'Analyze saturation, margin, & trend index',
    icon: 'pen',
    href: '/dashboard/shopify/product-research',
  },
  {
    title: 'Analyze competitor store',
    subtitle: 'Track revenues, best-sellers, & themes',
    icon: 'store',
    href: '/dashboard/shopify/store-explorer',
  },
  {
    title: 'Find winning ad creatives',
    subtitle: 'High performing hooks & formats library',
    icon: 'ad',
    href: '/dashboard/shopify/ad-library',
  },
  {
    title: 'Generate copy with AI',
    subtitle: 'Create ad copies & description sets',
    icon: 'ai',
    href: '/dashboard/shopify/copy-studio',
  },
];

export interface TrendingNiche {
  name: string;
  demand: number;
  growth: string;
  opportunity: 'Very High' | 'High' | 'Medium' | 'Low';
  competition: 'Low' | 'Medium' | 'High';
}

export const MOCK_TRENDING_NICHES: TrendingNiche[] = [
  { name: 'Eco-Kitchenware', demand: 98, growth: '42%', opportunity: 'Very High', competition: 'Low' },
  { name: 'Organic Beauty & Oils', demand: 94, growth: '38%', opportunity: 'Very High', competition: 'Low' },
  { name: 'Home Gym Equipment', demand: 91, growth: '35%', opportunity: 'High', competition: 'Medium' },
  { name: 'Orthopedic Pet Beds', demand: 88, growth: '31%', opportunity: 'High', competition: 'Low' },
  { name: 'Smart Baby Monitors', demand: 85, growth: '28%', opportunity: 'Medium', competition: 'Medium' },
  { name: 'Ergonomic Desk Tools', demand: 78, growth: '24%', opportunity: 'Medium', competition: 'Low' },
  { name: 'LED Accent Lighting', demand: 76, growth: '18%', opportunity: 'Medium', competition: 'High' },
];

export interface WinningProduct {
  id: string;
  name: string;
  image: string;
  price: string;
  cost: string;
  margin: string;
  demand: number;
  adSaturation: 'Low' | 'Medium' | 'High';
  growth: 'up' | 'down' | 'flat';
  score: number;
  reason: string;
}

export const MOCK_WINNING_PRODUCTS: WinningProduct[] = [
  {
    id: '1',
    name: 'Portable Blender Pro',
    image: '🥤',
    price: '$28.45',
    cost: '$8.20',
    margin: '71%',
    demand: 98,
    adSaturation: 'Low',
    growth: 'up',
    score: 94,
    reason: 'Exploding TikTok search volume, high gross margins, and low ad costs.',
  },
  {
    id: '2',
    name: 'Ultrasonic Facial Brush',
    image: '🧴',
    price: '$19.99',
    cost: '$4.50',
    margin: '77%',
    demand: 94,
    adSaturation: 'Low',
    growth: 'up',
    score: 91,
    reason: 'Strong Facebook ad engagement spikes, highly giftable niche, strong margins.',
  },
  {
    id: '3',
    name: 'Adjustable Dumbbell Set',
    image: '🏋️',
    price: '$129.99',
    cost: '$45.00',
    margin: '65%',
    demand: 92,
    adSaturation: 'Medium',
    growth: 'up',
    score: 88,
    reason: 'Consistent search volume growth year-over-year. High ticket item.',
  },
  {
    id: '4',
    name: 'Quiet Pet Grooming Vacuum',
    image: '🐕',
    price: '$69.95',
    cost: '$18.50',
    margin: '73%',
    demand: 89,
    adSaturation: 'Low',
    growth: 'up',
    score: 87,
    reason: 'Solves a clear pain point for pet owners. Video creatives have high viral index.',
  },
  {
    id: '5',
    name: 'Cordless Neck Massager',
    image: '💆',
    price: '$39.95',
    cost: '$11.20',
    margin: '72%',
    demand: 87,
    adSaturation: 'Medium',
    growth: 'up',
    score: 85,
    reason: 'Proven seller returning to trend list as holiday/office gifting begins.',
  },
];

export interface TopStore {
  id: string;
  name: string;
  logo: string;
  niche: string;
  revenue: string;
  growth: string;
  theme: string;
  adsCount: number;
}

export const MOCK_TOP_STORES: TopStore[] = [
  { id: '1', name: 'Pawfect Essentials', logo: '🐾', niche: 'Pets', revenue: '$148.4K', growth: '45%', theme: 'Impulse', adsCount: 18 },
  { id: '2', name: 'Glow Derm Co', logo: '✨', niche: 'Beauty', revenue: '$98.2K', growth: '38%', theme: 'Sense', adsCount: 12 },
  { id: '3', name: 'Flex & Fit Studio', logo: '💪', niche: 'Fitness', revenue: '$87.6K', growth: '34%', theme: 'Dawn', adsCount: 9 },
  { id: '4', name: 'Kitchenify Store', logo: '🏠', niche: 'Home & Kitchen', revenue: '$76.8K', growth: '31%', theme: 'Refresh', adsCount: 15 },
  { id: '5', name: 'Vibe Wear Labs', logo: '👗', niche: 'Fashion', revenue: '$65.3K', growth: '27%', theme: 'Custom', adsCount: 22 },
];

export interface AdWinner {
  id: string;
  hookText: string;
  thumbnail: string;
  likes: string;
  views: string;
  format: 'Video' | 'Image';
  platform: 'TikTok' | 'Facebook' | 'Instagram';
  angle: string;
}

export const MOCK_AD_WINNERS: AdWinner[] = [
  { id: '1', hookText: 'Blend anywhere, fresh everywhere.', thumbnail: '🥤', likes: '314K', views: '2.1M', format: 'Video', platform: 'TikTok', angle: 'Product demonstration' },
  { id: '2', hookText: 'The skin tool you didn\'t know you needed.', thumbnail: '🧴', likes: '198K', views: '1.6M', format: 'Video', platform: 'Instagram', angle: 'Before/After hook' },
  { id: '3', hookText: 'Your entire home gym in just two dumbbells.', thumbnail: '🏋️', likes: '254K', views: '2.4M', format: 'Video', platform: 'Facebook', angle: 'Space-saving benefit' },
  { id: '4', hookText: 'Say goodbye to expensive groomers.', thumbnail: '🐕', likes: '187K', views: '1.2M', format: 'Image', platform: 'Facebook', angle: 'Cost-saving comparison' },
];

export interface StoreDesign {
  id: string;
  name: string;
  heroText: string;
  thumbnail: string;
  revenue: string;
  niche: string;
  themeName: string;
  conversions: number;
  trend: string;
}

export const TRENDING_STORE_DESIGN: StoreDesign = {
  id: 'trending-1',
  name: 'Be Yours',
  heroText: 'Be Your Own Kind of Beautiful.',
  thumbnail: '/mocks/designs/store_trending_beyours.png',
  revenue: '$214.8K',
  niche: 'Fashion',
  themeName: 'Custom',
  conversions: 96,
  trend: '+18%'
};

export const MOCK_STORE_DESIGNS: StoreDesign[] = [
  { 
    id: '1', 
    name: 'Blendora', 
    heroText: 'Blend Better. Live Better.',
    thumbnail: '/mocks/designs/store_blendora.png', 
    revenue: '$128.4K', 
    niche: 'Home & Kitchen', 
    themeName: 'Dawn', 
    conversions: 94,
    trend: '+14%'
  },
  { 
    id: '2', 
    name: 'Luméa Skin', 
    heroText: 'Unleash Your Natural Glow',
    thumbnail: '/mocks/designs/store_lumea.png', 
    revenue: '$97.6K', 
    niche: 'Beauty & Skincare', 
    themeName: 'Prestige', 
    conversions: 92,
    trend: '+11%'
  },
  { 
    id: '3', 
    name: 'Naturae Living', 
    heroText: 'Earthy goods for a better home',
    thumbnail: '/mocks/designs/store_naturae.png', 
    revenue: '$86.3K', 
    niche: 'Home & Garden', 
    themeName: 'Impulse', 
    conversions: 91,
    trend: '+8%'
  },
  { 
    id: '4', 
    name: 'Gymzate', 
    heroText: 'Stronger Every Day',
    thumbnail: '/mocks/designs/store_gymzate.png', 
    revenue: '$112.7K', 
    niche: 'Fitness', 
    themeName: 'Turbo', 
    conversions: 90,
    trend: '+15%'
  },
  { 
    id: '5', 
    name: 'Pawfectly', 
    heroText: 'Happy pets, happy life.',
    thumbnail: '/mocks/designs/store_pawfectly.png', 
    revenue: '$71.2K', 
    niche: 'Pets', 
    themeName: 'Dawn', 
    conversions: 89,
    trend: '+6%'
  },
  { 
    id: '6', 
    name: 'Vestré', 
    heroText: 'Timeless Style. Modern You.',
    thumbnail: '/mocks/designs/store_vestre.png', 
    revenue: '$93.1K', 
    niche: 'Fashion', 
    themeName: 'Prestige', 
    conversions: 88,
    trend: '+9%'
  },
];
