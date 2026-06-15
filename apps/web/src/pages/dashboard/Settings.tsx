import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Shield, Key, Bot, Activity, Bell, Globe, 
  Lock, Laptop, ShieldCheck, Check, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Switch } from '@repo/ui/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Separator } from '@repo/ui/components/ui/separator';

import NotificationSettings from '@/components/dashboard/NotificationSettings';
import GoogleSheetsSettings from '@/components/dashboard/GoogleSheetsSettings';
import { EbaySyncSettings } from '@/components/dashboard/EbaySyncSettings';
import DeveloperSettings from '@/components/dashboard/DeveloperSettings';
import UserAISettings from '@/components/dashboard/UserAISettings';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
];

export default function DashboardSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { planName, subscribed } = useSubscription();

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security State
  const [apiKeyEnabled, setApiKeyEnabled] = useState(profile?.api_key_enabled || false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setApiKeyEnabled(profile.api_key_enabled || false);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('extension_sessions')
        .select(`
          id,
          ip_address,
          user_agent,
          last_seen_at,
          status,
          created_at,
          device_id,
          extension_devices (
            device_name,
            browser,
            os
          )
        ` as any)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleApiKey = async (checked: boolean) => {
    if (!user) return;
    setApiKeyEnabled(checked);
    setSavingSecurity(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          api_key_enabled: checked,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(`Developer API Key ${checked ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      setApiKeyEnabled(!checked);
      toast.error(error.message || 'Failed to toggle API Key');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleRevokeSession = async (deviceId: string) => {
    if (!user) return;
    const promise = async () => {
      const { data, error } = await supabase.functions.invoke('extension-device-revoke', {
        body: { deviceId, reason: 'user_requested' }
      });
      if (error || (data && !data.success)) {
        throw new Error(data?.error || error?.message || 'Revocation failed');
      }
      await fetchSessions();
      await refreshProfile();
      return data;
    };

    toast.promise(promise(), {
      loading: 'Revoking extension device session...',
      success: 'Session revoked successfully',
      error: (err) => err.message || 'Failed to revoke session',
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold text-foreground">Settings & Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your user profile, configurations, security, and integrations
        </p>
      </motion.div>

      <Tabs defaultValue="profile" className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/50 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="rounded-lg gap-2 py-2 flex-1 min-w-[120px]">
            <User className="h-4 w-4" /> Profile & Account
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg gap-2 py-2 flex-1 min-w-[120px]">
            <Bot className="h-4 w-4" /> AI Config
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg gap-2 py-2 flex-1 min-w-[120px]">
            <Globe className="h-4 w-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2 py-2 flex-1 min-w-[120px]">
            <Lock className="h-4 w-4" /> Security & Sessions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-2 py-2 flex-1 min-w-[120px]">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* PROFILE & ACCOUNT TAB */}
        <TabsContent value="profile" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Customize your public persona, edit your name, or choose a premium avatar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Selector */}
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <Avatar className="h-24 w-24 border-4 border-card shadow-xl">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3 flex-1">
                  <Label>Select Premium Avatar Preset</Label>
                  <div className="flex flex-wrap gap-2.5">
                    {AVATAR_PRESETS.map((preset, index) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`relative rounded-full h-11 w-11 overflow-hidden border-2 transition-all hover:scale-110 ${
                          avatarUrl === preset ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${index + 1}`} className="h-full w-full object-cover" />
                        {avatarUrl === preset && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground stroke-[3px]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-avatar" className="text-xs text-muted-foreground">Or paste custom image URL</Label>
                    <Input
                      id="custom-avatar"
                      type="url"
                      placeholder="https://example.com/avatar.png"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted/40 text-muted-foreground"
                    />
                    <Badge variant="outline" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                      Verified
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid gap-4 grid-cols-2 pt-2">
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">Plan Tier</span>
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {planName || 'No Active Plan'}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">Account Status</span>
                  <Badge className="mt-1" variant={profile?.account_status === 'Active' ? 'default' : 'secondary'}>
                    {profile?.account_status || 'Active'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI CONFIGURATION TAB */}
        <TabsContent value="ai" className="outline-none">
          <UserAISettings />
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations" className="space-y-6 outline-none">
          <EbaySyncSettings />
          <GoogleSheetsSettings />
        </TabsContent>

        {/* SECURITY & SESSIONS TAB */}
        <TabsContent value="security" className="space-y-6 outline-none">
          {/* security overview & MFA */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Multi-Factor Auth</CardTitle>
                    <CardDescription>Secure your SellerSuit account.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">MFA Security status</span>
                    <p className="text-xs text-muted-foreground">
                      Require an OTP device code on login.
                    </p>
                  </div>
                  <Badge variant={profile?.mfa_enabled ? 'default' : 'outline'} className={profile?.mfa_enabled ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
                    {profile?.mfa_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To enable Multi-Factor Authentication, please set up a compatible TOTP authenticator app (such as Google Authenticator) in the login portal or contact support.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Developer API Keys</CardTitle>
                    <CardDescription>Access SellerSuit via programmatic endpoints.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Enable API Access</span>
                    <p className="text-xs text-muted-foreground">
                      Allow API requests using security tokens.
                    </p>
                  </div>
                  <Switch
                    checked={apiKeyEnabled}
                    onCheckedChange={handleToggleApiKey}
                    disabled={savingSecurity}
                  />
                </div>
                {apiKeyEnabled && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs flex gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Keep keys secure</span>
                      Do not expose programmatic secrets in public repos or client-side bundles.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Device & Extension Sessions */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-primary" />
                  Active Extension Devices
                </CardTitle>
                <CardDescription>
                  Manage active browser sessions paired with your SellerSuit Chrome Extension.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchSessions}
                disabled={loadingSessions}
                className="h-8 w-8 hover:bg-muted"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin text-primary' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSessions && sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading paired devices...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/60">
                  <Laptop className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <span className="font-medium text-sm">No active extension devices</span>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Install the Chrome extension and authenticate to connect your first device.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {sessions.map((session) => {
                    const dev = session.extension_devices;
                    return (
                      <div
                        key={session.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10 gap-4 hover:bg-muted/20 transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Laptop className="h-5.5 w-5.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate">
                                {dev?.device_name || 'Extension Device'}
                              </span>
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20 py-0 h-5">
                                Active
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {dev?.browser || 'Browser'} on {dev?.os || 'OS'} • IP: {session.ip_address || 'Unknown'}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
                              Last active: {session.last_seen_at ? new Date(session.last_seen_at).toLocaleString() : 'Never'}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeSession(session.device_id)}
                          className="w-full sm:w-auto text-xs h-8 px-3.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all"
                        >
                          Revoke Device
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="outline-none">
          <NotificationSettings />
        </TabsContent>
      </Tabs>

      {/* Local Development Tools - Only visible in dev or on localhost */}
      {(import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <DeveloperSettings />
      )}
    </div>
  );
}
