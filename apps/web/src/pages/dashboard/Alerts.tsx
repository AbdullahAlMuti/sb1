import { useState, useEffect, useCallback } from 'react';
import { FeatureGate } from '@/components/FeatureGate';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Megaphone, 
  Package,
  Check,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  created_at: string;
  is_active: boolean;
}

interface InventoryAlert {
  id: string;
  alert_type: string;
  message: string | null;
  status: string | null;
  created_at: string | null;
}

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

const typeColors = {
  info: 'bg-primary/10 border-primary/30 text-primary',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  error: 'bg-destructive/10 border-destructive/30 text-destructive',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
};

export default function Alerts() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());

  const fetchNotices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by date range
      const now = new Date();
      const activeNotices = ((data as any[]) || []).filter((notice) => {
        const startsAt = notice.starts_at ? new Date(notice.starts_at) : null;
        const endsAt = notice.ends_at ? new Date(notice.ends_at) : null;
        if (startsAt && startsAt > now) return false;
        if (endsAt && endsAt < now) return false;
        return true;
      });

      setNotices(activeNotices);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  }, []);

  const fetchInventoryAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select('id, alert_type, message, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInventoryAlerts(data || []);
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
    }
  }, [user]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchNotices(), fetchInventoryAlerts()]);
      setIsLoading(false);
    };
    loadAll();
  }, [fetchNotices, fetchInventoryAlerts]);

  // Load dismissed notices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedNotices');
    if (stored) {
      try {
        setDismissedNoticeIds(new Set(JSON.parse(stored)));
      } catch (e) {}
    }
  }, []);

  const dismissNotice = (id: string) => {
    const newDismissed = new Set(dismissedNoticeIds);
    newDismissed.add(id);
    setDismissedNoticeIds(newDismissed);
    localStorage.setItem('dismissedNotices', JSON.stringify([...newDismissed]));
    toast.success('Notice dismissed');
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('inventory_alerts')
        .update({ status: 'READ' })
        .eq('id', alertId);
      
      setInventoryAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, status: 'READ' } : a)
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAlertsAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('inventory_alerts')
        .update({ status: 'READ' })
        .eq('user_id', user.id)
        .eq('status', 'UNREAD');
      
      setInventoryAlerts(prev => prev.map(a => ({ ...a, status: 'READ' })));
      toast.success('All alerts marked as read');
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const visibleNotices = notices.filter(n => !dismissedNoticeIds.has(n.id));
  const unreadAlertsCount = inventoryAlerts.filter(a => a.status === 'UNREAD').length;
  const totalNotifications = visibleNotices.length + inventoryAlerts.length;

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return 'bg-amber-500/20 text-amber-600';
      case 'OUT_OF_STOCK': return 'bg-destructive/20 text-destructive';
      case 'PRICE_CHANGE': return 'bg-blue-500/20 text-blue-600';
      case 'BACK_IN_STOCK': return 'bg-emerald-500/20 text-emerald-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return 'Low Stock';
      case 'OUT_OF_STOCK': return 'Out of Stock';
      case 'PRICE_CHANGE': return 'Price Change';
      case 'BACK_IN_STOCK': return 'Back in Stock';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FeatureGate flag="price_monitoring">
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            View announcements and inventory alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Bell className="h-3 w-3" />
            {totalNotifications} total
          </Badge>
          {unreadAlertsCount > 0 && (
            <Badge variant="destructive">{unreadAlertsCount} unread</Badge>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Announcements</p>
                <p className="text-3xl font-bold">{visibleNotices.length}</p>
              </div>
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Alerts</p>
                <p className="text-3xl font-bold">{inventoryAlerts.length}</p>
              </div>
              <Package className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-3xl font-bold text-destructive">{unreadAlertsCount}</p>
              </div>
              <Bell className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
            {visibleNotices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{visibleNotices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory Alerts
            {unreadAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadAlertsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Platform Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleNotices.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="text-muted-foreground mt-2">No announcements</p>
                  <p className="text-sm text-muted-foreground/70">
                    Check back later for platform updates
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {visibleNotices.map((notice) => {
                    const Icon = typeIcons[notice.type as keyof typeof typeIcons] || Info;
                    const colorClass = typeColors[notice.type as keyof typeof typeColors] || typeColors.info;
                    
                    return (
                      <motion.div
                        key={notice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 rounded-xl border ${colorClass}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{notice.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{notice.content}</p>
                              <p className="text-xs text-muted-foreground/70 mt-2">
                                {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissNotice(notice.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Alerts
              </CardTitle>
              {unreadAlertsCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAlertsAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {inventoryAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="text-muted-foreground mt-2">No inventory alerts</p>
                  <p className="text-sm text-muted-foreground/70">
                    Alerts will appear when inventory changes occur
                  </p>
                </div>
              ) : (
                inventoryAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 rounded-lg border ${
                      alert.status === 'UNREAD' ? 'bg-primary/5 border-primary/20' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getAlertTypeColor(alert.alert_type)}>
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                          {alert.status === 'UNREAD' && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-foreground">{alert.message || 'No message'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.created_at 
                            ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })
                            : 'Unknown time'}
                        </p>
                      </div>
                      {alert.status === 'UNREAD' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAlertAsRead(alert.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </FeatureGate>
  );
}