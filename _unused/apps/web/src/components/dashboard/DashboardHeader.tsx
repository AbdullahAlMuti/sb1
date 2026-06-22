import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Moon, Sun } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useTheme } from '@repo/ui/theme/useTheme';
import { useAlerts } from '@repo/api-client/hooks/useAlerts';
import { supabase } from '@repo/api-client/supabase/client';
import { cn } from '@repo/ui/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export function DashboardHeader() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Dismissed notices from localStorage
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());

  // Load dismissed notices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedNotices');
    if (stored) {
      try {
        setDismissedNoticeIds(new Set(JSON.parse(stored)));
      } catch (e) {}
    }
  }, []);

  const { alerts, unreadCount: unreadAlertsCount, markAsRead, markAllAsRead } = useAlerts();

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
  const totalUnreadCount = unreadAlertsCount + visibleNotices.length;

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
      </div>
    </header>
  );
}