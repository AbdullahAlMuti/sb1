import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowUpRight,
  Package,
  Activity,
  Plus,
  BarChart3,
  Target,
  Minus,
  DollarSign,
  Truck,
  ShoppingCart,
  Gem,
} from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { supabase } from '@repo/api-client/supabase/client';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import {
  format,
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  differenceInDays, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, subDays, subWeeks, subMonths, subYears,
  parseISO, formatDistanceToNow,
} from 'date-fns';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { WhatsAppButton } from '@repo/ui/contact/WhatsAppButton';
import { useWhatsAppConfig } from '@repo/api-client/hooks/useWhatsAppConfig';
import { applyWhatsAppTemplate } from '@repo/utils/whatsapp';
import './dashboard-design.css';

/* ─────────────────────────── types ────────────────────────────────────── */

type DateRangePreset = 'today' | 'week' | 'month' | 'year';

interface DateRangeValue { from: Date; to: Date; }

interface DashboardStats {
  /** SUM(total_amount) from ebay_orders — confirmed by eBay */
  orderRevenue: number;
  /** SUM(ebay_price) from listings — potential, not actual */
  inventoryValue: number;
  /** SUM(amazon_price) from listings — sourcing cost estimate */
  totalCost: number;
  /** SUM(add_fee) where synced — null when no orders have been individually synced */
  netProfit: number | null;
  profitOrderCount: number;
  completedOrders: number;
  pendingOrders: number;
  unreadAlerts: number;
  activeListings: number;
  /** % change vs previous period, based on confirmed order revenue */
  revenueChange: number;
  ordersChange: number;
  previousOrderRevenue: number;
  /** max(synced_at) across fetched orders */
  lastSyncAt: Date | null;
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

/* ─────────────────────── sub-components ───────────────────────────────── */

function useCountUp(target: number, duration = 1100) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    let raf: number;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setVal(from + (target - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function CountMoney({ value }: { value: number }) {
  const v = useCountUp(value);
  return <span className="db-num">{v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

function Sparkline({ data, color = '#0e9f6e', id }: { data: number[]; color?: string; id: string }) {
  const W = 200, H = 44, pad = 3;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((d, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - ((d - min) / rng) * (H - pad * 2),
  ]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `${line} L ${W - pad} ${H} L ${pad} ${H} Z`;
  const gid = 'sg-' + id;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="db-spark-line" />
    </svg>
  );
}

function SvgDonut({ value, size = 160 }: { value: number; size?: number }) {
  const stroke = 15;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const [offset, setOffset] = useState(c);
  const displayVal = useCountUp(clamped);

  useEffect(() => {
    let raf1: number, raf2: number;
    setOffset(c);
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setOffset(c - (clamped / 100) * c));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [clamped, c]);

  return (
    <div className="db-donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--db-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--db-success)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.3, 0.8, 0.3, 1)' }}
        />
      </svg>
      <div className="db-donut-center">
        <span className="db-donut-pct db-num">{Math.round(displayVal)}%</span>
        <span className="db-donut-lab">completed</span>
      </div>
    </div>
  );
}

function Delta({ v }: { v: number }) {
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  return (
    <span className={`db-delta ${cls}`}>
      {v > 0 ? <TrendingUp size={11} /> : v < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
      <span className="db-num">{Math.abs(v).toFixed(1)}%</span>
    </span>
  );
}

/* ─────────────────────── main component ───────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { data: whatsappConfig } = useWhatsAppConfig();

  const [datePreset, setDatePreset] = useState<DateRangePreset>('month');
  const [stats, setStats] = useState<DashboardStats>({
    orderRevenue: 0, inventoryValue: 0, totalCost: 0,
    netProfit: null, profitOrderCount: 0,
    completedOrders: 0, pendingOrders: 0,
    unreadAlerts: 0, activeListings: 0,
    revenueChange: 0, ordersChange: 0, previousOrderRevenue: 0,
    lastSyncAt: null,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  /* ── date range helpers ─────────────────────────────────────────────── */

  const getEffectiveDateRange = useCallback((): DateRangeValue => {
    const now = new Date();
    switch (datePreset) {
      case 'today':  return { from: startOfDay(now), to: now };
      case 'week':   return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
      case 'month':  return { from: startOfMonth(now), to: now };
      case 'year':   return { from: startOfYear(now), to: now };
      default:       return { from: startOfMonth(now), to: now };
    }
  }, [datePreset]);

  const getPreviousDateRange = useCallback((): DateRangeValue => {
    const cur = getEffectiveDateRange();
    switch (datePreset) {
      case 'today':  return { from: subDays(cur.from, 1), to: subDays(cur.to, 1) };
      case 'week':   return { from: subWeeks(cur.from, 1), to: subWeeks(cur.to, 1) };
      case 'month':  return { from: subMonths(cur.from, 1), to: subMonths(cur.to, 1) };
      case 'year':   return { from: subYears(cur.from, 1), to: subYears(cur.to, 1) };
      default:       return { from: subMonths(cur.from, 1), to: subMonths(cur.to, 1) };
    }
  }, [datePreset, getEffectiveDateRange]);

  /* ── data fetching ──────────────────────────────────────────────────── */

  const generateRealTrendData = (orders: any[], range: DateRangeValue): TrendData[] => {
    const daysDiff = differenceInDays(range.to, range.from);
    let intervals: Date[];
    let formatStr: string;

    if (daysDiff <= 1) {
      intervals = [0, 6, 12, 18].map(h =>
        new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), h));
      formatStr = 'ha';
    } else if (daysDiff <= 7) {
      intervals = eachDayOfInterval({ start: range.from, end: range.to });
      formatStr = 'EEE';
    } else if (daysDiff <= 31) {
      intervals = eachWeekOfInterval({ start: range.from, end: range.to });
      formatStr = "'Wk' w";
    } else {
      intervals = eachMonthOfInterval({ start: range.from, end: range.to });
      formatStr = 'MMM';
    }

    return intervals.map((intervalStart, index) => {
      const intervalEnd = intervals[index + 1] || range.to;
      const inInterval = orders.filter(o => {
        const d = parseISO(o.created_at);
        return d >= intervalStart && d < intervalEnd;
      });
      // Revenue mirrors the headline "Confirmed by eBay" figure: item_price is the
      // per-order revenue from de-duplicated eBay rows (see groupOrders), summed
      // over every order in the interval regardless of status. (Filtering to
      // COMPLETED previously flattened the line to zero, since no order ever
      // carries that status.)
      const revenue = inInterval.reduce((acc, o) => acc + (Number(o.item_price) || 0), 0);
      const profit = inInterval
        .filter((o: any) => o.realProfit != null)
        .reduce((acc: number, o: any) => acc + Number(o.realProfit), 0);
      return {
        name: format(intervalStart, formatStr),
        profit: Math.round(profit * 100) / 100,
        orders: inInterval.length,
        revenue: Math.round(revenue * 100) / 100,
      };
    });
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const dateRange = getEffectiveDateRange();
      const previousRange = getPreviousDateRange();

      const [
        listingsResult, alertsResult, topListingsResult, allListingsResult,
        currentEbayOrdersResult, previousEbayOrdersResult,
      ] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('inventory_alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'UNREAD'),
        supabase.from('listings').select('id, title, sku, amazon_asin, ebay_price, amazon_price, status, amazon_data').eq('user_id', user.id).order('ebay_price', { ascending: false }).limit(5),
        supabase.from('listings').select('ebay_price, amazon_price, status').eq('user_id', user.id),
        (supabase.from('ebay_orders' as any).select('id, ebay_order_id, order_status, total_amount, order_date, net_profit, add_fee, synced_at').eq('user_id', user.id).gte('order_date', dateRange.from.toISOString()).lte('order_date', dateRange.to.toISOString())) as any,
        (supabase.from('ebay_orders' as any).select('id, ebay_order_id, order_status, total_amount, order_date').eq('user_id', user.id).gte('order_date', previousRange.from.toISOString()).lte('order_date', previousRange.to.toISOString())) as any,
      ]);

      const listings = topListingsResult.data || [];
      const allListings = allListingsResult.data || [];

      interface EbayOrderRow {
        id?: string;
        ebay_order_id?: string;
        order_status?: string;
        total_amount?: number;
        order_date?: string;
        net_profit?: number | null;
        add_fee?: number | null;
        synced_at?: string | null;
        created_at?: string;
      }
      const currentEbayOrders: EbayOrderRow[] = (currentEbayOrdersResult as any)?.data || [];
      const previousEbayOrders: EbayOrderRow[] = (previousEbayOrdersResult as any)?.data || [];

      /* ── de-duplicate eBay rows ────────────────────────────────────────
         eBay sales-record CSVs get re-imported, leaving multiple identical
         line rows per order (same ebay_order_id + total_amount). Summing
         every row inflates revenue ~3x. Collapse to distinct
         (ebay_order_id, total_amount) lines, then treat each ebay_order_id
         as one order. Revenue is the sum of the "revenue" column
         (total_amount) over those distinct lines. */
      interface EbayOrderAgg {
        ebay_order_id: string;
        order_status: string;
        order_date?: string;
        synced_at?: string | null;
        revenue: number;
        profit: number | null;
      }
      const groupOrders = (rows: EbayOrderRow[]): EbayOrderAgg[] => {
        const seenLine = new Set<string>();
        const map = new Map<string, EbayOrderAgg>();
        for (const o of rows) {
          const oid = String(o.ebay_order_id ?? o.id ?? '');
          const lineKey = `${oid}|${o.total_amount ?? ''}`;
          if (seenLine.has(lineKey)) continue; // drop duplicate import rows
          seenLine.add(lineKey);

          let g = map.get(oid);
          if (!g) {
            g = {
              ebay_order_id: oid,
              order_status: (o.order_status || '').toLowerCase(),
              order_date: o.order_date,
              synced_at: o.synced_at ?? null,
              revenue: 0,
              profit: null,
            };
            map.set(oid, g);
          }
          g.revenue += Number(o.total_amount) || 0;
          const lineProfit = (typeof o.net_profit === 'number' && o.net_profit !== null)
            ? Number(o.net_profit)
            : (typeof o.add_fee === 'number' && o.add_fee !== null) ? Number(o.add_fee) : null;
          if (lineProfit !== null) g.profit = (g.profit ?? 0) + lineProfit;
          if (o.synced_at && (!g.synced_at || new Date(o.synced_at) > new Date(g.synced_at))) g.synced_at = o.synced_at;
          if (o.order_date && (!g.order_date || new Date(o.order_date) < new Date(g.order_date))) g.order_date = o.order_date;
        }
        return [...map.values()];
      };

      const currentOrders = groupOrders(currentEbayOrders);
      const previousOrders = groupOrders(previousEbayOrders);

      const ebayOrdersRevenue = currentOrders.reduce((acc, o) => acc + o.revenue, 0);

      const ordersWithProfit = currentOrders.filter(o => o.profit !== null);
      const realNetProfit: number | null = ordersWithProfit.length > 0
        ? ordersWithProfit.reduce((acc, o) => acc + (o.profit || 0), 0)
        : null;

      const completedEbayOrders = currentOrders.filter(o => o.order_status === 'completed');
      const pendingEbayOrders = currentOrders.filter(o =>
        ['pending', 'awaiting payment', 'processing', 'paid', 'shipped'].includes(o.order_status)
      );

      const inventoryValue = allListings.reduce((acc, l) => acc + (Number(l.ebay_price) || 0), 0);
      const totalCost = allListings.reduce((acc, l) => acc + (Number(l.amazon_price) || 0), 0);

      const previousOrderRevenue = previousOrders.reduce((acc, o) => acc + o.revenue, 0);
      const previousTotalOrders = previousOrders.length;
      const currentTotalOrders = currentOrders.length;

      const revenueChange = previousOrderRevenue > 0
        ? Math.round(((ebayOrdersRevenue - previousOrderRevenue) / previousOrderRevenue) * 1000) / 10
        : ebayOrdersRevenue > 0 ? 100 : 0;
      const ordersChange = previousTotalOrders > 0
        ? Math.round(((currentTotalOrders - previousTotalOrders) / previousTotalOrders) * 1000) / 10
        : currentTotalOrders > 0 ? 100 : 0;

      const syncedDates = currentOrders
        .map(o => o.synced_at ? new Date(o.synced_at) : null)
        .filter(Boolean) as Date[];
      const lastSyncAt = syncedDates.length > 0
        ? new Date(Math.max(...syncedDates.map(d => d.getTime())))
        : null;

      const ordersForTrend = currentOrders.map(o => ({
        created_at: o.order_date,
        order_date: o.order_date,
        order_status: o.order_status,
        status: o.order_status === 'completed' ? 'COMPLETED' : 'PENDING',
        realProfit: o.profit,
        item_price: o.revenue,
      }));

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
        orderRevenue: ebayOrdersRevenue, inventoryValue, totalCost,
        netProfit: realNetProfit, profitOrderCount: ordersWithProfit.length,
        completedOrders: completedEbayOrders.length, pendingOrders: pendingEbayOrders.length,
        unreadAlerts: alertsResult.count || 0, activeListings: listingsResult.count || 0,
        revenueChange, ordersChange, previousOrderRevenue, lastSyncAt,
      });

      setAllOrders(ordersForTrend);
      setTopProducts(topProductsData);
      setTrendData(generateRealTrendData(ordersForTrend, dateRange));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getEffectiveDateRange, getPreviousDateRange]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  /* ── derived values ─────────────────────────────────────────────────── */

  const totalOrders = stats.completedOrders + stats.pendingOrders;

  const successRate = useMemo(() => {
    return totalOrders > 0 ? Math.round((stats.completedOrders / totalOrders) * 100) : 0;
  }, [stats.completedOrders, totalOrders]);

  const marginPct = stats.inventoryValue > 0
    ? ((stats.inventoryValue - stats.totalCost) / stats.inventoryValue) * 100
    : 0;

  const sparklineData = useMemo(() =>
    trendData.map(t => t.revenue || 0),
    [trendData]
  );

  const maxListingPrice = useMemo(() =>
    Math.max(...topProducts.map(p => p.ebay_price), 1),
    [topProducts]
  );

  const feedItems = useMemo(() => {
    return allOrders.slice(0, 6).map((o: any) => {
      const status = (o.order_status || '').toLowerCase();
      const isCompleted = status === 'completed';
      const isShipped = ['shipped', 'paid'].includes(status);
      const amount = Number(o.item_price) || 0;
      const dateStr = o.created_at || o.order_date;
      return {
        color: isCompleted ? 'green' : isShipped ? 'violet' : 'amber',
        icon: isCompleted
          ? <DollarSign size={16} />
          : isShipped
            ? <Truck size={16} />
            : <ShoppingCart size={16} />,
        title: isCompleted ? 'Payment received' : isShipped ? 'Order in transit' : 'Order placed',
        desc: `eBay · ${status || 'processing'}`,
        amount: amount > 0 ? `+$${amount.toFixed(2)}` : '',
        time: dateStr ? formatDistanceToNow(parseISO(dateStr), { addSuffix: true }) : '',
      };
    });
  }, [allOrders]);

  const rangeLabel = datePreset === 'today' ? 'today'
    : datePreset === 'year' ? 'the last 12 months'
    : `this ${datePreset}`;

  /* ── loading skeleton ───────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="db-dash space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-52" /></div>
          <div className="flex gap-3"><Skeleton className="h-9 w-48 rounded-xl" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
        </div>
        <div className="db-grid"><Skeleton className="db-col-4 h-36 rounded-2xl" /><Skeleton className="db-col-4 h-36 rounded-2xl" /><Skeleton className="db-col-4 h-36 rounded-2xl" /></div>
        <div className="db-grid"><Skeleton className="db-col-8 h-80 rounded-2xl" /><Skeleton className="db-col-4 h-80 rounded-2xl" /></div>
        <div className="db-grid"><Skeleton className="db-col-3 h-24 rounded-2xl" /><Skeleton className="db-col-3 h-24 rounded-2xl" /><Skeleton className="db-col-3 h-24 rounded-2xl" /><Skeleton className="db-col-3 h-24 rounded-2xl" /></div>
      </div>
    );
  }

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <div className="db-dash pb-8">

      {/* ── page header ─────────────────────────────────────────────── */}
      <div className="db-page-head db-fade-up">
        <div className="db-page-title">
          <h1>Dashboard</h1>
          <p>Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} — here's how your store is performing.</p>
          <div className="db-synced">
            {stats.lastSyncAt ? (
              <>
                <span className="db-pulse" />
                Live · synced {formatDistanceToNow(stats.lastSyncAt)} ago
              </>
            ) : (
              <>
                <span className="db-pulse" style={{ background: 'var(--db-ink-4)', animationName: 'none' }} />
                Sync pending — open orders in eBay extension
              </>
            )}
          </div>
        </div>

        <div className="db-head-actions">
          {whatsappConfig?.whatsapp_dashboard_enabled && whatsappConfig?.support_whatsapp_number && (
            <WhatsAppButton
              phone_number={whatsappConfig.support_whatsapp_number}
              message={applyWhatsAppTemplate(
                whatsappConfig.whatsapp_dashboard_template || 'Hi, I need help.',
                { customer_name: profile?.full_name }
              )}
            />
          )}
          <div className="db-seg">
            {(['today', 'week', 'month', 'year'] as const).map(p => (
              <button
                key={p}
                className={datePreset === p ? 'on' : ''}
                onClick={() => setDatePreset(p)}
              >
                {p === 'today' ? 'Day' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button className="db-btn-primary" onClick={() => navigate('/dashboard/listings')}>
            <Plus size={15} /> Add Listing
          </button>
        </div>
      </div>

      {/* ── row 1: KPI cards ────────────────────────────────────────── */}
      <div className="db-grid">

        {/* Inventory Value */}
        <div className="db-card lift db-col-4 db-fade-up" style={{ animationDelay: '0.04s' }}>
          <div className="db-card-head">
            <div className="db-card-ico blue"><Package size={20} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Inventory Value</div>
              <div className="db-card-sub">Potential revenue · listing prices</div>
            </div>
          </div>
          <div className="db-kpi-value">
            <span className="cur">$</span>
            <CountMoney value={stats.inventoryValue} />
          </div>
          <div className="db-chips">
            <span className="db-chip">
              <span className="dot" style={{ background: 'var(--db-accent)' }} />
              {stats.activeListings} Active listings
            </span>
            <span className="db-chip">
              <span className="dot" style={{ background: 'var(--db-warning)' }} />
              {totalOrders} Orders
            </span>
          </div>
        </div>

        {/* Revenue — confirmed by eBay */}
        <div className="db-card lift db-col-4 db-fade-up" style={{ animationDelay: '0.10s' }}>
          <div className="db-card-head">
            <div className="db-card-ico green"><TrendingUp size={20} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Revenue</div>
              <div className="db-card-sub">Paid orders · {rangeLabel}</div>
            </div>
            <span className="db-tag green">
              <CheckCircle2 size={11} /> Confirmed by eBay
            </span>
          </div>
          <div className="db-kpi-value">
            <span className="cur">$</span>
            <CountMoney value={stats.orderRevenue} />
          </div>
          {sparklineData.some(v => v > 0) && (
            <div className="db-spark">
              <Sparkline data={sparklineData} color="#0e9f6e" id="rev" />
            </div>
          )}
          <div className="db-kpi-foot">
            <Delta v={stats.revenueChange} />
            <button className="db-link-row" onClick={() => navigate('/dashboard/orders')}>
              View orders <ArrowUpRight size={13} />
            </button>
          </div>
          {stats.netProfit !== null && (
            <div style={{ fontSize: 12, color: 'var(--db-ink-3)', marginTop: 10 }}>
              Net earnings: <span style={{ color: 'var(--db-success)', fontWeight: 700 }}>${stats.netProfit.toFixed(2)}</span>
              {' '}({stats.profitOrderCount} order{stats.profitOrderCount !== 1 ? 's' : ''} synced)
            </div>
          )}
          {stats.netProfit === null && stats.orderRevenue > 0 && (
            <div style={{ fontSize: 12, color: 'var(--db-warning)', marginTop: 10 }}>
              Net profit pending — sync orders via extension
            </div>
          )}
        </div>

        {/* Potential Margin — estimated */}
        <div className="db-card lift db-col-4 db-fade-up" style={{ animationDelay: '0.16s' }}>
          <div className="db-card-head">
            <div className="db-card-ico amber"><Gem size={20} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Potential Margin</div>
              <div className="db-card-sub">If all listings sell · {marginPct.toFixed(0)}% spread</div>
            </div>
            <span className="db-tag amber">Estimated</span>
          </div>
          <div className="db-kpi-value">
            <span className="cur">$</span>
            <CountMoney value={Math.max(0, stats.inventoryValue - stats.totalCost)} />
          </div>
          <div className="db-kpi-foot">
            <span className="db-chip">
              <span className="db-num" style={{ color: 'var(--db-success)', fontWeight: 700 }}>{marginPct.toFixed(0)}%</span>
              &nbsp;blended margin
            </span>
            <button className="db-link-row" onClick={() => navigate('/dashboard/listings')}>
              View listings <ArrowUpRight size={13} />
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--db-ink-4)', marginTop: 10 }}>
            Excludes eBay fees &amp; shipping
          </div>
        </div>
      </div>

      {/* ── row 2: Revenue Trend + Donut ────────────────────────────── */}
      <div className="db-grid">

        {/* Revenue Trend chart */}
        <div className="db-card db-col-8 db-fade-up" style={{ animationDelay: '0.20s' }}>
          <div className="db-chart-top">
            <div className="db-card-ico blue"><Activity size={19} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Revenue Trend</div>
              <div className="db-card-sub">Confirmed order revenue over {rangeLabel}</div>
            </div>
            {stats.lastSyncAt ? (
              <span className="db-tag green" style={{ marginLeft: 'auto' }}>
                <span className="db-pulse" style={{ width: 6, height: 6, flexShrink: 0 }} />
                Live
              </span>
            ) : (
              <span className="db-tag blue" style={{ marginLeft: 'auto' }}>eBay</span>
            )}
          </div>

          <div className="db-chart-stats">
            <div>
              <div className="db-stat-lab">
                <span className="db-stat-dot" style={{ background: 'var(--db-accent)' }} />
                Order revenue
              </div>
              <div className="db-stat-val">
                ${stats.orderRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="db-stat-lab">
                <span className="db-stat-dot" style={{ background: 'var(--db-ink-4)' }} />
                Total orders
              </div>
              <div className="db-stat-val">{totalOrders}</div>
            </div>
            {stats.lastSyncAt && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div className="db-stat-lab" style={{ justifyContent: 'flex-end' }}>Last sync</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--db-ink-2)' }}>
                  {format(stats.lastSyncAt, 'MMM d, h:mm a')}
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 240 }}>
            {trendData.length > 0 && trendData.some(t => t.revenue > 0 || t.orders > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 4, left: -16, bottom: 0 }} key={datePreset}>
                  <defs>
                    <linearGradient id="dbAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2455f6" stopOpacity={0.28} />
                      <stop offset="70%" stopColor="#2455f6" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#2455f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="var(--db-border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--db-ink-4)', fontFamily: 'Hanken Grotesk, system-ui', fontWeight: 600 }}
                    axisLine={false} tickLine={false} dy={8}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--db-ink-4)', fontFamily: 'Hanken Grotesk, system-ui' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--db-surface)', border: '1px solid var(--db-border)',
                      borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                      padding: '8px 14px', fontFamily: 'Hanken Grotesk, system-ui',
                    }}
                    labelStyle={{ color: 'var(--db-ink-3)', fontSize: 11.5, marginBottom: 3 }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']}
                    cursor={{ stroke: '#2455f6', strokeWidth: 1, strokeDasharray: '3 4', opacity: 0.5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2455f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dbAreaFill)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--db-surface)', stroke: '#2455f6', strokeWidth: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="db-empty" style={{ height: '100%' }}>
                <div className="db-empty-icon"><Activity size={24} /></div>
                <p>No order data yet</p>
                <small>Complete orders to see your revenue trend</small>
              </div>
            )}
          </div>
        </div>

        {/* Order Success Rate donut */}
        <div className="db-card db-col-4 db-fade-up" style={{ animationDelay: '0.24s', display: 'flex', flexDirection: 'column' }}>
          <div className="db-card-head">
            <div className="db-card-ico violet"><Target size={20} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Order Success Rate</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0 4px' }}>
            {totalOrders === 0 ? (
              <div className="db-empty">
                <div className="db-empty-icon"><Target size={22} /></div>
                <p>No orders yet</p>
                <small>Sync your eBay orders</small>
              </div>
            ) : (
              <SvgDonut value={successRate} size={160} />
            )}
          </div>
          <div className="db-chips" style={{ justifyContent: 'center' }}>
            <span className="db-chip">
              <span className="dot" style={{ background: 'var(--db-success)' }} />
              Completed {stats.completedOrders}
            </span>
            <span className="db-chip">
              <span className="dot" style={{ background: 'var(--db-ink-4)' }} />
              Pending {stats.pendingOrders}
            </span>
          </div>
        </div>
      </div>

      {/* ── row 3: mini stats ────────────────────────────────────────── */}
      <div className="db-grid">
        {[
          { icon: <Package size={19} />, cl: 'blue',   val: stats.activeListings.toString(),                                           label: 'Active listings' },
          { icon: <CheckCircle2 size={19} />, cl: 'green',  val: stats.completedOrders.toString(),                                        label: 'Completed orders' },
          { icon: <DollarSign size={19} />, cl: 'amber',  val: totalOrders > 0 ? `$${(stats.orderRevenue / totalOrders).toFixed(2)}` : '—', label: 'Avg. order value' },
          { icon: <Bell size={19} />, cl: 'violet', val: stats.unreadAlerts.toString(),                                              label: 'Unread alerts' },
        ].map((s, i) => (
          <div key={i} className="db-card lift db-col-3 db-fade-up" style={{ animationDelay: `${0.28 + i * 0.04}s` }}>
            <div className="db-ministat">
              <div className={`db-card-ico ${s.cl}`}>{s.icon}</div>
              <div>
                <div className="db-mi-val">{s.val}</div>
                <div className="db-mi-lab">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── row 4: activity feed + top listings ─────────────────────── */}
      <div className="db-grid" style={{ paddingBottom: 8 }}>

        {/* Activity feed */}
        <div className="db-card db-col-7 db-fade-up" style={{ animationDelay: '0.44s' }}>
          <div className="db-card-head">
            <div className="db-card-ico blue"><Activity size={18} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Recent Activity</div>
              <div className="db-card-sub">Latest orders · {rangeLabel}</div>
            </div>
            <button className="db-link-row" style={{ marginLeft: 'auto' }} onClick={() => navigate('/dashboard/orders')}>
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="db-feed">
            {feedItems.length === 0 ? (
              <div className="db-empty">
                <div className="db-empty-icon"><Activity size={22} /></div>
                <p>No recent activity</p>
                <small>Orders will appear here once synced from eBay</small>
              </div>
            ) : (
              feedItems.map((f, i) => (
                <div key={i} className="db-feed-item" style={{ animationDelay: `${0.5 + i * 0.07}s` }}>
                  <div className={`db-feed-ico db-card-ico ${f.color}`}>{f.icon}</div>
                  <div className="db-feed-main">
                    <b>{f.title}</b>
                    <p>{f.desc}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {f.amount && (
                      <div className="db-feed-amt" style={{ color: 'var(--db-success)' }}>{f.amount}</div>
                    )}
                    <div className="db-feed-time">{f.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top listings */}
        <div className="db-card db-col-5 db-fade-up" style={{ animationDelay: '0.48s' }}>
          <div className="db-card-head">
            <div className="db-card-ico green"><TrendingUp size={18} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Top Performing Listings</div>
              <div className="db-card-sub">By price · active listings</div>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon"><Package size={22} /></div>
              <p>No listings yet</p>
              <small>Add listings to see top performers</small>
              <button className="db-btn-primary" style={{ marginTop: 12, fontSize: 12, padding: '6px 14px' }} onClick={() => navigate('/dashboard/listings')}>
                <Plus size={14} /> Add Listing
              </button>
            </div>
          ) : (
            <>
              {topProducts.map((p, i) => (
                <div
                  key={p.id}
                  className="db-tl-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/dashboard/listings')}
                >
                  <div className="db-tl-rank">{i + 1}</div>
                  <div className="db-tl-main">
                    <b>{p.title}</b>
                    <div className="db-tl-bar">
                      <i style={{
                        width: `${Math.round((p.ebay_price / maxListingPrice) * 100)}%`,
                        animationDelay: `${0.55 + i * 0.08}s`,
                      }} />
                    </div>
                  </div>
                  <div className="db-tl-meta">
                    <b>${p.ebay_price.toFixed(2)}</b>
                    <small style={{ color: p.profit >= 0 ? 'var(--db-success)' : 'var(--db-danger)' }}>
                      {p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)} spread
                    </small>
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: 'var(--db-ink-4)', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--db-border-2)' }}>
                * Spread = eBay listing price minus source cost. Excludes eBay selling fees and shipping.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
