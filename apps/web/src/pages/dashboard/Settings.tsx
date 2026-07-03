import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Shield, Key, Bot, Activity, Bell, Globe, 
  Lock, Laptop, ShieldCheck, Check, Loader2, AlertCircle, RefreshCw, Settings
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



export default function DashboardSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { planName, subscribed } = useSubscription();

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
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

      <Tabs defaultValue="notifications" className="flex flex-col md:flex-row gap-8 w-full items-start">
        <TabsList className="flex flex-col bg-transparent p-0 h-auto gap-2 w-full md:w-48 shrink-0 items-stretch border-none">
          <TabsTrigger 
            value="notifications" 
            className="flex items-center px-1 py-1.5 text-sm justify-start rounded-none transition-all text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold bg-transparent shadow-none border-none outline-none"
          >
            General
          </TabsTrigger>
          <TabsTrigger 
            value="profile" 
            className="flex items-center px-1 py-1.5 text-sm justify-start rounded-none transition-all text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold bg-transparent shadow-none border-none outline-none"
          >
            Account
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="flex items-center px-1 py-1.5 text-sm justify-start rounded-none transition-all text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold bg-transparent shadow-none border-none outline-none"
          >
            Privacy
          </TabsTrigger>
          <TabsTrigger 
            value="integrations" 
            className="flex items-center px-1 py-1.5 text-sm justify-start rounded-none transition-all text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold bg-transparent shadow-none border-none outline-none"
          >
            Connectors
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full min-w-0 space-y-8">
          {/* PROFILE & ACCOUNT TAB */}
          <TabsContent value="profile" className="space-y-8 outline-none">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Profile Details</h2>
                <p className="text-xs text-muted-foreground">
                  Customize your name and email settings.
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-border shadow-none">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground text-base font-semibold">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm font-semibold">{fullName || 'User'}</h3>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-medium">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-9 text-sm shadow-none rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="h-9 text-sm bg-muted/40 text-muted-foreground shadow-none rounded-md"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Details
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Current Plan</h2>
                <p className="text-xs text-muted-foreground">View and manage your subscription level.</p>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                  <span className="text-xs text-muted-foreground block">Subscription Tier</span>
                  <span className="font-semibold text-base">{planName}</span>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {subscribed ? 'Active' : 'Free Trial'}
                </Badge>
              </div>
            </div>
          </TabsContent>

          {/* INTEGRATIONS TAB */}
          <TabsContent value="integrations" className="space-y-8 outline-none">
            <EbaySyncSettings />
            <GoogleSheetsSettings />
          </TabsContent>

          {/* SECURITY & SESSIONS TAB */}
          <TabsContent value="security" className="space-y-8 outline-none">
            {/* security overview & MFA */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Multi-Factor Auth</h2>
                <p className="text-xs text-muted-foreground">Secure your SellerSuit account.</p>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold">MFA Security status</span>
                  <p className="text-xs text-muted-foreground">
                    Require an OTP device code on login.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {profile?.mfa_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Device & Extension Sessions */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground">Active Extension Devices</h2>
                  <p className="text-xs text-muted-foreground">
                    Manage active browser sessions paired with your SellerSuit Chrome Extension.
                  </p>
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
              </div>
              <div>
                {loadingSessions ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl">
                    <p className="text-sm font-semibold text-muted-foreground">No Active Sessions</p>
                    <p className="text-xs text-muted-foreground mt-1">Install and log in to the SellerSuit Chrome Extension.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => {
                      const dev = session.extension_devices;
                      return (
                        <div
                          key={session.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b border-border gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {dev?.device_name || 'Extension Device'}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
                                Active
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dev?.browser || 'Browser'} on {dev?.os || 'OS'} • IP: {session.ip_address || 'Unknown'}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
                              Last active: {session.last_seen_at ? new Date(session.last_seen_at).toLocaleString() : 'Never'}
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeSession(session.device_id)}
                            className="text-xs h-8"
                          >
                            Revoke Device
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="outline-none">
            <NotificationSettings />
          </TabsContent>
        </div>
      </Tabs>

      {/* Local Development Tools - Only visible in dev or on localhost */}
      {(import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <DeveloperSettings />
      )}
    </div>
  );
}
