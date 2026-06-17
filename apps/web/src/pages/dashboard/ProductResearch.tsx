import { useState, useEffect } from 'react';
import { FeatureGate, useFeatureGate, TeaserWrapper } from '@/components/FeatureGate';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target, 
  Zap,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductAnalysis {
  marketDemand: 'high' | 'medium' | 'low';
  competitionLevel: 'high' | 'medium' | 'low';
  profitPotential: 'high' | 'medium' | 'low';
  trendingStatus: string;
  summary: string;
}

interface ProductRecommendation {
  title: string;
  estimatedSellPrice: number;
  estimatedSourcePrice: number;
  estimatedProfit: number;
  profitMargin: number;
  demandScore: number;
  competitionScore: number;
  sourceRecommendation: string;
  keyFeatures: string[];
  tips: string;
}

interface ResearchResult {
  analysis: ProductAnalysis;
  products: ProductRecommendation[];
}

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'toys-games', label: 'Toys & Games' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'beauty', label: 'Beauty & Health' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'collectibles', label: 'Collectibles' },
];

const priceRanges = [
  { value: '0-25', label: '$0 - $25' },
  { value: '25-50', label: '$25 - $50' },
  { value: '50-100', label: '$50 - $100' },
  { value: '100-250', label: '$100 - $250' },
  { value: '250+', label: '$250+' },
];

const MOCK_TRIAL_RESEARCH_RESULTS: ResearchResult = {
  analysis: {
    marketDemand: 'high',
    competitionLevel: 'medium',
    profitPotential: 'high',
    trendingStatus: 'trending up',
    summary: 'Wireless Earbuds represent a highly lucrative market segment with consistent upward search volume. Competition is moderate on eBay, but strong profit margins can be captured by sourcing from verified wholesale suppliers and leveraging optimized listings with targeted keywords.'
  },
  products: [
    {
      title: 'Premium Noise-Cancelling Wireless Earbuds (Black)',
      estimatedSellPrice: 39.99,
      estimatedSourcePrice: 15.50,
      estimatedProfit: 24.49,
      profitMargin: 61,
      demandScore: 88,
      competitionScore: 45,
      sourceRecommendation: 'Amazon Supplier',
      keyFeatures: ['Active Noise Cancelling', '30hr Battery Life', 'Bluetooth 5.3', 'IPX7 Waterproof'],
      tips: 'List this item with keywords like "ANC Earbuds", "Wireless Earphones", and highlight the water-resistance for workout users.'
    },
    {
      title: 'Ultra-Lightweight Sport Wireless Earbuds (Red/Black)',
      estimatedSellPrice: 29.99,
      estimatedSourcePrice: 11.20,
      estimatedProfit: 18.79,
      profitMargin: 62,
      demandScore: 78,
      competitionScore: 38,
      sourceRecommendation: 'Walmart Supplier',
      keyFeatures: ['Earhooks', 'Hi-Fi Stereo', '10hr Playtime', 'Built-in Mic'],
      tips: 'Target fitness enthusiasts. Sourcing packaging in bulk drops shipping costs by 12%.'
    },
    {
      title: 'Mini Bluetooth Wireless Earbuds with LED Charging Case',
      estimatedSellPrice: 24.99,
      estimatedSourcePrice: 8.50,
      estimatedProfit: 16.49,
      profitMargin: 66,
      demandScore: 92,
      competitionScore: 65,
      sourceRecommendation: 'Amazon Wholesale',
      keyFeatures: ['LED Battery Display', 'Touch Control', 'Pocket Size'],
      tips: 'Very high demand. Focus on the pocket-sized convenience and the visual LED indicator in your eBay gallery images.'
    },
    {
      title: 'Gaming low-latency Wireless Earbuds with RGB Lights',
      estimatedSellPrice: 45.00,
      estimatedSourcePrice: 18.00,
      estimatedProfit: 27.00,
      profitMargin: 60,
      demandScore: 71,
      competitionScore: 50,
      sourceRecommendation: 'Walmart Electronics',
      keyFeatures: ['45ms Low Latency', 'RGB Breathing Light', 'Dual Modes'],
      tips: 'Position as a gaming accessory. Key keywords include "Low Latency Bluetooth Earbuds" and "RGB Earbuds".'
    },
    {
      title: 'Pro Audiophile Wireless Earbuds with Dual Drivers',
      estimatedSellPrice: 59.99,
      estimatedSourcePrice: 25.00,
      estimatedProfit: 34.99,
      profitMargin: 58,
      demandScore: 65,
      competitionScore: 30,
      sourceRecommendation: 'Amazon Premium',
      keyFeatures: ['Dual Drivers', 'Hi-Res Audio', 'Hybrid ANC', '6 Mics'],
      tips: 'Premium category. Highlight sound quality and hybrid active noise cancellation to justify the higher selling price.'
    }
  ]
};

export default function ProductResearch() {
  return (
    <FeatureGate flag="ai_product_research">
      <ProductResearchContent />
    </FeatureGate>
  );
}

function ProductResearchContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResearchResult | null>(null);
  
  const { isTrialing, gateAction } = useFeatureGate();

  const ANY_OPTION_VALUE = '__any__';

  useEffect(() => {
    if (isTrialing) {
      setResults(MOCK_TRIAL_RESEARCH_RESULTS);
      setSearchQuery('Wireless Earbuds');
    }
  }, [isTrialing]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a product or niche to research');
      return;
    }

    setIsSearching(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-product-research', {
        body: { 
          query: searchQuery, 
          category: category || undefined,
          priceRange: priceRange || undefined
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults(data);
      toast.success('Research complete!');
    } catch (err) {
      console.error('Research error:', err);
      toast.error('Failed to complete research. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (status: string) => {
    if (status.includes('up')) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (status.includes('down')) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-yellow-400" />;
  };

  const getSourceColor = (source: string) => {
    if (source.toLowerCase().includes('amazon')) return 'bg-amazon/20 text-amazon';
    if (source.toLowerCase().includes('walmart')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-purple-500/20 text-purple-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center animate-flame-flicker">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Product Research</h1>
            <p className="text-muted-foreground">Find profitable products with AI-powered market analysis</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Research a Product Niche
          </CardTitle>
          <CardDescription>
            Enter a product, niche, or keyword to discover profitable opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="e.g., Wireless earbuds, Kitchen gadgets, Pet accessories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && gateAction(handleSearch)}
                className="h-12"
              />
            </div>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value === ANY_OPTION_VALUE ? undefined : value)}
            >
              <SelectTrigger className="w-full md:w-48 h-12">
                <SelectValue placeholder="Any Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_OPTION_VALUE}>Any Category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priceRange}
              onValueChange={(value) => setPriceRange(value === ANY_OPTION_VALUE ? undefined : value)}
            >
              <SelectTrigger className="w-full md:w-40 h-12">
                <SelectValue placeholder="Any Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_OPTION_VALUE}>Any Price</SelectItem>
                {priceRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => gateAction(handleSearch)} 
              disabled={isSearching}
              className="h-12 px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isSearching ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Research
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !isSearching && (
        <div className="space-y-6">
          {/* Market Analysis Overview */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Market Analysis: {searchQuery}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Market Demand</p>
                  <Badge className={getLevelColor(results.analysis.marketDemand)}>
                    {results.analysis.marketDemand.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Competition</p>
                  <Badge className={getLevelColor(results.analysis.competitionLevel)}>
                    {results.analysis.competitionLevel.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Profit Potential</p>
                  <Badge className={getLevelColor(results.analysis.profitPotential)}>
                    {results.analysis.profitPotential.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Trend</p>
                  <div className="flex items-center justify-center gap-1">
                    {getTrendIcon(results.analysis.trendingStatus)}
                    <span className="text-sm font-medium capitalize">{results.analysis.trendingStatus}</span>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground bg-muted/30 p-4 rounded-lg">
                {results.analysis.summary}
              </p>
            </CardContent>
          </Card>

          {/* Product Recommendations */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Product Recommendations
            </h2>
            <TeaserWrapper 
              totalCount={results.products.length} 
              feature="product recommendations" 
              containerClassName="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {results.products.map((product, index) => (
                <Card key={index} className="hover:border-primary/50 transition-colors overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium leading-tight">
                        {product.title}
                      </CardTitle>
                      <Badge className={getSourceColor(product.sourceRecommendation)}>
                        {product.sourceRecommendation}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Pricing Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="text-lg font-bold text-foreground">${product.estimatedSourcePrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Sell Price</p>
                        <p className="text-lg font-bold text-foreground">${product.estimatedSellPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-400">Profit</p>
                        <p className="text-lg font-bold text-green-400">${product.estimatedProfit.toFixed(2)}</p>
                        <p className="text-xs text-green-400/70">{product.profitMargin}%</p>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Demand</span>
                          <span className="text-foreground">{product.demandScore}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${product.demandScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Competition</span>
                          <span className="text-foreground">{product.competitionScore}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-red-400 rounded-full transition-all"
                            style={{ width: `${product.competitionScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    {product.keyFeatures && product.keyFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.keyFeatures.map((feature, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Tip */}
                    {product.tips && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-yellow-200/80">{product.tips}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TeaserWrapper>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results && !isSearching && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Start Your Research</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a product niche or keyword above to discover profitable opportunities with AI-powered market analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
