import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Key, Globe, Shield, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@repo/api-client/supabase/client';
import AmazonAPISettings from '@/components/admin/AmazonAPISettings';
import { PageHeader } from '@/core/ui/PageHeader';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: 'SellerSuit',
    supportEmail: 'support@sellersuit.com',
    enableRegistration: true,
    requireEmailVerification: true,
    maxSessionsPerUser: 5,
    maintenanceMode: false,
  });

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [globalAutoFulfillmentEnabled, setGlobalAutoFulfillmentEnabled] = useState(true);

  const [whatsApp, setWhatsApp] = useState({
    supportNumber: '',
    salesNumber: '',
    orderNumber: '',
    adminNumber: '',
    dashboardEnabled: false,
    dashboardTemplate: 'Hi, I need help.',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAdminSettings();
  }, []);

  const fetchAdminSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key,value')
        .in('key', [
          'gemini_api_key',
          'support_whatsapp_number',
          'sales_whatsapp_number',
          'order_whatsapp_number',
          'admin_whatsapp_number',
          'whatsapp_dashboard_enabled',
          'whatsapp_dashboard_template',
          'global_auto_fulfillment_enabled',
        ]);

      if (error) throw error;

      const map = new Map<string, string | null>();
      for (const row of data || []) map.set(row.key, row.value ?? null);

      setGeminiApiKey(map.get('gemini_api_key') || '');
      setGlobalAutoFulfillmentEnabled((map.get('global_auto_fulfillment_enabled') || 'true').toLowerCase() === 'true');
      setWhatsApp((prev) => ({
        ...prev,
        supportNumber: map.get('support_whatsapp_number') || '',
        salesNumber: map.get('sales_whatsapp_number') || '',
        orderNumber: map.get('order_whatsapp_number') || '',
        adminNumber: map.get('admin_whatsapp_number') || '',
        dashboardEnabled: (map.get('whatsapp_dashboard_enabled') || '').toLowerCase() === 'true',
        dashboardTemplate: map.get('whatsapp_dashboard_template') || prev.dashboardTemplate,
      }));
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      toast.error('Failed to load platform settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const digitsOnly = (s: string) => (s || '').replace(/\D/g, '').trim();
      const now = new Date().toISOString();

      const rows = [
        { key: 'gemini_api_key', value: geminiApiKey || null, updated_at: now },
        { key: 'support_whatsapp_number', value: digitsOnly(whatsApp.supportNumber) || null, updated_at: now },
        { key: 'sales_whatsapp_number', value: digitsOnly(whatsApp.salesNumber) || null, updated_at: now },
        { key: 'order_whatsapp_number', value: digitsOnly(whatsApp.orderNumber) || null, updated_at: now },
        { key: 'admin_whatsapp_number', value: digitsOnly(whatsApp.adminNumber) || null, updated_at: now },
        { key: 'whatsapp_dashboard_enabled', value: whatsApp.dashboardEnabled ? 'true' : 'false', updated_at: now },
        { key: 'whatsapp_dashboard_template', value: (whatsApp.dashboardTemplate || '').trim() || null, updated_at: now },
        { key: 'global_auto_fulfillment_enabled', value: globalAutoFulfillmentEnabled ? 'true' : 'false', updated_at: now },
      ];

      const { error } = await supabase
        .from('admin_settings')
        .upsert(rows as any, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <PageHeader title="Platform Settings" description="Configure global platform settings and AI integrations" icon={Settings} />


      {/* WhatsApp Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-whatsapp flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-whatsapp-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">WhatsApp</h2>
            <p className="text-sm text-muted-foreground">Click-to-chat numbers, toggles, and templates</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supportWhatsApp" className="text-foreground">Support WhatsApp Number</Label>
              <Input
                id="supportWhatsApp"
                inputMode="numeric"
                placeholder="e.g. 15551234567"
                value={whatsApp.supportNumber}
                onChange={(e) => setWhatsApp({ ...whatsApp, supportNumber: e.target.value })}
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">International format, digits only (no +, no spaces).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesWhatsApp" className="text-foreground">Sales WhatsApp Number</Label>
              <Input
                id="salesWhatsApp"
                inputMode="numeric"
                placeholder="e.g. 15559876543"
                value={whatsApp.salesNumber}
                onChange={(e) => setWhatsApp({ ...whatsApp, salesNumber: e.target.value })}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderWhatsApp" className="text-foreground">Orders WhatsApp Number</Label>
              <Input
                id="orderWhatsApp"
                inputMode="numeric"
                placeholder="e.g. 15550001111"
                value={whatsApp.orderNumber}
                onChange={(e) => setWhatsApp({ ...whatsApp, orderNumber: e.target.value })}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminWhatsApp" className="text-foreground">Admin WhatsApp Number</Label>
              <Input
                id="adminWhatsApp"
                inputMode="numeric"
                placeholder="e.g. 15550002222"
                value={whatsApp.adminNumber}
                onChange={(e) => setWhatsApp({ ...whatsApp, adminNumber: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Enable WhatsApp on Dashboard</Label>
              <p className="text-sm text-muted-foreground">Show a WhatsApp header button on /dashboard</p>
            </div>
            <Switch
              checked={whatsApp.dashboardEnabled}
              onCheckedChange={(checked) => setWhatsApp({ ...whatsApp, dashboardEnabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboardTemplate" className="text-foreground">Dashboard Message Template</Label>
            <Input
              id="dashboardTemplate"
              placeholder="Hi, I need help."
              value={whatsApp.dashboardTemplate}
              onChange={(e) => setWhatsApp({ ...whatsApp, dashboardTemplate: e.target.value })}
              className="bg-secondary/50"
            />
            <p className="text-xs text-muted-foreground">
              Placeholders supported: {'{order_id}'}, {'{customer_name}'}, {'{product_name}'}, {'{listing_id}'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Safety & Kill Switches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-card p-6 border-red-500/20 bg-red-500/5"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Safety & Kill Switches</h2>
            <p className="text-sm text-muted-foreground">Emergency override controls for automated processes</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/10">
            <div>
              <Label className="text-foreground font-semibold flex items-center gap-2">
                Global Auto-Fulfillment Enabled
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Disable this to instantly halt all automated ordering and checkout processes across all users.
              </p>
            </div>
            <Switch
              checked={globalAutoFulfillmentEnabled}
              onCheckedChange={(checked) => setGlobalAutoFulfillmentEnabled(checked)}
            />
          </div>
        </div>
      </motion.div>

      {/* AI Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 border-primary/20 bg-primary/5"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">AI Configuration</h2>
            <p className="text-sm text-muted-foreground">Power the Amazon title and description generator</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="geminiApiKey" className="text-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              Gemini API Key
            </Label>
            <Input
              id="geminiApiKey"
              type="password"
              placeholder="Enter your Google Gemini API Key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="bg-secondary/50 border-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Used by the Chrome extension to automatically generate optimized product titles.
            </p>
          </div>
        </div>
      </motion.div>

      {/* General Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">General</h2>
            <p className="text-sm text-muted-foreground">Basic platform configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="siteName" className="text-foreground">Site Name</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail" className="text-foreground">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="bg-secondary/50"
            />
          </div>
        </div>
      </motion.div>

      {/* Feature Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Features</h2>
            <p className="text-sm text-muted-foreground">Enable or disable platform features</p>
          </div>
        </div>

        <div className="space-y-6">

        </div>
      </motion.div>

      {/* Amazon API Settings */}
      <AmazonAPISettings />

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end sticky bottom-8 pt-4"
      >
        <Button
          variant="hero"
          size="lg"
          onClick={handleSave}
          disabled={isSaving}
          className="shadow-xl"
        >
          {isSaving ? (
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Save className="h-5 w-5 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </motion.div>
    </div>
  );
}
