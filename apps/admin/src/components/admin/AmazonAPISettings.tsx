import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Key, Clock, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@repo/api-client/supabase/client';
import { Badge } from '@repo/ui/components/ui/badge';

interface AmazonSettings {
  id: string;
  client_id: string | null;
  marketplace: string | null;
  update_frequency_hours: number | null;
  is_active: boolean | null;
  last_sync_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export default function AmazonAPISettings() {
  const [settings, setSettings] = useState<AmazonSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state for credentials
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [marketplace, setMarketplace] = useState('NA');
  const [updateFrequency, setUpdateFrequency] = useState(2);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('amazon_settings')
        .select('id, client_id, marketplace, update_frequency_hours, is_active, last_sync_at, created_at, updated_at')
        .single();

      if (error) throw error;

      if (data) {
        const settings: AmazonSettings = {
          id: data.id,
          client_id: data.client_id,
          marketplace: data.marketplace,
          update_frequency_hours: data.update_frequency_hours,
          is_active: data.is_active,
          last_sync_at: (data as any).last_sync_at ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setSettings(settings);
        setClientId(data.client_id === 'YOUR_CLIENT_ID' ? '' : data.client_id || '');
        setClientSecret('');
        setRefreshToken('');
        setMarketplace(data.marketplace || 'NA');
        setUpdateFrequency(data.update_frequency_hours || 2);
        setIsActive(data.is_active || false);
      }
    } catch (error) {
      console.error('Error fetching Amazon settings:', error);
      toast.error('Failed to load Amazon API settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const updatePayload: Record<string, string | number | boolean> = {
        client_id: clientId || 'YOUR_CLIENT_ID',
        marketplace,
        update_frequency_hours: updateFrequency,
        is_active: isActive,
      };

      if (clientSecret) {
        updatePayload.client_secret = clientSecret;
      }

      if (refreshToken) {
        updatePayload.refresh_token = refreshToken;
      }

      const { error } = await supabase
        .from('amazon_settings')
        .update(updatePayload)
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Amazon API settings saved successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error saving Amazon settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('amazon-inventory-sync', {
        body: { action: 'sync-all' },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Synced ${data.results?.length || 0} listings`);
        fetchSettings();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing inventory:', error);
      toast.error('Failed to sync inventory');
    } finally {
      setIsSyncing(false);
    }
  };

  const hasStoredSettings = Boolean(settings?.id && clientId);
  const isCredentialsConfigured = Boolean(clientId && (hasStoredSettings || (clientSecret && refreshToken)));

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Key className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Amazon API Settings</h2>
            <p className="text-sm text-muted-foreground">Configure inventory & price tracking</p>
          </div>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Status Banner */}
        {!isCredentialsConfigured && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <p className="text-sm text-amber-400">
              API credentials not configured. Enter your Amazon Advertising API credentials to enable real-time tracking.
            </p>
          </div>
        )}

        {isCredentialsConfigured && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-emerald-400">
              API credentials configured. {settings?.last_sync_at 
                ? `Last sync: ${new Date(settings.last_sync_at).toLocaleString()}`
                : 'No sync performed yet.'}
            </p>
          </div>
        )}

        {/* API Credentials */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">API Credentials</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientId" className="text-foreground">Client ID</Label>
              <Input
                id="clientId"
                type="password"
                placeholder="Enter Amazon Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret" className="text-foreground">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder={hasStoredSettings ? "Leave blank to keep existing secret" : "Enter Amazon Client Secret"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshToken" className="text-foreground">Refresh Token</Label>
              <Input
                id="refreshToken"
                type="password"
                placeholder={hasStoredSettings ? "Leave blank to keep existing token" : "Enter Amazon Refresh Token"}
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          </div>
        </div>

        {/* Marketplace & Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="marketplace" className="text-foreground">Marketplace Region</Label>
            <Select value={marketplace} onValueChange={setMarketplace}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NA">North America (US, CA, MX, BR)</SelectItem>
                <SelectItem value="EU">Europe (UK, DE, FR, IT, ES)</SelectItem>
                <SelectItem value="FE">Far East (JP, AU, SG)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-foreground">Update Frequency</Label>
            <Select value={updateFrequency.toString()} onValueChange={(v) => setUpdateFrequency(parseInt(v))}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 hour</SelectItem>
                <SelectItem value="2">Every 2 hours</SelectItem>
                <SelectItem value="4">Every 4 hours</SelectItem>
                <SelectItem value="6">Every 6 hours</SelectItem>
                <SelectItem value="12">Every 12 hours</SelectItem>
                <SelectItem value="24">Every 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between py-4 border-t border-border">
          <div>
            <Label className="text-foreground">Enable Auto-Sync</Label>
            <p className="text-sm text-muted-foreground">Automatically sync inventory based on frequency</p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={!isCredentialsConfigured}
          />
        </div>

        {/* Sync Info */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm text-foreground">Rate Limiting</p>
            <p className="text-xs text-muted-foreground">
              Products are synced one at a time with 1 second gap between API calls to comply with Amazon's rate limits.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleSyncNow}
            disabled={isSyncing || !isCredentialsConfigured}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="ml-auto"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
