import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Activity, 
  Zap, 
  Database, 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Download,
  CalendarIcon,
  ArrowUpRight,
  Check,
  HardDrive,
  Wifi
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, eachWeekOfInterval, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';
type UsageTab = 'api' | 'bandwidth' | 'storage';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminUsage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState<UsageTab>('api');

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'week':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case 'month':
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case 'year':
        return { from: startOfDay(subDays(now, 365)), to: endOfDay(now) };
      case 'custom':
        return customDateRange?.from && customDateRange?.to
          ? { from: startOfDay(customDateRange.from), to: endOfDay(customDateRange.to) }
          : { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      default:
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
    }
  }, [datePreset, customDateRange]);

  // Fetch usage data from usage_logs table
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['admin-usage', dateRange],
    queryFn: async () => {
      const [usageLogs, profiles, plans] = await Promise.all([
        supabase
          .from('usage_logs')
          .select('*')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: true }),
        // email is no longer stored in profiles; fetch only existing columns
        supabase.from('profiles').select('id, plan_id, credits'),
        supabase.from('plans').select('*'),
      ]);

      return {
        usageLogs: (usageLogs.data || []) as Array<{ credits_used?: number; user_id?: string; created_at?: string }>,
        profiles: profiles.data || [],
        plans: plans.data || [],
      };
    },
  });

  // Calculate usage stats
  const stats = useMemo(() => {
    if (!usageData) return null;

    const { usageLogs, profiles, plans } = usageData;
    
    const totalApiCalls = usageLogs.length;
    const totalCreditsUsed = usageLogs.reduce((sum, log) => sum + (log.credits_used || 0), 0);
    const activeUsers = new Set(usageLogs.map(log => log.user_id)).size;
    const totalUsers = profiles.length;
    
    // Calculate API calls limit (mock - based on plan credits)
    const totalCreditsLimit = profiles.reduce((sum, profile) => {
      const plan = plans.find(p => p.id === profile.plan_id);
      return sum + (plan?.credits_per_month || 100);
    }, 0);

    // Mock storage and bandwidth (would come from actual metrics in production)
    const storageUsed = 284; // GB
    const storageLimit = 500; // GB
    const bandwidthUsed = 1.8; // TB
    const bandwidthLimit = 5; // TB

    return {
      apiCalls: {
        current: totalApiCalls,
        limit: Math.max(1000000, totalApiCalls * 1.2),
        change: 12.5,
        unit: '',
      },
      storage: {
        current: storageUsed,
        limit: storageLimit,
        change: 8,
        unit: 'GB',
      },
      bandwidth: {
        current: bandwidthUsed,
        limit: bandwidthLimit,
        change: 15,
        unit: 'TB',
      },
      activeUsers: {
        current: activeUsers,
        limit: totalUsers,
        change: 5,
        unit: '',
      },
      totalCreditsUsed,
      totalCreditsLimit,
    };
  }, [usageData]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!usageData?.usageLogs) return [];

    const { usageLogs } = usageData;
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    
    let intervals: Date[];
    let formatStr: string;
    
    if (daysDiff <= 1) {
      intervals = Array.from({ length: 24 }, (_, i) => new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate(), i));
      formatStr = 'HH:00';
    } else if (daysDiff <= 31) {
      intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      formatStr = 'MMM d';
    } else if (daysDiff <= 90) {
      intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to }, { weekStartsOn: 1 });
      formatStr = 'MMM d';
    } else {
      intervals = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      formatStr = 'MMM yyyy';
    }

    return intervals.map(interval => {
      const nextInterval = daysDiff <= 1 
        ? new Date(interval.getTime() + 60 * 60 * 1000)
        : daysDiff <= 31 
          ? new Date(interval.getTime() + 24 * 60 * 60 * 1000)
          : daysDiff <= 90
            ? new Date(interval.getTime() + 7 * 24 * 60 * 60 * 1000)
            : new Date(interval.getFullYear(), interval.getMonth() + 1, 1);

      const periodLogs = usageLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= interval && logDate < nextInterval;
      });

      return {
        name: format(interval, formatStr),
        apiCalls: periodLogs.length,
        bandwidth: Math.round(periodLogs.length * 0.5 + Math.random() * 20),
        storage: Math.round(280 + Math.random() * 10),
      };
    });
  }, [usageData?.usageLogs, dateRange]);

  // Resource limits data for the right panel
  const resourceLimits = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        label: 'API Calls',
        current: stats.apiCalls.current,
        limit: stats.apiCalls.limit,
        percentage: (stats.apiCalls.current / stats.apiCalls.limit) * 100,
        color: 'bg-primary',
        format: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString(),
        limitFormat: (val: number) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString(),
      },
      {
        label: 'Storage',
        current: stats.storage.current,
        limit: stats.storage.limit,
        percentage: (stats.storage.current / stats.storage.limit) * 100,
        color: 'bg-emerald-500',
        format: (val: number) => `${val}`,
        limitFormat: (val: number) => `${val} GB`,
      },
      {
        label: 'Bandwidth',
        current: stats.bandwidth.current,
        limit: stats.bandwidth.limit,
        percentage: (stats.bandwidth.current / stats.bandwidth.limit) * 100,
        color: 'bg-orange-500',
        format: (val: number) => `${val}`,
        limitFormat: (val: number) => `${val} TB`,
      },
      {
        label: 'Team Members',
        current: stats.activeUsers.current,
        limit: stats.activeUsers.limit,
        percentage: (stats.activeUsers.current / stats.activeUsers.limit) * 100,
        color: 'bg-violet-500',
        format: (val: number) => val.toString(),
        limitFormat: (val: number) => val.toString(),
      },
    ];
  }, [stats]);

  // Activity log data
  const activityLogs = useMemo(() => {
    if (!usageData?.usageLogs) return [];
    
    const recentLogs = usageData.usageLogs.slice(-10).reverse();
    
    const activities = [
      { icon: ArrowUpRight, title: 'API rate limit increased', description: 'Upgraded to Professional plan', time: '2 hours ago', type: 'info' },
      { icon: AlertTriangle, title: 'High API usage detected', description: 'Approaching 85% of monthly limit', time: '5 hours ago', type: 'warning' },
      { icon: Check, title: 'Storage optimization completed', description: 'Freed up 45 GB of storage space', time: '1 day ago', type: 'success' },
      { icon: Users, title: 'New team members added', description: '12 users added to workspace', time: '2 days ago', type: 'info' },
    ];

    return activities;
  }, [usageData?.usageLogs]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getDateLabel = () => {
    return format(dateRange.to, 'EEE, MMM d yyyy');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usage Analytics</h1>
          <p className="text-muted-foreground">Monitor your resource consumption and usage patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {getDateLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {datePreset === 'custom' && (
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={setCustomDateRange}
                  numberOfMonths={2}
                />
              )}
            </PopoverContent>
          </Popover>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats && (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                    +{stats.apiCalls.change}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">API Calls</p>
                <p className="text-2xl font-bold">{formatNumber(stats.apiCalls.current)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(stats.apiCalls.limit - stats.apiCalls.current)} remaining
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                    +{stats.storage.change}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">{stats.storage.current} GB</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.storage.limit - stats.storage.current} GB remaining
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Wifi className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                    +{stats.bandwidth.change}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Bandwidth</p>
                <p className="text-2xl font-bold">{stats.bandwidth.current} TB</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(stats.bandwidth.limit - stats.bandwidth.current).toFixed(1)} TB remaining
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20 border-violet-200 dark:border-violet-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                    +{stats.activeUsers.change}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeUsers.current}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeUsers.limit - stats.activeUsers.current} seats remaining
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Usage Trends</CardTitle>
                  <CardDescription>API calls and bandwidth over time</CardDescription>
                </div>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UsageTab)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="api" className="text-xs px-3">API Calls</TabsTrigger>
                    <TabsTrigger value="bandwidth" className="text-xs px-3">Bandwidth</TabsTrigger>
                    <TabsTrigger value="storage" className="text-xs px-3">Storage</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeTab === 'api' ? 'apiCalls' : activeTab === 'bandwidth' ? 'bandwidth' : 'storage'}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorApi)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Resources Limits Log */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Resources Limits</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    "p-2 rounded-full",
                    log.type === 'warning' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    log.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  )}>
                    <log.icon className={cn(
                      "h-4 w-4",
                      log.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                      log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                      'text-blue-600 dark:text-blue-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{log.title}</p>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Resource Limits */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resources Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {resourceLimits.map((resource, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{resource.label}</span>
                    <span className="font-medium">
                      {resource.format(resource.current)} / {resource.limitFormat(resource.limit)}
                    </span>
                  </div>
                  <Progress 
                    value={resource.percentage} 
                    className={cn("h-2", resource.color.replace('bg-', '[&>div]:bg-'))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {resource.percentage.toFixed(1)}% used
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Approaching Limit Warning */}
          {stats && (stats.apiCalls.current / stats.apiCalls.limit) > 0.8 && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-orange-800 dark:text-orange-200">Approaching Limit</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      You're using {((stats.apiCalls.current / stats.apiCalls.limit) * 100).toFixed(1)}% of your API calls. 
                      Consider upgrading your plan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}