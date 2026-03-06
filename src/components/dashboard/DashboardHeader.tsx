import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Mail, Calendar, Shield, Settings, CreditCard, LogOut, Camera, Pencil, Check, X, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface Alert {
  id: string;
  alert_type: string;
  message: string | null;
  status: string | null;
  created_at: string | null;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export function DashboardHeader() {
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { planName, subscribed, subscriptionEnd, plan, limits, usage, openCustomerPortal } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Dismissed notices from localStorage
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEditName(profile?.full_name || '');
  }, [profile?.full_name]);

  // Load dismissed notices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedNotices');
    if (stored) {
      try {
        setDismissedNoticeIds(new Set(JSON.parse(stored)));
      } catch (e) {}
    }
  }, []);

  // Fetch inventory alerts
  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select('id, alert_type, message, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAlerts(data);
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch active notices
  useEffect(() => {
    if (!user) return;

    const fetchNotices = async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, content, type, created_at, starts_at, ends_at')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        // Filter by date range (RLS already filters, but double-check client-side)
        const now = new Date();
        const activeNotices = (data as any[]).filter((notice) => {
          const startsAt = notice.starts_at ? new Date(notice.starts_at) : null;
          const endsAt = notice.ends_at ? new Date(notice.ends_at) : null;
          if (startsAt && startsAt > now) return false;
          if (endsAt && endsAt < now) return false;
          return true;
        });
        setNotices(activeNotices);
      }
    };

    fetchNotices();

    const channel = supabase
      .channel('notices-header-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notices',
        },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate total unread count (alerts + visible notices)
  const visibleNotices = notices.filter(n => !dismissedNoticeIds.has(n.id));
  const unreadAlertsCount = alerts.filter((a) => a.status === 'UNREAD').length;
  const totalUnreadCount = unreadAlertsCount + visibleNotices.length;

  const markAsRead = async (alertId: string) => {
    await supabase
      .from('inventory_alerts')
      .update({ status: 'READ' })
      .eq('id', alertId);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('inventory_alerts')
      .update({ status: 'READ' })
      .eq('user_id', user.id)
      .eq('status', 'UNREAD');
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return 'text-destructive bg-destructive/10';
      case 'LOW_STOCK':
        return 'text-amber-500 bg-amber-500/10';
      case 'PRICE_CHANGE':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return 'Out of Stock';
      case 'LOW_STOCK':
        return 'Low Stock';
      case 'PRICE_CHANGE':
        return 'Price Change';
      default:
        return type;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editName.trim() })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Name updated successfully');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(profile?.full_name || '');
    setIsEditingName(false);
  };

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    await signOut();
    navigate('/');
  };

  const creditsTotal = subscribed ? (usage?.credits_total ?? limits?.credits_per_month ?? 0) : 0;
  const creditsRemaining = subscribed
    ? (usage?.credits_remaining ?? Math.max((profile?.credits ?? 0), 0))
    : 0;
  const showCredits = Boolean(subscribed);
  const isExpired = Boolean(subscriptionEnd && new Date(subscriptionEnd) < new Date());

  return (
    <header className="h-14 sm:h-16 bg-gradient-to-r from-primary/5 via-accent/10 to-transparent flex items-center justify-between px-4 sm:px-6 border-b border-border/50">
      {/* Welcome Message */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xs sm:text-sm font-medium text-foreground truncate">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Seller'}! 👋
        </h1>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Search Button - Hidden on mobile */}
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-muted hidden sm:flex">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </Button>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-muted"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
      <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-muted">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-0 right-0 sm:top-1 sm:right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 bg-popover">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadAlertsCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {visibleNotices.length === 0 && alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center px-4">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Announcements and alerts will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Platform Notices */}
                {visibleNotices.map((notice) => (
                  <button
                    key={`notice-${notice.id}`}
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/dashboard/alerts');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors bg-primary/5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase mt-0.5 bg-primary/20 text-primary">
                        Announcement
                      </span>
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1.5 line-clamp-1">
                      {notice.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {notice.content}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                    </p>
                  </button>
                ))}
                
                {/* Inventory Alerts */}
                {alerts.map((alert) => (
                  <button
                    key={`alert-${alert.id}`}
                    onClick={() => {
                      markAsRead(alert.id);
                      setIsNotificationsOpen(false);
                      navigate('/dashboard/alerts');
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      alert.status === 'UNREAD' && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium uppercase mt-0.5',
                          getAlertTypeColor(alert.alert_type)
                        )}
                      >
                        {getAlertTypeLabel(alert.alert_type)}
                      </span>
                      {alert.status === 'UNREAD' && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-1.5 line-clamp-2">
                      {alert.message || 'No message'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.created_at
                        ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })
                        : 'Unknown time'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsNotificationsOpen(false);
                navigate('/dashboard/alerts');
              }}
            >
              View all notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* User Profile Dropdown */}
      <Popover open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border hover:opacity-80 transition-opacity cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {user?.email || ''}
              </p>
            </div>
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-border">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          {/* Profile Header */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative group">
                <Avatar className="h-14 w-14 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm"
                      placeholder="Your name"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-primary"
                      onClick={handleSaveName}
                      disabled={isSaving}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/name">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {profile?.full_name || 'User'}
                    </h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover/name:opacity-100 transition-opacity"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Plan & Stats */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <Badge 
                variant={subscribed ? 'default' : 'secondary'}
                className={cn(
                  "font-medium",
                  subscribed && "bg-primary/10 text-primary border-primary/20"
                )}
              >
                <Shield className="h-3 w-3 mr-1" />
                {(plan?.display_name || planName) || 'No Plan'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Credits</span>
              <span className="text-sm font-medium text-foreground">
                {showCredits ? (
                  <>
                    {creditsRemaining}
                    {creditsTotal ? ` / ${creditsTotal}` : ''}
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>

            {subscriptionEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{isExpired ? 'Expired' : 'Renews'}</span>
                <span className="text-sm text-foreground">
                  {format(new Date(subscriptionEnd), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            {limits?.max_listings !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Listings</span>
                <span className="text-sm font-medium text-foreground">
                  {usage?.listings_active ?? 0} / {limits.max_listings}
                </span>
              </div>
            )}



            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm text-foreground">
                {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
              </span>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                  Admin
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="p-2 space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-9"
              onClick={() => {
                setIsProfileOpen(false);
                if (subscribed) {
                  openCustomerPortal();
                } else {
                  navigate('/dashboard/subscription');
                }
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {subscribed ? (isExpired ? 'Renew Subscription' : 'Manage Billing') : 'Upgrade Plan'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-9"
              onClick={() => {
                setIsProfileOpen(false);
                navigate('/dashboard/settings');
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-9 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      </div>
    </header>
  );
}