import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { Button } from '@repo/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw, AlertTriangle, CheckCircle, Info, Play } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Badge } from '@repo/ui/components/ui/badge';

export function EbaySyncSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState('60'); // Minutes
  const [syncState, setSyncState] = useState<string>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // 1. Fetch User Settings
  useEffect(() => {
    let channel: any;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user-specific settings
        const { data, error } = await (supabase
          .from('user_ebay_settings' as any)
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle() as any);

        if (error) throw error;

        if (data) {
          setSyncEnabled(data.is_sync_enabled !== false);
          setSyncInterval(data.sync_frequency || '60');
          setSyncState(data.sync_state || 'idle');
          setLastSyncAt(data.last_sync_requested_at);
        } else {
          // If no row exists, we default to enabled and 1 hour
          setSyncEnabled(true);
          setSyncInterval('60');
          setSyncState('idle');
        }

        // Subscribe to real-time updates on this user's settings row
        channel = supabase
          .channel('user-ebay-settings-changes')
          .on(
            'postgres_changes' as any,
            {
              event: '*',
              schema: 'public',
              table: 'user_ebay_settings',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const updated = payload.new as any;
              if (updated) {
                setSyncEnabled(updated.is_sync_enabled !== false);
                setSyncInterval(updated.sync_frequency || '60');
                setSyncState(updated.sync_state || 'idle');
                setLastSyncAt(updated.last_sync_requested_at);
              }
            }
          )
          .subscribe();

      } catch (error: any) {
        console.error('Error loading eBay settings:', error);
        toast.error('Failed to load eBay sync settings.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // 2. Save Settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save settings.');
        return;
      }

      const { error } = await (supabase
        .from('user_ebay_settings' as any)
        .upsert({
          user_id: user.id,
          is_sync_enabled: syncEnabled,
          sync_frequency: syncInterval,
          updated_at: new Date().toISOString()
        }) as any);

      if (error) throw error;
      toast.success('Sync settings saved successfully.');

      // Notify Extension locally if page context allows
      window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, window.location.origin);

    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Trigger manual sync
  const triggerSyncNow = async () => {
    try {
      setTriggering(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to trigger a sync.');
        return;
      }

      const { error } = await (supabase
        .from('user_ebay_settings' as any)
        .upsert({
          user_id: user.id,
          sync_state: 'reset_requested',
          last_sync_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }) as any);

      if (error) throw error;
      toast.success('Sync requested. Opening your extension will begin the sync.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to trigger sync.');
    } finally {
      setTriggering(false);
    }
  };

  // Map sync state to status badge
  const renderSyncStateBadge = () => {
    switch (syncState) {
      case 'syncing':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 flex items-center gap-1 w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing...
          </Badge>
        );
      case 'reset_requested':
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15 flex items-center gap-1 w-fit">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Sync Requested
          </Badge>
        );
      case 'waiting_for_user_session':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3.5 w-3.5" />
            eBay Session Required
          </Badge>
        );
      case 'idle':
      default:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15 flex items-center gap-1 w-fit">
            <CheckCircle className="h-3.5 w-3.5" />
            Connected & Idle
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">eBay Sync Configuration</h2>
        <p className="text-xs text-muted-foreground">
          Configure how the SellerSuit extension synchronizes your eBay orders.
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Indicator */}
        <div className="py-4 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Extension Status</span>
              {renderSyncStateBadge()}
            </div>
            
            <Button 
              onClick={triggerSyncNow} 
              disabled={triggering || syncState === 'syncing' || syncState === 'reset_requested'}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              {triggering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
              Sync Now
            </Button>
          </div>
          
          {lastSyncAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Last sync requested: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold">Automatic Sync</Label>
            <p className="text-xs text-muted-foreground">Enable background syncing of your orders.</p>
          </div>
          <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
        </div>

        {/* Sync Interval */}
        <div className="space-y-2 py-2">
          <Label className="text-sm font-semibold">Sync Frequency</Label>
          <Select value={syncInterval} onValueChange={setSyncInterval}>
            <SelectTrigger className="w-full sm:w-[240px] h-9 text-sm">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Every 30 Minutes</SelectItem>
              <SelectItem value="60">Every 1 Hour</SelectItem>
              <SelectItem value="120">Every 2 Hours</SelectItem>
              <SelectItem value="360">Every 6 Hours</SelectItem>
              <SelectItem value="720">Every 12 Hours</SelectItem>
              <SelectItem value="1440">Every 24 Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={saveSettings} disabled={saving} size="sm" className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
