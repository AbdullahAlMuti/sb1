import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Save, RefreshCw, Mail, AlertTriangle, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationSettingsData {
  id?: string;
  email_notifications_enabled: boolean;
  notify_out_of_stock: boolean;
  notify_low_stock: boolean;
  notify_price_increase: boolean;
  notify_price_decrease: boolean;
  price_change_threshold: number;
  notification_email: string;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email_notifications_enabled: true,
    notify_out_of_stock: true,
    notify_low_stock: true,
    notify_price_increase: true,
    notify_price_decrease: true,
    price_change_threshold: 10,
    notification_email: '',
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          email_notifications_enabled: data.email_notifications_enabled,
          notify_out_of_stock: data.notify_out_of_stock,
          notify_low_stock: data.notify_low_stock,
          notify_price_increase: data.notify_price_increase,
          notify_price_decrease: data.notify_price_decrease,
          price_change_threshold: Number(data.price_change_threshold),
          notification_email: data.notification_email || '',
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        email_notifications_enabled: settings.email_notifications_enabled,
        notify_out_of_stock: settings.notify_out_of_stock,
        notify_low_stock: settings.notify_low_stock,
        notify_price_increase: settings.notify_price_increase,
        notify_price_decrease: settings.notify_price_decrease,
        price_change_threshold: settings.price_change_threshold,
        notification_email: settings.notification_email || null,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('notification_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert(payload);

        if (error) throw error;
      }

      toast.success('Notification settings saved');
      fetchSettings();
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Get notified about inventory and price changes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-foreground font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable or disable all email notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.email_notifications_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, email_notifications_enabled: checked })}
            />
          </div>

          {/* Notification Email Override */}
          <div className="space-y-2">
            <Label htmlFor="notification_email" className="text-foreground">Notification Email (Optional)</Label>
            <Input
              id="notification_email"
              type="email"
              placeholder="Leave empty to use account email"
              value={settings.notification_email}
              onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
              className="bg-secondary/50"
              disabled={!settings.email_notifications_enabled}
            />
            <p className="text-xs text-muted-foreground">Override the default email for notifications</p>
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Notification Types</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <Label className="text-foreground">Out of Stock Alerts</Label>
                    <p className="text-xs text-muted-foreground">When a product becomes unavailable</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_out_of_stock}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_out_of_stock: checked })}
                  disabled={!settings.email_notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-amber-500" />
                  <div>
                    <Label className="text-foreground">Low Stock Warnings</Label>
                    <p className="text-xs text-muted-foreground">When stock falls below 10 units</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_low_stock}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_low_stock: checked })}
                  disabled={!settings.email_notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  <div>
                    <Label className="text-foreground">Price Increase Alerts</Label>
                    <p className="text-xs text-muted-foreground">When sourcing cost increases</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_price_increase}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_price_increase: checked })}
                  disabled={!settings.email_notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                  <div>
                    <Label className="text-foreground">Price Decrease Alerts</Label>
                    <p className="text-xs text-muted-foreground">When sourcing cost decreases</p>
                  </div>
                </div>
                <Switch
                  checked={settings.notify_price_decrease}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_price_decrease: checked })}
                  disabled={!settings.email_notifications_enabled}
                />
              </div>
            </div>
          </div>

          {/* Price Change Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold" className="text-foreground">Price Change Threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              min="1"
              max="100"
              value={settings.price_change_threshold}
              onChange={(e) => setSettings({ ...settings, price_change_threshold: parseFloat(e.target.value) || 10 })}
              className="bg-secondary/50 w-32"
              disabled={!settings.email_notifications_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Only notify when price changes by at least this percentage
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={isSaving}>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
