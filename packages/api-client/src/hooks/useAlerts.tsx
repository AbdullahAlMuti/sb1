import { useState, useEffect } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';

export interface Alert {
  id: string;
  alert_type: string;
  message: string | null;
  status: string | null;
  created_at: string | null;
}

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
        setUnreadCount(data.filter(a => a.status === 'UNREAD').length);
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

  return { alerts, unreadCount, markAsRead, markAllAsRead };
}
