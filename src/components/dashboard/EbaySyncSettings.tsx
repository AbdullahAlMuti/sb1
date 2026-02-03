
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function EbaySyncSettings() {
    const [loading, setLoading] = useState(false);
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [syncDays, setSyncDays] = useState('90'); // Default to 90
    const [customDays, setCustomDays] = useState('');
    const [syncInterval, setSyncInterval] = useState('60'); // Minutes

    // 1. Fetch Settings
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('admin_settings') // Assuming singular user settings in admin_settings for now or user_settings table
                .select('*')
                .or(`key.eq.ebay_sync_enabled,key.eq.ebay_sync_days,key.eq.ebay_sync_interval`);

            if (error) throw error;

            if (data) {
                data.forEach(setting => {
                    if (setting.key === 'ebay_sync_enabled') setSyncEnabled(setting.value === 'true');
                    if (setting.key === 'ebay_sync_days') {
                        // Check if it's one of the presets
                        const presets = ['1', '3', '7', '14', '30', '90', '365', '730', '1825'];
                        if (presets.includes(setting.value)) {
                            setSyncDays(setting.value);
                        } else {
                            setSyncDays('custom');
                            setCustomDays(setting.value);
                        }
                    }
                    if (setting.key === 'ebay_sync_interval') setSyncInterval(setting.value);
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Save Settings
    const saveSettings = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: "Error", description: "You must be logged in to save settings.", variant: "destructive" });
                return;
            }

            const finalDays = syncDays === 'custom' ? customDays : syncDays;

            const updates = [
                { key: 'ebay_sync_enabled', value: String(syncEnabled) },
                { key: 'ebay_sync_days', value: finalDays },
                { key: 'ebay_sync_interval', value: syncInterval }
            ];

            // Assuming 'admin_settings' is the shared table, but typically user specifics go to user_settings.
            // For this user's context (single tenant SaaS usually uses admin_settings for global param), I will stick to what I've seen.
            // Actually, typically we use upsert.

            const { error } = await supabase
                .from('admin_settings')
                .upsert(updates.map(u => ({ ...u, updated_at: new Date().toISOString() })), { onConflict: 'key' });

            if (error) throw error;

            toast({ title: "Settings Saved", description: "Extension will update on next sync." });

            // Notify Extension
            window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, '*');

        } catch (error: any) {
            toast({ title: "Error Saving", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    eBay Sync Configuration
                </CardTitle>
                <CardDescription>
                    Configure how the extension syncs your orders.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Automatic Sync</Label>
                        <p className="text-sm text-muted-foreground">Enable or disable background syncing.</p>
                    </div>
                    <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                </div>

                {/* Sync History (Days) */}
                <div className="space-y-2">
                    <Label>Sync History (Lookback Period)</Label>
                    <div className="flex gap-4">
                        <Select value={syncDays} onValueChange={setSyncDays}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select days" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Last 24 Hours</SelectItem>
                                <SelectItem value="3">Last 3 Days</SelectItem>
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="14">Last 14 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="365">Last 1 Year</SelectItem>
                                <SelectItem value="730">Last 2 Years</SelectItem>
                                <SelectItem value="1825">Last 5 Years (All Time)</SelectItem>
                                <SelectItem value="custom">Custom...</SelectItem>
                            </SelectContent>
                        </Select>

                        {syncDays === 'custom' && (
                            <Input
                                type="number"
                                placeholder="Enter days"
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                className="w-[120px]"
                            />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">How far back to check for orders. Larger ranges take longer.</p>
                </div>

                {/* Sync Interval */}
                <div className="space-y-2">
                    <Label>Sync Frequency</Label>
                    <Select value={syncInterval} onValueChange={setSyncInterval}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">Every 30 Minutes</SelectItem>
                            <SelectItem value="60">Every 1 Hour</SelectItem>
                            <SelectItem value="120">Every 2 Hours</SelectItem>
                            <SelectItem value="360">Every 6 Hours</SelectItem>
                            <SelectItem value="600">Every 10 Hours</SelectItem>
                            <SelectItem value="720">Every 12 Hours</SelectItem>
                            <SelectItem value="1440">Every 24 Hours</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How often the extension checks for new orders automatically.</p>
                </div>

                <Button onClick={saveSettings} disabled={loading} className="w-full sm:w-auto">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                </Button>

            </CardContent>
        </Card>
    );
}
