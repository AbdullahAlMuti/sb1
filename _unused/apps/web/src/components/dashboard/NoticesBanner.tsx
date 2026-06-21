import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useRealtimeNotices } from '@repo/api-client/hooks/useRealtimeSync';
import { Button } from '@repo/ui/components/ui/button';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active?: boolean;
  created_at?: string;
}

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

const typeColors = {
  info: 'bg-primary/10 border-primary/30 text-primary',
  warning: 'bg-amazon/10 border-amazon/30 text-amazon',
  error: 'bg-destructive/10 border-destructive/30 text-destructive',
  success: 'bg-success/10 border-success/30 text-success',
};

export function NoticesBanner() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchNotices = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter notices based on date range and map to interface
      const now = new Date();
      const rows = (data as any[]) || [];
      const activeNotices: Notice[] = rows.filter((notice) => {
        const startsAt = notice.starts_at ? new Date(notice.starts_at) : null;
        const endsAt = notice.ends_at ? new Date(notice.ends_at) : null;
        
        if (startsAt && startsAt > now) return false;
        if (endsAt && endsAt < now) return false;
        
        return true;
      }).map((notice) => ({
        id: String(notice.id),
        title: String(notice.title ?? ''),
        content: String(notice.content ?? ''),
        type: String(notice.type ?? 'info'),
        priority: Number(notice.priority ?? 0),
        starts_at: notice.starts_at ?? null,
        ends_at: notice.ends_at ?? null,
        is_active: notice.is_active ?? true,
        created_at: notice.created_at ?? undefined,
      }));

      setNotices(activeNotices);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Subscribe to realtime notice changes
  useRealtimeNotices(fetchNotices);

  // Load dismissed notices from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedNotices');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedIds(new Set(parsed));
      } catch (e) {
        // Invalid stored data
      }
    }
  }, []);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (visibleNotices.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleNotices.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [notices, dismissedIds]);

  const dismissNotice = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedNotices', JSON.stringify([...newDismissed]));
    
    // Adjust index if needed
    if (currentIndex >= visibleNotices.length - 1) {
      setCurrentIndex(Math.max(0, visibleNotices.length - 2));
    }
  };

  const visibleNotices = notices.filter(n => !dismissedIds.has(n.id));

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + visibleNotices.length) % visibleNotices.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleNotices.length);
  };

  if (isLoading || visibleNotices.length === 0) {
    return null;
  }

  const currentNotice = visibleNotices[currentIndex];
  const Icon = typeIcons[currentNotice.type as keyof typeof typeIcons] || Info;
  const colorClass = typeColors[currentNotice.type as keyof typeof typeColors] || typeColors.info;

  return (
    <div className="mb-6 relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentNotice.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`flex items-center gap-3 p-4 rounded-xl border ${colorClass}`}
        >
          {/* Previous Button */}
          {visibleNotices.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-background/50"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Notice Content */}
          <Icon className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">{currentNotice.title}</h4>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{currentNotice.content}</p>
          </div>

          {/* Slide Indicators */}
          {visibleNotices.length > 1 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {visibleNotices.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    idx === currentIndex 
                      ? 'bg-foreground w-4' 
                      : 'bg-foreground/30 hover:bg-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Next Button */}
          {visibleNotices.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-background/50"
              onClick={goToNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0 hover:bg-background/50"
            onClick={() => dismissNotice(currentNotice.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      </AnimatePresence>

      {/* Notice Counter */}
      {visibleNotices.length > 1 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          {currentIndex + 1} / {visibleNotices.length}
        </div>
      )}
    </div>
  );
}
