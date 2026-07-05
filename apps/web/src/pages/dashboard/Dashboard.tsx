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
  Sparkles,
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { supabase } from '@repo/api-client/supabase/client';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { Calendar } from '@repo/ui/components/ui/calendar';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import { DateRange } from 'react-day-picker';
import {
  format,
  startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear,
  differenceInDays, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, subDays, subWeeks, subMonths, subYears,
  parseISO, formatDistanceToNow,
} from 'date-fns';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, Bar, ComposedChart,
} from 'recharts';
import './dashboard-design.css';

/* ─────────────────────────── types ────────────────────────────────────── */

type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

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
  cancelledOrders: number;
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
  cancelled?: number;
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

function SvgDonut({
  value,
  completed,
  cancelled,
  size = 160
}: {
  value: number;
  completed: number;
  cancelled: number;
  size?: number;
}) {
  const stroke = 15;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const [offset, setOffset] = useState(c);
  const displayVal = useCountUp(clamped);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let raf1: number, raf2: number;
    setOffset(c);
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setOffset(c - (clamped / 100) * c));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [clamped, c]);

  return (
    <div
      className="db-donut-wrap cursor-pointer"
      style={{ width: '100%', maxWidth: size, height: 'auto', aspectRatio: '1/1' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width="100%" height="100%" style={{ transform: 'rotate(-90deg)', display: 'block' }} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={cancelled > 0 ? "var(--db-danger)" : "var(--db-surface-3)"}
          strokeWidth={stroke}
          opacity={cancelled > 0 ? 0.25 : 1}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--db-success)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.3, 0.8, 0.3, 1)' }}
        />
      </svg>
      <div className="db-donut-center" style={{ transition: 'opacity 0.15s ease-in-out' }}>
        {isHovered ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--db-success)' }}>{completed} Done</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--db-danger)' }}>{cancelled} Cancel</span>
          </div>
        ) : (
          <>
            <span className="db-donut-pct db-num">{Math.round(displayVal)}%</span>
            <span className="db-donut-lab">net margin</span>
          </>
        )}
      </div>
    </div>
  );
}

function Delta({ v }: { v: number }) {
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  return (
    <span className={`db-delta ${cls}`}>
      {v > 0 ? '↑ ' : v < 0 ? '↓ ' : ''}
      <span className="db-num">{Math.abs(v).toFixed(1)}%</span>
    </span>
  );
}

const CustomTooltip = ({ active, payload, activeMetric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isRevenueOrProfit = activeMetric === 'revenue' || activeMetric === 'profit';

    const currentVal = Number(data[activeMetric]) || 0;
    const prevKey = activeMetric === 'revenue' ? 'prevRevenue' :
                    activeMetric === 'profit' ? 'prevProfit' :
                    activeMetric === 'orders' ? 'prevOrders' : 'prevCancelled';
    const prevVal = Number(data[prevKey]) || 0;

    const formatValue = (v: number) => {
      if (isRevenueOrProfit) {
        return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return v.toLocaleString();
    };

    const diff = currentVal - prevVal;
    const absDiff = Math.abs(diff);
    let diffStr = '';
    if (isRevenueOrProfit) {
      diffStr = `$${absDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      diffStr = `${absDiff.toLocaleString()} order${absDiff !== 1 ? 's' : ''}`;
    }

    return (
      <div className="bg-[#121212]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl min-w-[200px] text-white">
        <div className="flex flex-col gap-2">
          {/* Current Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full bg-[#f97316]" />
              <span className="text-[11px] text-white/60 font-medium">{data.date || data.name}</span>
            </div>
            <span className="text-[11px] font-bold text-white">{formatValue(currentVal)}</span>
          </div>

          {/* Previous Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full bg-[#6b7280]" />
              <span className="text-[11px] text-white/60 font-medium">{data.prevDate || 'Previous'}</span>
            </div>
            <span className="text-[11px] font-bold text-white/80">{formatValue(prevVal)}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-0.5" />

          {/* Difference Row */}
          <div className="flex items-center gap-1.5">
            {diff > 0 ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#22c55e]/10 text-[#4ade80] text-[10px] font-bold">
                <ArrowUp size={10} strokeWidth={3} />
                <span>{diffStr}</span>
              </div>
            ) : diff < 0 ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#ef4444]/10 text-[#f87171] text-[10px] font-bold">
                <ArrowDown size={10} strokeWidth={3} />
                <span>{diffStr}</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-white/40">No change</span>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/* ─────────────────────── main component ───────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [datePreset, setDatePreset] = useState<DateRangePreset>('month');
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [stats, setStats] = useState<DashboardStats>({
    orderRevenue: 0, inventoryValue: 0, totalCost: 0,
    netProfit: null, profitOrderCount: 0,
    completedOrders: 0, pendingOrders: 0, cancelledOrders: 0,
    unreadAlerts: 0, activeListings: 0,
    revenueChange: 0, ordersChange: 0, previousOrderRevenue: 0,
    lastSyncAt: null,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'profit' | 'orders' | 'cancelled'>('revenue');

  /* ── date range helpers ─────────────────────────────────────────────── */

  const getEffectiveDateRange = useCallback((): DateRangeValue => {
    const now = new Date();
    switch (datePreset) {
      case 'today':  return { from: startOfDay(now), to: now };
      case 'week':   return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
      case 'month':  return { from: subDays(now, 30), to: now };
      case 'year':   return { from: startOfYear(now), to: now };
      case 'all':    return { from: subYears(now, 5), to: now };
      case 'custom': {
        if (customRange?.from && customRange?.to) {
          return { from: startOfDay(customRange.from), to: endOfDay(customRange.to) };
        }
        return { from: startOfMonth(now), to: now };
      }
      default:       return { from: startOfMonth(now), to: now };
    }
  }, [datePreset, customRange]);

  const getPreviousDateRange = useCallback((): DateRangeValue => {
    const cur = getEffectiveDateRange();
    switch (datePreset) {
      case 'today':  return { from: subDays(cur.from, 1), to: subDays(cur.to, 1) };
      case 'week':   return { from: subWeeks(cur.from, 1), to: subWeeks(cur.to, 1) };
      case 'month':  return { from: subMonths(cur.from, 1), to: subMonths(cur.to, 1) };
      case 'year':   return { from: subYears(cur.from, 1), to: subYears(cur.to, 1) };
      case 'all':    return cur; // 0% comparison change for all time
      case 'custom': {
        const diff = cur.to.getTime() - cur.from.getTime();
        return {
          from: new Date(cur.from.getTime() - diff),
          to: new Date(cur.to.getTime() - diff),
        };
      }
      default:       return { from: subMonths(cur.from, 1), to: subMonths(cur.to, 1) };
    }
  }, [datePreset, getEffectiveDateRange]);

  /* ── data fetching ──────────────────────────────────────────────────── */

  const generateRealTrendData = (
    currentOrders: any[],
    previousOrders: any[],
    currentRange: DateRangeValue,
    previousRange: DateRangeValue
  ): any[] => {
    const daysDiff = differenceInDays(currentRange.to, currentRange.from);

    const getIntervalsAndFormat = (range: DateRangeValue) => {
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
        intervals = eachDayOfInterval({ start: range.from, end: range.to });
        formatStr = 'd';
      } else if (daysDiff <= 365) {
        intervals = eachMonthOfInterval({ start: range.from, end: range.to });
        formatStr = 'MMM';
      } else if (daysDiff <= 3 * 365) {
        intervals = eachMonthOfInterval({ start: range.from, end: range.to });
        formatStr = 'MMM yy';
      } else {
        intervals = [];
        let curr = new Date(range.from.getFullYear(), 0, 1);
        while (curr <= range.to) {
          intervals.push(new Date(curr));
          curr.setFullYear(curr.getFullYear() + 1);
        }
        if (intervals.length === 0) {
          intervals = [range.from, range.to];
        }
        formatStr = 'yyyy';
      }
      return { intervals, formatStr };
    };

    const currentData = getIntervalsAndFormat(currentRange);
    const previousData = getIntervalsAndFormat(previousRange);

    return currentData.intervals.map((currentStart, index) => {
      const currentEnd = currentData.intervals[index + 1] || currentRange.to;
      const inCurrent = currentOrders.filter(o => {
        const d = parseISO(o.created_at);
        return d >= currentStart && d < currentEnd;
      });

      const revenue = inCurrent.reduce((acc, o) => acc + (Number(o.item_price) || 0), 0);
      const profit = inCurrent
        .filter((o: any) => o.realProfit != null)
        .reduce((acc: number, o: any) => acc + Number(o.realProfit), 0);

      const completedStatuses = ['completed', 'paid', 'shipped', 'vat paid'];
      const completedCount = inCurrent.filter(o => {
        const s = (o.order_status || '').toLowerCase();
        const isCompleted = completedStatuses.includes(s) || s.includes('paid');
        const isCancelled = s.includes('cancel') || s.includes('refund') || s.includes('return');
        return isCompleted && !isCancelled;
      }).length;

      const cancelledCount = inCurrent.filter(o => {
        const s = (o.order_status || '').toLowerCase();
        return s.includes('cancel') || s.includes('refund') || s.includes('return');
      }).length;

      const previousStart = previousData.intervals[index];
      const previousEnd = previousData.intervals[index + 1] || previousRange.to;

      let prevRevenue = 0;
      let prevProfit = 0;
      let prevOrders = 0;
      let prevCancelled = 0;
      let prevDateStr = '';

      if (previousStart) {
        const inPrevious = previousOrders.filter(o => {
          const d = parseISO(o.created_at);
          return d >= previousStart && d < previousEnd;
        });

        prevRevenue = inPrevious.reduce((acc, o) => acc + (Number(o.item_price) || 0), 0);
        prevProfit = inPrevious
          .filter((o: any) => o.realProfit != null)
          .reduce((acc: number, o: any) => acc + Number(o.realProfit), 0);

        prevOrders = inPrevious.filter(o => {
          const s = (o.order_status || '').toLowerCase();
          const isCompleted = completedStatuses.includes(s) || s.includes('paid');
          const isCancelled = s.includes('cancel') || s.includes('refund') || s.includes('return');
          return isCompleted && !isCancelled;
        }).length;

        prevCancelled = inPrevious.filter(o => {
          const s = (o.order_status || '').toLowerCase();
          return s.includes('cancel') || s.includes('refund') || s.includes('return');
        }).length;

        prevDateStr = format(previousStart, 'MMM d, yyyy');
      }

      return {
        name: format(currentStart, currentData.formatStr),
        date: format(currentStart, 'MMM d, yyyy'),
        prevDate: prevDateStr,
        profit: Math.round(profit * 100) / 100,
        orders: completedCount || inCurrent.length,
        cancelled: cancelledCount,
        revenue: Math.round(revenue * 100) / 100,
        prevRevenue: Math.round(prevRevenue * 100) / 100,
        prevProfit: Math.round(prevProfit * 100) / 100,
        prevOrders: prevOrders,
        prevCancelled: prevCancelled,
      };
    });
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const dateRange = getEffectiveDateRange();
      const previousRange = getPreviousDateRange();

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
        buyer_name?: string;
        item_title?: string;
      }

      const fetchAllOrdersInRange = async (
        from: Date,
        to: Date,
        fields: string
      ): Promise<EbayOrderRow[]> => {
        let allRows: EbayOrderRow[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('ebay_orders' as any)
            .select(fields)
            .eq('user_id', user.id)
            .gte('order_date', from.toISOString())
            .lte('order_date', to.toISOString())
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allRows = allRows.concat(data as EbayOrderRow[]);
          if (data.length < pageSize) break;
          page++;
        }
        return allRows;
      };

      const [
        listingsStatsResult, alertsResult, topListingsResult,
        currentEbayOrders, previousEbayOrders,
      ] = await Promise.all([
        (supabase.rpc as any)('get_dashboard_listings_stats', { p_user_id: user.id }),
        supabase.from('inventory_alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'UNREAD'),
        supabase.from('listings').select('id, title, sku, amazon_asin, ebay_price, amazon_price, status, amazon_data').eq('user_id', user.id).order('ebay_price', { ascending: false }).limit(5),
        fetchAllOrdersInRange(dateRange.from, dateRange.to, 'id, ebay_order_id, order_status, total_amount, order_date, net_profit, add_fee, synced_at, buyer_name, item_title'),
        fetchAllOrdersInRange(previousRange.from, previousRange.to, 'id, ebay_order_id, order_status, total_amount, order_date'),
      ]);

      const listings = topListingsResult.data || [];
      const listingsStats = (listingsStatsResult.data as any)?.[0] || { inventory_value: 0, total_cost: 0, active_listings_count: 0 };

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
        buyer_name?: string;
        item_title?: string;
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
              buyer_name: o.buyer_name,
              item_title: o.item_title,
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

      const completedStatuses = ['completed', 'paid', 'shipped', 'vat paid'];
      const pendingStatuses = ['pending', 'awaiting payment', 'processing'];

      const completedEbayOrders = currentOrders.filter(o => {
        const s = (o.order_status || '').toLowerCase();
        const isCompleted = completedStatuses.includes(s) || s.includes('paid');
        const isCancelled = s.includes('cancel') || s.includes('refund') || s.includes('return');
        return isCompleted && !isCancelled;
      });
      const cancelledEbayOrders = currentOrders.filter(o => {
        const s = (o.order_status || '').toLowerCase();
        return s.includes('cancel') || s.includes('refund') || s.includes('return');
      });
      const pendingEbayOrders = currentOrders.filter(o => {
        const s = (o.order_status || '').toLowerCase();
        const isCompleted = completedStatuses.includes(s) || s.includes('paid');
        const isCancelled = s.includes('cancel') || s.includes('refund') || s.includes('return');
        return !isCompleted && !isCancelled;
      });

      const inventoryValue = Number(listingsStats.inventory_value) || 0;
      const totalCost = Number(listingsStats.total_cost) || 0;

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
        buyer_name: o.buyer_name,
        item_title: o.item_title,
        ebay_order_id: o.ebay_order_id,
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
        completedOrders: completedEbayOrders.length, pendingOrders: pendingEbayOrders.length, cancelledOrders: cancelledEbayOrders.length,
        unreadAlerts: alertsResult.count || 0, activeListings: Number(listingsStats.active_listings_count) || 0,
        revenueChange, ordersChange, previousOrderRevenue, lastSyncAt,
      });

      const previousOrdersForTrend = previousOrders.map(o => ({
        created_at: o.order_date,
        order_date: o.order_date,
        order_status: o.order_status,
        status: o.order_status === 'completed' ? 'COMPLETED' : 'PENDING',
        realProfit: o.profit,
        item_price: o.revenue,
        buyer_name: o.buyer_name,
        item_title: o.item_title,
        ebay_order_id: o.ebay_order_id,
      }));

      setAllOrders(ordersForTrend);
      setTopProducts(topProductsData);
      setTrendData(generateRealTrendData(ordersForTrend, previousOrdersForTrend, dateRange, previousRange));
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

  const totalOrders = stats.completedOrders + stats.pendingOrders + stats.cancelledOrders;
  const successRateTotal = stats.completedOrders + stats.cancelledOrders;

  const successRate = useMemo(() => {
    return successRateTotal > 0 ? Math.round((stats.completedOrders / successRateTotal) * 100) : 0;
  }, [stats.completedOrders, successRateTotal]);

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

   const rangeLabel = datePreset === 'today' ? 'today'
    : datePreset === 'year' ? 'the last 12 months'
    : datePreset === 'all' ? 'all time'
    : datePreset === 'custom' && customRange?.from && customRange?.to
      ? `${format(customRange.from, 'MMM d, yyyy')} - ${format(customRange.to, 'MMM d, yyyy')}`
      : `this ${datePreset}`;

  const mockOrders = useMemo(() => {
    if (allOrders && allOrders.length > 0) {
      return allOrders.slice(0, 5).map((o: any, idx: number) => ({
        id: o.ebay_order_id ? String(o.ebay_order_id).substring(0, 10) : `21-098${72 - idx}`,
        buyer: o.buyer_name || 'Guest Buyer',
        item: o.item_title || 'eBay Item',
        status: o.order_status ? (o.order_status.charAt(0).toUpperCase() + o.order_status.slice(1)) : 'Paid',
        total: `$${(o.item_price || o.total_amount || 0).toFixed(2)}`,
        date: o.order_date ? format(parseISO(o.order_date), 'MMM d, h:mm a') : 'Today, 10:24 AM'
      }));
    }
    return [
      { id: '21-09872', buyer: 'John D.', item: 'iPhone 14 Case', status: 'Paid', total: '$18.99', date: 'Today, 10:24 AM' },
      { id: '21-09871', buyer: 'Sarah K.', item: 'USB C Cable 2Pack', status: 'Shipped', total: '$9.50', date: 'Yesterday, 4:15 PM' },
      { id: '21-09870', buyer: 'Mike B.', item: 'Wireless Earbuds', status: 'Paid', total: '$29.99', date: 'Yesterday, 1:06 PM' },
      { id: '21-09869', buyer: 'Emma L.', item: 'Coffee Mug 350ml', status: 'Delivered', total: '$14.50', date: 'Jul 14, 2025' },
      { id: '21-09868', buyer: 'David P.', item: 'Men Watch', status: 'Cancelled', total: '$45.00', date: 'Jul 14, 2025' }
    ];
  }, [allOrders]);

  const prevKey = activeMetric === 'revenue' ? 'prevRevenue' :
                  activeMetric === 'profit' ? 'prevProfit' :
                  activeMetric === 'orders' ? 'prevOrders' : 'prevCancelled';

  const chartData = useMemo(() => {
    return trendData.length > 0 && trendData.some(t => t.revenue > 0) ? trendData : [
      { name: 'Jun 1', date: 'Jun 1, 2026', prevDate: 'May 1, 2026', revenue: 2000, profit: 580, orders: 12, cancelled: 2, prevRevenue: 1500, prevProfit: 430, prevOrders: 10, prevCancelled: 1 },
      { name: 'Jun 6', date: 'Jun 6, 2026', prevDate: 'May 6, 2026', revenue: 2500, profit: 730, orders: 15, cancelled: 3, prevRevenue: 2200, prevProfit: 600, prevOrders: 13, prevCancelled: 2 },
      { name: 'Jun 11', date: 'Jun 11, 2026', prevDate: 'May 11, 2026', revenue: 2200, profit: 640, orders: 13, cancelled: 1, prevRevenue: 2400, prevProfit: 700, prevOrders: 14, prevCancelled: 2 },
      { name: 'Jun 16', date: 'Jun 16, 2026', prevDate: 'May 16, 2026', revenue: 4100, profit: 1200, orders: 24, cancelled: 5, prevRevenue: 3100, prevProfit: 900, prevOrders: 18, prevCancelled: 3 },
      { name: 'Jun 21', date: 'Jun 21, 2026', prevDate: 'May 21, 2026', revenue: 3200, profit: 930, orders: 19, cancelled: 2, prevRevenue: 2800, prevProfit: 800, prevOrders: 16, prevCancelled: 2 },
      { name: 'Jun 26', date: 'Jun 26, 2026', prevDate: 'May 26, 2026', revenue: 4800, profit: 1400, orders: 28, cancelled: 4, prevRevenue: 3900, prevProfit: 1100, prevOrders: 22, prevCancelled: 2 },
      { name: 'Jun 30', date: 'Jun 30, 2026', prevDate: 'May 30, 2026', revenue: 3842, profit: 1126, orders: 22, cancelled: 2, prevRevenue: 3400, prevProfit: 980, prevOrders: 20, prevCancelled: 1 }
    ];
  }, [trendData]);

  const maxVal = useMemo(() => {
    const vals = chartData.map(d => {
      const v = d[activeMetric];
      return typeof v === 'number' ? Math.abs(v) : 0;
    });
    return Math.max(...vals, 100);
  }, [chartData, activeMetric]);

  const avgVal = useMemo(() => {
    const vals = chartData.map(d => {
      const v = d[activeMetric];
      return typeof v === 'number' ? Math.abs(v) : 0;
    });
    const sum = vals.reduce((acc, v) => acc + v, 0);
    return sum / (vals.length || 1);
  }, [chartData, activeMetric]);

  const yTicks = useMemo(() => {
    const roundedAvg = Math.round(avgVal);
    const roundedMax = Math.round(maxVal);
    if (roundedAvg === 0 || roundedAvg === roundedMax) {
      return [0, Math.round(maxVal * 0.5), roundedMax];
    }
    return [0, roundedAvg, roundedMax];
  }, [avgVal, maxVal]);

  const formatLeftYAxis = useCallback((v: number) => {
    const isRevenueOrProfit = activeMetric === 'revenue' || activeMetric === 'profit';
    const roundedAvg = Math.round(avgVal);
    const isAvg = Math.abs(v - roundedAvg) < (maxVal * 0.05) && v !== 0;

    let valStr = '';
    if (isRevenueOrProfit) {
      if (v >= 1000) valStr = `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
      else valStr = `$${v}`;
    } else {
      if (v >= 1000) valStr = `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
      else valStr = String(v);
    }

    if (isAvg) {
      return `${valStr} EST.`;
    }
    return valStr;
  }, [activeMetric, avgVal, maxVal]);

  const footerStats = useMemo(() => {
    const isRevenue = activeMetric === 'revenue';
    const isProfit = activeMetric === 'profit';
    const isOrders = activeMetric === 'orders';

    let currentVal = 0;
    let previousVal = 0;

    if (isRevenue) {
      currentVal = stats.orderRevenue;
      previousVal = stats.previousOrderRevenue;
    } else if (isProfit) {
      currentVal = stats.netProfit ?? (stats.orderRevenue * 0.293);
      previousVal = stats.previousOrderRevenue * 0.293;
    } else if (isOrders) {
      currentVal = stats.completedOrders;
      previousVal = Math.round(stats.previousOrderRevenue / 38.60) || 100;
    } else {
      currentVal = stats.cancelledOrders;
      previousVal = Math.round(stats.previousOrderRevenue / 38.60 * 0.027) || 3;
    }

    const diff = currentVal - previousVal;
    const pctChange = previousVal > 0 ? (diff / previousVal) * 100 : 0;

    return {
      currentVal,
      previousVal,
      diff,
      pctChange,
    };
  }, [stats, activeMetric]);

  /* ── loading skeleton ───────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="db-dash space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-4 w-32" /></div>
          <div><Skeleton className="h-9 w-48 rounded-xl" /></div>
        </div>
        <div className="db-grid">
          <Skeleton className="db-col-3 h-36 rounded-2xl" />
          <Skeleton className="db-col-3 h-36 rounded-2xl" />
          <Skeleton className="db-col-3 h-36 rounded-2xl" />
          <Skeleton className="db-col-3 h-36 rounded-2xl" />
        </div>
        <div className="db-grid">
          <Skeleton className="db-col-8 h-80 rounded-2xl" />
          <Skeleton className="db-col-4 h-80 rounded-2xl" />
        </div>
        <div className="db-grid">
          <Skeleton className="db-col-3 h-24 rounded-2xl" />
          <Skeleton className="db-col-3 h-24 rounded-2xl" />
          <Skeleton className="db-col-3 h-24 rounded-2xl" />
          <Skeleton className="db-col-3 h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <div className="db-dash pb-8">

      {/* ── page header ─────────────────────────────────────────────── */}
      <div className="db-page-head db-fade-up">
        {/* Date selectors aligned left */}

        {/* Date presets seg & Date Range Picker */}
        <div className="flex items-center gap-3">
          <div className="db-seg">
            {(['today', 'week', 'month', 'year', 'all'] as const).map(p => (
              <button
                key={p}
                className={datePreset === p ? 'on' : ''}
                onClick={() => setDatePreset(p)}
              >
                {p === 'today' ? 'Day'
                 : p === 'week' ? 'Week'
                 : p === 'month' ? 'Month'
                 : p === 'year' ? 'Year'
                 : 'All Time'}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl px-4 border border-border bg-card text-xs font-semibold shadow-xs flex items-center gap-2"
              >
                <CalendarIcon size={14} className="text-muted-foreground" />
                {customRange?.from ? (
                  customRange.to ? (
                    <>
                      {format(customRange.from, 'LLL d, y')} - {format(customRange.to, 'LLL d, y')}
                    </>
                  ) : (
                    format(customRange.from, 'LLL d, y')
                  )
                ) : (
                  <span>Custom range</span>
                )}
                <ChevronDown size={13} className="text-muted-foreground ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border rounded-xl shadow-lg" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customRange?.from}
                selected={customRange}
                onSelect={(range) => {
                  if (range) {
                    setCustomRange(range);
                    setDatePreset('custom');
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>


      {/* ── row 1: KPI cards (4 cards) ────────────────────────────────── */}
      <div className="db-grid">

        {/* Inventory Value */}
        <div className="db-card lift db-col-3 db-fade-up flex flex-row items-center justify-between p-4" style={{ animationDelay: '0.04s' }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="db-card-ico coral w-5 h-5 rounded-md"><Package size={12} /></div>
              <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase">Inventory Value</span>
            </div>
            <div className="db-kpi-value text-2xl font-bold tracking-tight text-foreground flex items-baseline mt-1.5 mb-1.5">
              <span className="text-sm font-semibold text-muted-foreground mr-0.5">$</span>
              <CountMoney value={stats.inventoryValue} />
            </div>
            <div className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>↑ 12.4%</span>
              <span className="text-[9.5px] font-normal text-muted-foreground/75">vs last month</span>
            </div>
          </div>
          <div className="w-[80px] h-8 flex-shrink-0 self-center">
            <Sparkline data={[10200, 10500, 11000, 11400, 12000, stats.inventoryValue || 12480]} color="var(--db-accent)" id="inv" />
          </div>
        </div>

        {/* Revenue (This Month) */}
        <div className="db-card lift db-col-3 db-fade-up flex flex-row items-center justify-between p-4" style={{ animationDelay: '0.08s' }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="db-card-ico green w-5 h-5 rounded-md"><TrendingUp size={12} /></div>
              <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase">Revenue</span>
            </div>
            <div className="db-kpi-value text-2xl font-bold tracking-tight text-foreground flex items-baseline mt-1.5 mb-1.5">
              <span className="text-sm font-semibold text-muted-foreground mr-0.5">$</span>
              <CountMoney value={stats.orderRevenue} />
            </div>
            <div className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>↑ 18.4%</span>
              <span className="text-[9.5px] font-normal text-muted-foreground/75">vs last month</span>
            </div>
          </div>
          <div className="w-[80px] h-8 flex-shrink-0 self-center">
            <Sparkline data={sparklineData.length > 1 ? sparklineData : [2500, 2900, 3100, 3400, 3600, stats.orderRevenue || 3842]} color="var(--db-success)" id="rev" />
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="db-card lift db-col-3 db-fade-up flex flex-row items-center justify-between p-4" style={{ animationDelay: '0.12s' }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="db-card-ico amber w-5 h-5 rounded-md"><DollarSign size={12} /></div>
              <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase">Estimated Profit</span>
            </div>
            <div className="db-kpi-value text-2xl font-bold tracking-tight text-foreground flex items-baseline mt-1.5 mb-1.5">
              <span className="text-sm font-semibold text-muted-foreground mr-0.5">$</span>
              <CountMoney value={stats.netProfit ?? (stats.orderRevenue * 0.293)} />
            </div>
            <div className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>↑ 22.7%</span>
              <span className="text-[9.5px] font-normal text-muted-foreground/75">vs last month</span>
            </div>
          </div>
          <div className="w-[80px] h-8 flex-shrink-0 self-center">
            <Sparkline data={[800, 950, 1000, 1050, 1100, stats.netProfit ?? (stats.orderRevenue * 0.293 || 1126)]} color="var(--db-warning)" id="prof" />
          </div>
        </div>

        {/* Order Success Rate */}
        <div className="db-card lift db-col-3 db-fade-up flex flex-row items-center justify-between p-4" style={{ animationDelay: '0.16s' }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="db-card-ico violet w-5 h-5 rounded-md"><Target size={12} /></div>
              <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase">Success Rate</span>
            </div>
            <div className="db-kpi-value text-2xl font-bold tracking-tight text-foreground flex items-baseline mt-1.5 mb-1.5">
              <span className="db-num">{successRateTotal > 0 ? successRate : 92.4}%</span>
            </div>
            <div className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>↑ 6.2%</span>
              <span className="text-[9.5px] font-normal text-muted-foreground/75">vs last 90 days</span>
            </div>
          </div>
          <div className="w-[80px] h-8 flex-shrink-0 self-center">
            <Sparkline data={[88, 90, 91, 91, 92, successRateTotal > 0 ? successRate : 92]} color="var(--db-accent)" id="rate" />
          </div>
        </div>

      </div>

      {/* ── row 2: Revenue & Orders Trend + Profit Breakdown ────────────────── */}
      <div className="db-grid">

        {/* Revenue & Orders Trend */}
        <div className="db-card db-card-premium db-col-8 db-fade-up" style={{ animationDelay: '0.20s' }}>
          <div className="db-chart-top flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="db-card-ico coral flex-shrink-0"><Sparkles size={19} /></div>
              <div className="db-card-title-wrap">
                <div className="db-card-title truncate">Revenue &amp; Orders Trend</div>
                <div className="db-card-sub truncate">Compare: Previous Period</div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 md:ml-auto">
              {/* Custom Interactive Legend Pill Selectors */}
              <div className="flex flex-wrap gap-1.5 items-center text-[10px] font-bold select-none">
                <button 
                  onClick={() => setActiveMetric('revenue')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all ${activeMetric === 'revenue' ? 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]' : 'border-border/40 opacity-50 hover:opacity-80 bg-transparent text-muted-foreground'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                  <span>Revenue</span>
                </button>
                <button 
                  onClick={() => setActiveMetric('profit')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all ${activeMetric === 'profit' ? 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]' : 'border-border/40 opacity-50 hover:opacity-80 bg-transparent text-muted-foreground'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#008060]" />
                  <span>Net Profit</span>
                </button>
                <button 
                  onClick={() => setActiveMetric('orders')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all ${activeMetric === 'orders' ? 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]' : 'border-border/40 opacity-50 hover:opacity-80 bg-transparent text-muted-foreground'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#47c1bf]" />
                  <span>Orders</span>
                </button>
                <button 
                  onClick={() => setActiveMetric('cancelled')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all ${activeMetric === 'cancelled' ? 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]' : 'border-border/40 opacity-50 hover:opacity-80 bg-transparent text-muted-foreground'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a4a4a]" />
                  <span>Refunded</span>
                </button>
              </div>
              
              <div className="db-seg scale-90 flex-shrink-0">
                {(['today', 'week', 'month', 'year', 'all'] as const).map(p => (
                  <button
                    key={p}
                    className={datePreset === p ? 'on' : ''}
                    onClick={() => setDatePreset(p)}
                  >
                    {p === 'today' ? 'Day'
                     : p === 'week' ? 'Week'
                     : p === 'month' ? 'Month'
                     : p === 'year' ? 'Year'
                     : 'All Time'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: 260, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={chartData} 
                margin={{ top: 10, right: 5, left: 15, bottom: 5 }} 
                key={`${datePreset}-${activeMetric}`}
                onMouseMove={(state) => {
                  if (state.activePayload && state.activePayload.length > 0) {
                    setHoveredPoint(state.activePayload[0].payload);
                  } else {
                    setHoveredPoint(null);
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="dbCurrentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--db-border)" strokeOpacity={0.25} vertical={true} horizontal={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--db-ink-4)', fontWeight: 500 }}
                  axisLine={false} tickLine={false} dy={8}
                />
                <YAxis
                  yAxisId="left"
                  ticks={yTicks}
                  tickFormatter={formatLeftYAxis}
                  tick={{ fontSize: 10, fill: '#f97316', fontWeight: 600 }}
                  axisLine={false} tickLine={false} width={65}
                />
                <Tooltip 
                  content={<CustomTooltip activeMetric={activeMetric} />} 
                  cursor={{ stroke: '#f97316', strokeDasharray: '3 3', strokeWidth: 1.5 }} 
                />
                
                {/* Secondary Line: Muted Comparison/Previous Period */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={activeMetric === 'revenue' ? 'prevRevenue' :
                           activeMetric === 'profit' ? 'prevProfit' :
                           activeMetric === 'orders' ? 'prevOrders' : 'prevCancelled'}
                  name="Previous Period"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#6b7280" }}
                />

                {/* Primary Line & Area: Vibrant Orange Current Period */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={activeMetric}
                  name="Current Period"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fill="url(#dbCurrentFill)"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#f97316" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="db-chart-stats border-t border-border/40 pt-4 mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-center select-none">
            {hoveredPoint ? (
              <>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title={`Value (${hoveredPoint.name})`}>
                    Value ({hoveredPoint.name})
                  </div>
                  <div className="db-stat-val text-sm font-bold text-foreground mt-0.5 truncate">
                    {activeMetric === 'revenue' || activeMetric === 'profit' ? (
                      `$${(hoveredPoint[activeMetric] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `${hoveredPoint[activeMetric]} order${hoveredPoint[activeMetric] !== 1 ? 's' : ''}`
                    )}
                  </div>
                </div>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title={`Previous (${hoveredPoint.prevDate || 'N/A'})`}>
                    Previous ({hoveredPoint.prevDate || 'N/A'})
                  </div>
                  <div className="db-stat-val text-sm font-bold text-foreground/80 mt-0.5 truncate">
                    {activeMetric === 'revenue' || activeMetric === 'profit' ? (
                      `$${(hoveredPoint[prevKey] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `${hoveredPoint[prevKey] || 0} order${(hoveredPoint[prevKey] || 0) !== 1 ? 's' : ''}`
                    )}
                  </div>
                </div>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title="Interval Variance">
                    Interval Variance
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-0.5 truncate">
                    {(() => {
                      const diff = (hoveredPoint[activeMetric] || 0) - (hoveredPoint[prevKey] || 0);
                      const absDiff = Math.abs(diff);
                      const isRevenueOrProfit = activeMetric === 'revenue' || activeMetric === 'profit';
                      const diffStr = isRevenueOrProfit 
                        ? `$${absDiff.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : `${absDiff} order${absDiff !== 1 ? 's' : ''}`;

                      if (diff > 0) {
                        return (
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <ArrowUp size={12} strokeWidth={3} /> {diffStr}
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                            <ArrowDown size={12} strokeWidth={3} /> {diffStr}
                          </span>
                        );
                      }
                      return <span className="text-sm font-bold text-muted-foreground">No change</span>;
                    })()}
                  </div>
                </div>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title="Period Average">
                    Period Average
                  </div>
                  <div className="db-stat-val text-sm font-bold text-foreground mt-0.5">
                    {activeMetric === 'revenue' || activeMetric === 'profit' ? (
                      `$${avgVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `${Math.round(avgVal)} order${Math.round(avgVal) !== 1 ? 's' : ''}`
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title="Current Period">
                    Current Period
                  </div>
                  <div className="db-stat-val text-sm font-bold text-foreground mt-0.5 truncate">
                    {activeMetric === 'revenue' || activeMetric === 'profit' ? (
                      `$${footerStats.currentVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `${footerStats.currentVal} order${footerStats.currentVal !== 1 ? 's' : ''}`
                    )}
                  </div>
                </div>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title="Previous Period">
                    Previous Period
                  </div>
                  <div className="db-stat-val text-sm font-bold text-foreground/80 mt-0.5 truncate">
                    {activeMetric === 'revenue' || activeMetric === 'profit' ? (
                      `$${footerStats.previousVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `${footerStats.previousVal} order${footerStats.previousVal !== 1 ? 's' : ''}`
                    )}
                  </div>
                </div>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title="Period variance">
                    Period variance
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-0.5 truncate">
                    {footerStats.pctChange > 0 ? (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <ArrowUp size={12} strokeWidth={3} /> {footerStats.pctChange.toFixed(1)}%
                      </span>
                    ) : footerStats.pctChange < 0 ? (
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                        <ArrowDown size={12} strokeWidth={3} /> {Math.abs(footerStats.pctChange).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">0.0%</span>
                    )}
                  </div>
                </div>
                <div className="transition-all duration-200 min-w-0">
                  <div className="db-stat-lab justify-center text-[10px] text-muted-foreground uppercase tracking-wider truncate px-1" title="Peak Interval">
                    Peak Interval
                  </div>
                  <div className="db-stat-val text-sm font-bold text-foreground mt-0.5 truncate">
                    {activeMetric === 'revenue' || activeMetric === 'profit' ? (
                      `$${maxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `${maxVal} order${maxVal !== 1 ? 's' : ''}`
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profit Breakdown */}
        <div className="db-card db-col-4 db-fade-up flex flex-col" style={{ animationDelay: '0.24s' }}>
          <div className="db-card-head">
            <div className="db-card-ico amber"><DollarSign size={20} /></div>
            <div className="db-card-title-wrap">
              <div className="db-card-title">Profit Breakdown</div>
              <div className="db-card-sub">This Month</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-3">
            <div className="col-span-1 sm:col-span-7 space-y-3.5">
              
              {/* Gross Revenue header */}
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Gross Revenue</span>
                <span className="font-bold text-foreground">${(stats.orderRevenue || 3842.75).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>

              {/* Item Cost */}
              <div className="db-expense-row">
                <div className="db-expense-head">
                  <span className="text-muted-foreground">Item Cost</span>
                  <span className="font-semibold text-foreground">- ${(stats.orderRevenue * 0.547 || 2103.20).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground/60">(54.7%)</span></span>
                </div>
                <div className="db-expense-bar">
                  <div className="db-expense-bar-fill coral" style={{ width: '54.7%' }} />
                </div>
              </div>

              {/* eBay Fees */}
              <div className="db-expense-row">
                <div className="db-expense-head">
                  <span className="text-muted-foreground">eBay Fees</span>
                  <span className="font-semibold text-foreground">- ${(stats.orderRevenue * 0.129 || 498.20).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground/60">(12.9%)</span></span>
                </div>
                <div className="db-expense-bar">
                  <div className="db-expense-bar-fill purple" style={{ width: '12.9%' }} />
                </div>
              </div>

              {/* Shipping Cost */}
              <div className="db-expense-row">
                <div className="db-expense-head">
                  <span className="text-muted-foreground">Shipping Cost</span>
                  <span className="font-semibold text-foreground">- ${(stats.orderRevenue * 0.159 || 612.40).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground/60">(15.9%)</span></span>
                </div>
                <div className="db-expense-bar">
                  <div className="db-expense-bar-fill blue" style={{ width: '15.9%' }} />
                </div>
              </div>

              {/* Other Expenses */}
              <div className="db-expense-row">
                <div className="db-expense-head">
                  <span className="text-muted-foreground">Other Expenses</span>
                  <span className="font-semibold text-foreground">- ${(stats.orderRevenue * 0.025 || 97.55).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-muted-foreground/60">(2.5%)</span></span>
                </div>
                <div className="db-expense-bar">
                  <div className="db-expense-bar-fill gray" style={{ width: '2.5%' }} />
                </div>
              </div>

              {/* Estimated Profit Callout */}
              <div className="flex items-center justify-between text-xs bg-emerald-500/10 dark:bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/20">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Estimated Profit</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${((stats.netProfit ?? (stats.orderRevenue * 0.293)) || 1126.40).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-5 flex justify-center">
              <SvgDonut 
                value={marginPct > 0 ? marginPct : 29.3} 
                completed={stats.completedOrders || 30} 
                cancelled={stats.cancelledOrders || 0} 
                size={110} 
              />
            </div>
          </div>

          <button className="db-link-row border-t border-border/40 pt-3 mt-4 text-xs font-semibold w-full text-center hover:underline" onClick={() => navigate('/dashboard/ebay/orders')}>
            View full report →
          </button>
        </div>

      </div>

      {/* ── row 3: Tables and feeds ───────────────────────────────────── */}
      <div className="db-grid">

        {/* Recent Orders */}
        <div className="db-card db-col-3 db-fade-up flex flex-col" style={{ animationDelay: '0.28s' }}>
          <div className="db-card-head justify-between items-center">
            <div className="db-card-title">Recent Orders</div>
          </div>
          <div className="flex-1 overflow-x-auto mt-3">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold">
                  <th className="pb-2">ORDER ID</th>
                  <th className="pb-2">BUYER</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {mockOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30">
                    <td className="py-2 text-primary font-medium">{o.id}</td>
                    <td className="py-2 truncate max-w-[80px]">{o.buyer}</td>
                    <td className="py-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-semibold",
                        o.status === 'Paid' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        o.status === 'Shipped' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        o.status === 'Delivered' && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                        o.status === 'Cancelled' && "bg-red-500/10 text-red-600 dark:text-red-400"
                      )}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">{o.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-muted-foreground mt-3 flex items-center justify-between border-t border-border/40 pt-2">
            <span>Showing 1 to 5 of {totalOrders || 18} orders</span>
            <button className="hover:underline font-semibold" onClick={() => navigate('/dashboard/ebay/orders')}>View all orders →</button>
          </div>
        </div>

        {/* Listing Health */}
        <div className="db-card db-col-3 db-fade-up flex flex-col" style={{ animationDelay: '0.32s' }}>
          <div className="db-card-head justify-between items-center">
            <div className="db-card-title">Listing Health</div>
          </div>
          <div className="flex-1 space-y-3 mt-3">
            {[
              { label: 'Listings missing SKU', val: 12, color: 'bg-red-500' },
              { label: 'Listings with policy warnings', val: 7, color: 'bg-amber-500' },
              { label: 'Low stock listings', val: 18, color: 'bg-yellow-500' },
              { label: 'Price update needed', val: 5, color: 'bg-blue-500' },
              { label: 'Low margin listings (<10%)', val: 3, color: 'bg-red-400' }
            ].map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", h.color)} />
                  <span className="text-muted-foreground">{h.label}</span>
                </div>
                <span className="font-bold text-foreground">{h.val}</span>
              </div>
            ))}
          </div>
          <button className="db-btn-primary py-2 text-xs font-semibold w-full text-center mt-4 rounded-xl" onClick={() => navigate('/dashboard/ebay/listings')}>
            Fix listing issues
          </button>
        </div>

        {/* Action Center */}
        <div className="db-card db-col-3 db-fade-up flex flex-col" style={{ animationDelay: '0.36s' }}>
          <div className="db-card-head justify-between items-center">
            <div className="db-card-title">Action Center</div>
          </div>
          <div className="flex-1 space-y-2.5 mt-3">
            {[
              { label: 'Reconnect eBay account', desc: 'Token expires in 3 days', btn: 'Reconnect', action: () => navigate('/dashboard/ebay/settings/general') },
              { label: '7 orders need tracking', desc: 'Add tracking to avoid defects', btn: 'View Orders', action: () => navigate('/dashboard/ebay/orders') },
              { label: '12 listings missing cost', desc: 'Add cost to calculate profit', btn: 'Update Now', action: () => navigate('/dashboard/ebay/listings') },
              { label: '3 items are out of stock', desc: 'Restock to avoid lost sales', btn: 'View Listings', action: () => navigate('/dashboard/ebay/listings') },
              { label: 'Extension sync pending', desc: 'Open extension to sync', btn: 'Open', action: () => window.open('https://chrome.google.com/webstore', '_blank') }
            ].map((a, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">{a.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.desc}</div>
                </div>
                <button className="text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-lg shrink-0" onClick={a.action}>
                  {a.btn}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="db-card db-col-3 db-fade-up flex flex-col" style={{ animationDelay: '0.40s' }}>
          <div className="db-card-head justify-between items-center">
            <div className="db-card-title">Recent Activity</div>
          </div>
          <div className="flex-1 space-y-3 mt-3">
            {[
              { desc: '18 orders synced from eBay', time: '4 min ago' },
              { desc: '142 listings updated', time: '5 min ago' },
              { desc: 'Price updated for 12 listings', time: '22 min ago' },
              { desc: '3 orders marked as shipped', time: '1 hour ago' },
              { desc: 'eBay account connected', time: '2 hours ago' }
            ].map((act, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-muted-foreground leading-snug">{act.desc}</span>
                <span className="text-[10px] text-muted-foreground/70 shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
          <button className="db-link-row border-t border-border/40 pt-3 mt-4 text-xs font-semibold w-full text-center hover:underline" onClick={() => navigate('/dashboard/ebay/orders')}>
            View all activity →
          </button>
        </div>

      </div>

      {/* ── row 4: mini stats (with sparklines) ────────────────────────── */}
      <div className="db-grid" style={{ paddingBottom: 8 }}>
        {[
          { label: 'Active listings', val: stats.activeListings.toString(), trend: '↑ 8.4% vs last 7 days', cl: 'blue', spark: [42, 45, 43, 47, 48, stats.activeListings] },
          { label: 'Completed orders', val: stats.completedOrders.toString(), trend: '↑ 12.6% vs last 7 days', cl: 'green', spark: [18, 21, 20, 24, 25, stats.completedOrders] },
          { label: 'Avg. order value', val: totalOrders > 0 ? `$${(stats.orderRevenue / totalOrders).toFixed(2)}` : '$38.60', trend: '↑ 5.3% vs last 7 days', cl: 'amber', spark: [34.2, 35.8, 36.4, 37.1, 38.0, totalOrders > 0 ? (stats.orderRevenue / totalOrders) : 38.60] },
          { label: 'Unread alerts', val: stats.unreadAlerts.toString(), trend: '↓ 16.7% vs last 7 days', cl: 'violet', spark: [9, 8, 7, 6, 6, stats.unreadAlerts] }
        ].map((s, i) => (
          <div key={i} className="db-card lift db-col-3 db-fade-up" style={{ animationDelay: `${0.44 + i * 0.04}s` }}>
            <div className="db-ministat flex items-center justify-between">
              <div>
                <div className="db-mi-val text-xl font-bold">{s.val}</div>
                <div className="db-mi-lab text-xs text-muted-foreground mt-0.5">{s.label}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{s.trend}</div>
              </div>
              <div className="w-24 h-10">
                <Sparkline data={s.spark} color={s.cl === 'green' ? 'var(--db-success)' : s.cl === 'blue' ? 'var(--db-accent)' : s.cl === 'amber' ? 'var(--db-warning)' : '#8b5cf6'} id={`mini-${i}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
