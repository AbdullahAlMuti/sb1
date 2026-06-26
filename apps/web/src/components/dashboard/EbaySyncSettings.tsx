
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { Button } from '@repo/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { Input } from '@repo/ui/components/ui/input';
import { toast } from '@repo/ui/components/ui/use-toast';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';

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
                .from('user_ebay_settings')
                .select('is_sync_enabled, sync_frequency')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error; // Ignore not found

            if (data) {
                setSyncEnabled(data.is_sync_enabled ?? true);
                
                // We'll map the sync_frequency text back to days
                // If it's a number string, use it. Otherwise default.
                const freq = data.sync_frequency || '90';
                const presets = ['1', '3', '7', '14', '30', '90', '365', '730', '1825'];
                if (presets.includes(freq)) {
                    setSyncDays(freq);
                } else {
                    setSyncDays('custom');
                    setCustomDays(freq);
                }
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

            const { error } = await supabase
                .from('user_ebay_settings')
                .upsert({ 
                    user_id: user.id, 
                    is_sync_enabled: syncEnabled, 
                    sync_frequency: finalDays,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            toast({ title: "Settings Saved", description: "Extension will update on next sync." });

            // Notify Extension
            window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, window.location.origin);

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
