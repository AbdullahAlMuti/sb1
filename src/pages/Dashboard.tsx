import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CalendarIcon,
  Package,
  Activity,
  Layers,
  Plus,
  Sparkles,
  BarChart3,
  PieChartIcon,
  Target,
  Minus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subDays, subWeeks, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { motion } from 'framer-motion';
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton';
import { useWhatsAppConfig } from '@/hooks/useWhatsAppConfig';
import { applyWhatsAppTemplate } from '@/lib/whatsapp';

type DateRangePreset = 'today' | 'week' | 'month' | 'year';

interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DashboardStats {
  totalProfit: number;
  completedOrders: number;
  pendingOrders: number;
  unreadAlerts: number;
  activeListings: number;
  profitChange: number;
  ordersChange: number;
  totalRevenue: number;
  totalCost: number;
  previousProfit: number;
  previousRevenue: number;
}

interface TrendData {
  name: string;
  profit: number;
  orders: number;
  revenue: number;
}

interface TopProduct {
  id: string;
  title: string;
  sku: string;
  ebay_price: number;
  amazon_price: number;
  profit: number;
  status: string;
  image_url?: string;
}

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
} as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { planName } = useSubscription();
  const { data: whatsappConfig } = useWhatsAppConfig();
  
  const [datePreset, setDatePreset] = useState<DateRangePreset>('month');
  const [stats, setStats] = useState<DashboardStats>({
    totalProfit: 0,
    completedOrders: 0,
    pendingOrders: 0,
    unreadAlerts: 0,
    activeListings: 0,
    profitChange: 0,
    ordersChange: 0,
    totalRevenue: 0,
    totalCost: 0,
    previousProfit: 0,
    previousRevenue: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  // Get the effective date range based on preset
  const getEffectiveDateRange = useCallback((): DateRangeValue => {
    const now = new Date();
    switch (datePreset) {
      case 'today': 
        return { from: startOfDay(now), to: now };
      case 'week': 
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
      case 'month': 
        return { from: startOfMonth(now), to: now };
      case 'year': 
        return { from: startOfYear(now), to: now };
      default: 
        return { from: startOfMonth(now), to: now };
    }
  }, [datePreset]);

  // Get previous period date range for comparison
  const getPreviousDateRange = useCallback((): DateRangeValue => {
    const currentRange = getEffectiveDateRange();
    const daysDiff = differenceInDays(currentRange.to, currentRange.from);
    
    switch (datePreset) {
      case 'today':
        return { from: subDays(currentRange.from, 1), to: subDays(currentRange.to, 1) };
      case 'week':
        return { from: subWeeks(currentRange.from, 1), to: subWeeks(currentRange.to, 1) };
      case 'month':
        return { from: subMonths(currentRange.from, 1), to: subMonths(currentRange.to, 1) };
      case 'year':
        return { from: subYears(currentRange.from, 1), to: subYears(currentRange.to, 1) };
      default:
        return { from: subMonths(currentRange.from, 1), to: subMonths(currentRange.to, 1) };
    }
  }, [datePreset, getEffectiveDateRange]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const dateRange = getEffectiveDateRange();
      const previousRange = getPreviousDateRange();

      const [
        listingsResult,
        alertsResult,
        topListingsResult,
        allListingsResult,
        // eBay Orders from extension sync
        currentEbayOrdersResult,
        previousEbayOrdersResult,
      ] = await Promise.all([
        // Active listings count
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active'),
        // Unread alerts count
        supabase
          .from('inventory_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'UNREAD'),
        // Top listings
        supabase
          .from('listings')
          .select('*')
          .eq('user_id', user.id)
          .order('ebay_price', { ascending: false })
          .limit(5),
        // All listings for revenue calculation
        supabase
          .from('listings')
          .select('ebay_price, amazon_price, status')
          .eq('user_id', user.id),
        // Current period eBay orders (synced from extension) - use explicit cast
        supabase
          .from('ebay_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .gte('order_date', dateRange.from.toISOString())
          .lte('order_date', dateRange.to.toISOString()) as any,
        // Previous period eBay orders for comparison
        supabase
          .from('ebay_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .gte('order_date', previousRange.from.toISOString())
          .lte('order_date', previousRange.to.toISOString()) as any,
      ]);

      const listings = topListingsResult.data || [];
      const allListings = allListingsResult.data || [];
      
      // eBay orders from extension sync (typed locally)
      interface EbayOrderRow {
        order_status?: string;
        total_amount?: number;
        order_date?: string;
        created_at?: string;
      }
      const currentEbayOrders: EbayOrderRow[] = (currentEbayOrdersResult as any)?.data || [];
      const previousEbayOrders: EbayOrderRow[] = (previousEbayOrdersResult as any)?.data || [];
      
      // Calculate eBay orders stats (from extension sync)
      const completedEbayOrders = currentEbayOrders.filter(o => 
        ['completed', 'shipped', 'paid'].includes((o.order_status || '').toLowerCase())
      );
      const pendingEbayOrders = currentEbayOrders.filter(o => 
        ['pending', 'awaiting payment', 'processing'].includes((o.order_status || '').toLowerCase())
      );
      const ebayOrdersRevenue = currentEbayOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      
      // Combine stats: use eBay orders
      const totalCompletedOrders = completedEbayOrders.length;
      const totalPendingOrders = pendingEbayOrders.length;
      const totalProfit = ebayOrdersRevenue * 0.15; // Estimate 15% margin
      
      // Calculate revenue from all listings
      const totalRevenue = allListings.reduce((acc, l) => acc + (Number(l.ebay_price) || 0), 0);
      const totalCost = allListings.reduce((acc, l) => acc + (Number(l.amazon_price) || 0), 0);

      // Calculate previous period stats for comparison
      const previousEbayRevenue = previousEbayOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      const previousProfit = previousEbayRevenue * 0.15;
      const previousTotalOrders = previousEbayOrders.length;

      // Calculate percentage changes
      const profitChange = previousProfit > 0 
        ? Math.round(((totalProfit - previousProfit) / previousProfit) * 100 * 10) / 10
        : totalProfit > 0 ? 100 : 0;
      
      const currentTotalOrders = currentEbayOrders.length;
      const ordersChange = previousTotalOrders > 0
        ? Math.round(((currentTotalOrders - previousTotalOrders) / previousTotalOrders) * 100 * 10) / 10
        : currentTotalOrders > 0 ? 100 : 0;

      // Generate real trend data based on eBay orders
      const ordersForTrend = currentEbayOrders.map(o => ({
            ...o,
            created_at: o.order_date || o.created_at,
            status: (o.order_status || '').toLowerCase().includes('completed') || 
                    (o.order_status || '').toLowerCase().includes('shipped') ? 'COMPLETED' : 'PENDING',
            profit: (Number(o.total_amount) || 0) * 0.15,
            item_price: Number(o.total_amount) || 0,
          }));
      const trendDataGenerated = generateRealTrendData(ordersForTrend, dateRange);

      // Transform top listings
      const topProductsData: TopProduct[] = listings.map((l: any) => ({
        id: l.id,
        title: l.title || 'Untitled Product',
        sku: l.sku || l.amazon_asin || 'N/A',
        ebay_price: Number(l.ebay_price) || 0,
        amazon_price: Number(l.amazon_price) || 0,
        profit: (Number(l.ebay_price) || 0) - (Number(l.amazon_price) || 0),
        status: l.status || 'unknown',
        image_url: l.amazon_data?.image || l.amazon_data?.imageUrl || l.amazon_data?.mainImage,
      }));

      setStats({
        totalProfit,
        completedOrders: totalCompletedOrders,
        pendingOrders: totalPendingOrders,
        unreadAlerts: alertsResult.count || 0,
        activeListings: listingsResult.count || 0,
        profitChange,
        ordersChange,
        totalRevenue: ebayOrdersRevenue > 0 ? ebayOrdersRevenue : totalRevenue,
        totalCost,
        previousProfit,
        previousRevenue: previousEbayRevenue,
      });

      // Store combined orders for charts (eBay orders preferred if available)
      setAllOrders(ordersForTrend);
      setTopProducts(topProductsData);
      setTrendData(trendDataGenerated);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getEffectiveDateRange, getPreviousDateRange]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Generate real trend data from actual orders
  const generateRealTrendData = (orders: any[], range: DateRangeValue): TrendData[] => {
    const daysDiff = differenceInDays(range.to, range.from);
    
    let intervals: Date[];
    let formatStr: string;
    
    if (daysDiff <= 1) {
      // For today, show hourly data (6 hour buckets)
      intervals = [
        new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 0),
        new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 6),
        new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 12),
        new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 18),
      ];
      formatStr = 'ha';
    } else if (daysDiff <= 7) {
      intervals = eachDayOfInterval({ start: range.from, end: range.to });
      formatStr = 'EEE';
    } else if (daysDiff <= 31) {
      intervals = eachWeekOfInterval({ start: range.from, end: range.to });
      formatStr = "'Week' w";
    } else {
      intervals = eachMonthOfInterval({ start: range.from, end: range.to });
      formatStr = 'MMM';
    }

    return intervals.map((intervalStart, index) => {
      const intervalEnd = intervals[index + 1] || range.to;
      
      // Filter orders within this interval
      const intervalOrders = orders.filter(order => {
        const orderDate = parseISO(order.created_at);
        return orderDate >= intervalStart && orderDate < intervalEnd;
      });

      const completedInInterval = intervalOrders.filter(o => o.status === 'COMPLETED');
      const profit = completedInInterval.reduce((acc, o) => acc + (Number(o.profit) || 0), 0);
      const revenue = completedInInterval.reduce((acc, o) => acc + (Number(o.item_price) || 0), 0);

      return {
        name: format(intervalStart, formatStr),
        profit: Math.round(profit * 100) / 100,
        orders: intervalOrders.length,
        revenue: Math.round(revenue * 100) / 100,
      };
    });
  };

  // Calculate performance percentage from real data
  const performanceData = useMemo(() => {
    const total = stats.completedOrders + stats.pendingOrders;
    const successRate = total > 0 ? Math.round((stats.completedOrders / total) * 100) : 0;
    return [
      { name: 'Performance', value: successRate, fill: 'hsl(var(--primary))' },
    ];
  }, [stats]);

  // Calculate change in performance vs previous period
  const performanceChange = useMemo(() => {
    // If we have orders, compare completion rate
    const currentRate = stats.completedOrders + stats.pendingOrders > 0
      ? (stats.completedOrders / (stats.completedOrders + stats.pendingOrders)) * 100
      : 0;
    return stats.ordersChange;
  }, [stats]);

  // Donut chart data for revenue breakdown - only show if we have data
  const revenueBreakdown = useMemo(() => {
    if (stats.totalRevenue === 0 && stats.totalCost === 0) {
      return [
        { name: 'No Data', value: 1, fill: 'hsl(var(--muted))' },
      ];
    }
    return [
      { name: 'Revenue', value: stats.totalRevenue, fill: 'hsl(var(--primary))' },
      { name: 'Cost', value: stats.totalCost, fill: 'hsl(var(--muted))' },
    ];
  }, [stats]);

  // Calculate net profit change
  const netProfitChange = useMemo(() => {
    const currentNet = stats.totalRevenue - stats.totalCost;
    const previousNet = stats.previousRevenue || 0;
    if (previousNet === 0) return currentNet > 0 ? 100 : 0;
    return Math.round(((currentNet - previousNet) / previousNet) * 100 * 10) / 10;
  }, [stats]);

  // Generate mini bar chart data from recent trend
  const miniBarData = useMemo(() => {
    if (trendData.length === 0) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
    const recentTrend = trendData.slice(-7);
    const maxProfit = Math.max(...recentTrend.map(t => t.profit), 1);
    return recentTrend.map(t => Math.round((t.profit / maxProfit) * 100) || 5);
  }, [trendData]);

  const getProductStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium shadow-none">
            Active
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-medium shadow-none">
            Out of Stock
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium shadow-none">
            Draft
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px] shadow-none">{status || 'Unknown'}</Badge>;
    }
  };

  // Render change badge
  const renderChangeBadge = (change: number, showWhenZero = false) => {
    if (change === 0 && !showWhenZero) {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
          <Minus className="h-3 w-3" />
          No change
        </span>
      );
    }
    
    const isPositive = change >= 0;
    return (
      <span className={cn(
        "text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full",
        isPositive 
          ? "text-emerald-600 bg-emerald-500/10" 
          : "text-destructive bg-destructive/10"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{change}%
      </span>
    );
  };

  const insufficientCredits = (profile?.credits || 0) < 1;

  return (
    <motion.div 
      className="space-y-8 max-w-7xl mx-auto pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your sales and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {whatsappConfig?.whatsapp_dashboard_enabled && whatsappConfig?.support_whatsapp_number && (
            <WhatsAppButton
              phone_number={whatsappConfig.support_whatsapp_number}
              message={applyWhatsAppTemplate(
                whatsappConfig.whatsapp_dashboard_template || 'Hi, I need help.',
                { customer_name: profile?.full_name }
              )}
            />
          )}
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2 px-4 rounded-xl border-border/60 bg-card/50 hover:bg-card shadow-sm"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{datePreset.charAt(0).toUpperCase() + datePreset.slice(1)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 rounded-xl" align="end">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['today', 'week', 'month', 'year'] as const).map((preset) => (
                    <Button
                      key={preset}
                      variant={datePreset === preset ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        "h-9 text-xs rounded-lg transition-all",
                        datePreset === preset && "shadow-md"
                      )}
                      onClick={() => handlePresetChange(preset)}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Listing Button */}
          <Button 
            size="sm" 
            className="h-9 gap-2 px-4 rounded-xl shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90"
            onClick={() => navigate('/dashboard/listings')}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Listing</span>
          </Button>
        </div>
      </motion.div>

      {/* Insufficient Credits Warning */}
      {insufficientCredits && (
        <motion.div 
          variants={itemVariants}
          className="bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent border border-destructive/20 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-sm"
        >
          <div className="p-2.5 rounded-xl bg-destructive/15">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Credits Running Low
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upgrade your plan to continue creating listings.
            </p>
          </div>
          <Button 
            size="sm" 
            className="rounded-xl shadow-md flex-shrink-0"
            onClick={() => navigate('/dashboard/subscription')}
          >
            Upgrade Now
          </Button>
        </motion.div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Product Overview Card */}
        <motion.div 
          variants={itemVariants}
          className="group bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Product Overview</span>
            </div>
          </div>
          
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total inventory value</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Active products</span>
              <span className="text-sm font-semibold text-foreground">{stats.activeListings}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 rounded-lg px-2.5 py-1 shadow-none">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {stats.activeListings} Listings
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1.5 rounded-lg px-2.5 py-1 shadow-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {stats.completedOrders + stats.pendingOrders} Orders
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Active Sales Card */}
        <motion.div 
          variants={itemVariants}
          className="group bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-foreground">Total Profit</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">vs previous period</span>
                {renderChangeBadge(stats.profitChange)}
              </div>
            </div>
            
            {/* Mini bar chart from real data */}
            {miniBarData.some(v => v > 5) ? (
              <div className="flex items-end gap-1.5 h-16">
                {miniBarData.map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                    className="w-2.5 bg-gradient-to-t from-primary to-primary/70 rounded-sm min-h-[4px]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-muted/30">
                <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-5 text-xs text-muted-foreground hover:text-foreground rounded-xl group-hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/dashboard/orders')}
          >
            View Orders 
            <ArrowUpRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </motion.div>

        {/* Net Profit Card with Donut */}
        <motion.div 
          variants={itemVariants}
          className="group bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-violet-500/10">
              <PieChartIcon className="h-4 w-4 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-foreground">Net Margin</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-bold tracking-tight",
                  (stats.totalRevenue - stats.totalCost) >= 0 ? "text-foreground" : "text-destructive"
                )}>
                  ${(stats.totalRevenue - stats.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Potential profit</span>
                {stats.totalRevenue > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    ({Math.round(((stats.totalRevenue - stats.totalCost) / stats.totalRevenue) * 100)}% margin)
                  </span>
                )}
              </div>
            </div>
            
            {/* Mini donut chart */}
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={18}
                    outerRadius={28}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-5 text-xs text-muted-foreground hover:text-foreground rounded-xl group-hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/dashboard/listings')}
          >
            View Listings 
            <ArrowUpRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart - Takes 2 columns */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-base font-semibold text-foreground">Profit Trend</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {datePreset === 'today' ? 'Today' : 
               datePreset === 'week' ? 'This Week' :
               datePreset === 'month' ? 'This Month' : 'This Year'}
            </span>
          </div>

          {/* Stats above chart */}
          <div className="flex items-center gap-8 mb-6 pb-6 border-b border-border/50">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  ${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {renderChangeBadge(stats.profitChange)}
              </div>
              <span className="text-xs text-muted-foreground">Total Profit</span>
            </div>
            <div className="w-px h-10 bg-border/50" />
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.completedOrders + stats.pendingOrders}
                </span>
                {renderChangeBadge(stats.ordersChange)}
              </div>
              <span className="text-xs text-muted-foreground">Total Orders</span>
            </div>
          </div>
          
          <div className="h-[280px]">
            {trendData.length > 0 && trendData.some(t => t.profit > 0 || t.orders > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                    dx={-5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorProfitGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                  <Activity className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No order data yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Complete some orders to see your profit trend</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sales Performance Radial */}
        <motion.div 
          variants={itemVariants}
          className="bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <Target className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-base font-semibold text-foreground">Order Success Rate</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="65%" 
                  outerRadius="100%" 
                  data={performanceData}
                  startAngle={180}
                  endAngle={-180}
                >
                  <RadialBar
                    background={{ fill: 'hsl(var(--muted))' }}
                    dataKey="value"
                    cornerRadius={12}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  {performanceData[0]?.value || 0}%
                </span>
                {(stats.completedOrders + stats.pendingOrders) > 0 && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {stats.completedOrders} / {stats.completedOrders + stats.pendingOrders}
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              {(stats.completedOrders + stats.pendingOrders) === 0 
                ? 'No orders in this period'
                : 'Completed vs Total Orders'}
            </p>
            
            <div className="flex items-center gap-5 mt-5 pt-5 border-t border-border/50 w-full justify-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Completed ({stats.completedOrders})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">Pending ({stats.pendingOrders})</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <motion.div 
          variants={itemVariants}
          className="space-y-5"
        >
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Package className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.activeListings}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active Listings</p>
            </div>
            <div className="bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/15 transition-colors">
                  <Bell className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.unreadAlerts}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pending Alerts</p>
            </div>
          </div>

          {/* Orders Overview */}
          <div className="bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Orders Overview</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-lg" 
                onClick={() => navigate('/dashboard/orders')}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{stats.completedOrders}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{stats.pendingOrders}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Products Table */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10">
                <Layers className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-base font-semibold text-foreground">Top Products</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
              onClick={() => navigate('/dashboard/listings')}
            >
              View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Product</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">SKU</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">Price</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">Profit</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-2xl bg-muted/50">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">No products yet</p>
                          <p className="text-xs text-muted-foreground/70">Start by adding your first listing</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2 rounded-xl shadow-md"
                          onClick={() => navigate('/dashboard/listings')}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add Listings
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate('/dashboard/listings')}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-1 max-w-[180px]">{product.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                          {product.sku.slice(0, 10)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-sm font-semibold text-foreground">${product.ebay_price.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-4">
                        <span className={cn(
                          "text-sm font-semibold",
                          product.profit >= 0 ? "text-emerald-600" : "text-destructive"
                        )}>
                          {product.profit >= 0 ? '+' : ''}${product.profit.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        {getProductStatusBadge(product.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
