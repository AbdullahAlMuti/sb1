import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'profiles' | 'notices' | 'plans' | 'user_plans' | 'user_roles' | 'listings';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeSubscription {
  table: TableName;
  event?: EventType;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export function useRealtimeSync(
  subscriptions: RealtimeSubscription[],
  dependencies: any[] = []
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (subscriptions.length === 0) return;

    // Create a unique channel name
    const channelName = `realtime-sync-${Date.now()}`;
    
    let channel = supabase.channel(channelName);

    // Add subscriptions for each table/event combination
    subscriptions.forEach(({ table, event = '*', filter, callback }) => {
      const config: any = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        config.filter = filter;
      }

      channel = channel.on(
        'postgres_changes',
        config,
        (payload) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          callback(payload);
        }
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`[Realtime] Channel status: ${status}`);
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return channelRef.current;
}

// Hook for subscribing to a single table
export function useRealtimeTable<T>(
  table: TableName,
  onInsert?: (record: T) => void,
  onUpdate?: (record: T, oldRecord: T) => void,
  onDelete?: (oldRecord: T) => void,
  filter?: string
) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new as T);
          break;
        case 'UPDATE':
          onUpdate?.(payload.new as T, payload.old as T);
          break;
        case 'DELETE':
          onDelete?.(payload.old as T);
          break;
      }
    },
    [onInsert, onUpdate, onDelete]
  );

  useRealtimeSync(
    [{ table, event: '*', filter, callback: handleChange }],
    [table, filter, handleChange]
  );
}

// Hook for notices - broadcasts to all users
export function useRealtimeNotices(onNoticeChange: () => void) {
  useRealtimeSync(
    [
      {
        table: 'notices',
        event: '*',
        callback: () => {
          console.log('[Realtime] Notice changed, refreshing...');
          onNoticeChange();
        },
      },
    ],
    [onNoticeChange]
  );
}

// Hook for user profile updates
export function useRealtimeProfile(
  userId: string | undefined,
  onProfileChange: () => void
) {
  useRealtimeSync(
    userId
      ? [
          {
            table: 'profiles',
            event: 'UPDATE',
            filter: `id=eq.${userId}`,
            callback: () => {
              console.log('[Realtime] Profile changed, refreshing...');
              onProfileChange();
            },
          },
        ]
      : [],
    [userId, onProfileChange]
  );
}

// Hook for plan changes (admin broadcasts to all)
export function useRealtimePlans(onPlanChange: () => void) {
  useRealtimeSync(
    [
      {
        table: 'plans',
        event: '*',
        callback: () => {
          console.log('[Realtime] Plans changed, refreshing...');
          onPlanChange();
        },
      },
    ],
    [onPlanChange]
  );
}

// Hook for user subscription changes
export function useRealtimeUserPlan(
  userId: string | undefined,
  onPlanChange: () => void
) {
  useRealtimeSync(
    userId
      ? [
          {
            table: 'user_plans',
            event: '*',
            filter: `user_id=eq.${userId}`,
            callback: () => {
              console.log('[Realtime] User plan changed, refreshing...');
              onPlanChange();
            },
          },
        ]
      : [],
    [userId, onPlanChange]
  );
}
