import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, User, Shield, CreditCard, BarChart3, Bot, Globe, Puzzle, Chrome,
  Search, Check, Loader2, Mail, 
  ShieldCheck, ArrowUpRight, Download, Laptop, Smartphone, RefreshCw
} from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Switch } from '@repo/ui/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Separator } from '@repo/ui/components/ui/separator';

import NotificationSettings from './NotificationSettings';
import GoogleSheetsSettings from './GoogleSheetsSettings';
import { EbaySyncSettings } from './EbaySyncSettings';
import DeveloperSettings from './DeveloperSettings';
import UserAISettings from './UserAISettings';
import { downloadExtensionZip } from '@/utils/extensionDownloader';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
];

export function SettingsDialog({ open, onOpenChange, defaultTab = 'general' }: SettingsDialogProps) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { 
    planName, plan, subscribed, subscriptionEnd, limits, usage, 
    openCustomerPortal 
  } = useSubscription();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security State
  const [apiKeyEnabled, setApiKeyEnabled] = useState(profile?.api_key_enabled || false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Auto reload settings
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);

  // Extension state
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setApiKeyEnabled(profile.api_key_enabled || false);
    }
  }, [profile]);

  useEffect(() => {
    if (user && activeTab === 'privacy') {
      fetchSessions();
    }
  }, [user, activeTab]);

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

  const handleDownloadExtension = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      toast.success('Extension downloaded! Extract the zip and follow installation steps.');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download extension zip.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Sidebar Tabs Config
  const tabs = [
    { id: 'general', label: 'General', icon: Settings, searchKeywords: 'general theme language preference' },
    { id: 'account', label: 'Account', icon: User, searchKeywords: 'account profile name avatar email verified mfa' },
    { id: 'privacy', label: 'Privacy', icon: Shield, searchKeywords: 'privacy security mfa API key developer token devices sessions' },
    { id: 'billing', label: 'Billing', icon: CreditCard, searchKeywords: 'billing subscription plan Pro price Visa payment invoices credits auto reload' },
    { id: 'usage', label: 'Usage', icon: BarChart3, searchKeywords: 'usage limits credits listings auto orders models progress' },
    { id: 'capabilities', label: 'Capabilities', icon: Bot, searchKeywords: 'capabilities AI models configuration prompts tokens assistant custom' },
    { id: 'connectors', label: 'Connectors', icon: Globe, searchKeywords: 'connectors integrations eBay Google Sheets sync sheets' },
    { id: 'extension', label: 'SellerSuit Extension', icon: Puzzle, searchKeywords: 'extension Chrome setup download install pair browser' },
    { id: 'inbrowser', label: 'SellerSuit in Chrome', icon: Chrome, searchKeywords: 'inbrowser chrome extension usage instructions features documentation' },
  ];

  const filteredTabs = tabs.filter(tab => 
    tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.searchKeywords.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic values
  const creditsTotal = usage?.credits_total ?? limits?.credits_per_month ?? 100000;
  const creditsRemaining = usage?.credits_remaining ?? Math.max((profile?.credits ?? 0), 0);
  const creditsUsed = creditsTotal - creditsRemaining;
  const creditsPercent = creditsTotal > 0 ? Math.min(Math.round((creditsUsed / creditsTotal) * 100), 100) : 0;

  const listingsActive = usage?.listings_active ?? 0;
  const listingsLimit = limits?.max_listings ?? 1000;
  const listingsPercent = listingsLimit > 0 ? Math.min(Math.round((listingsActive / listingsLimit) * 100), 100) : 0;

  const autoOrdersUsed = usage?.orders_used ?? 0;
  const autoOrdersLimit = limits?.max_auto_orders ?? 100;
  const autoOrdersPercent = autoOrdersLimit > 0 ? Math.min(Math.round((autoOrdersUsed / autoOrdersLimit) * 100), 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden h-[85vh] max-h-[750px] flex flex-col md:flex-row bg-background border-border text-foreground rounded-xl shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col shrink-0 h-1/3 md:h-full">
          {/* Search Box */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="pl-9 h-9 w-full bg-background border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Scrollable Tab Buttons */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm font-semibold transition-all duration-150 ${
                    active 
                      ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm shadow-primary/5' 
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
            {filteredTabs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No matching settings found</p>
            )}
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col h-2/3 md:h-full bg-background overflow-hidden relative">
          
          {/* Scrollable Panel */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
            
            {/* 1. GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">General Preferences</h2>
                  <p className="text-muted-foreground text-xs mt-1">Configure your workspace defaults and system preferences.</p>
                </div>
                <Separator className="bg-border" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Dark Mode Appearance</span>
                      <p className="text-xs text-muted-foreground">Toggle dark mode interface theme.</p>
                    </div>
                    <Switch
                      checked={document.documentElement.classList.contains('dark')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          document.documentElement.classList.add('dark');
                        } else {
                          document.documentElement.classList.remove('dark');
                        }
                        toast.success('Theme preference saved');
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Language & Localization</span>
                      <p className="text-xs text-muted-foreground">System language preferences (currently English only).</p>
                    </div>
                    <Badge variant="outline" className="border-border text-muted-foreground bg-muted/30">
                      English (US)
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Account Details</h2>
                  <p className="text-muted-foreground text-xs mt-1">Customize your public profile and select custom avatar presets.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-6">
                  {/* Avatar Preset Selector */}
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <Avatar className="h-20 w-20 border-2 border-border shadow-xl">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-muted text-foreground text-2xl font-semibold">
                        {getInitials(fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-3 flex-1 w-full">
                      <Label className="text-muted-foreground text-xs">Select Avatar Preset</Label>
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_PRESETS.map((preset, index) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAvatarUrl(preset)}
                            className={`relative rounded-full h-10 w-10 overflow-hidden border-2 transition-all hover:scale-105 ${
                              avatarUrl === preset ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent'
                            }`}
                          >
                            <img src={preset} alt={`Preset ${index + 1}`} className="h-full w-full object-cover" />
                            {avatarUrl === preset && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white stroke-[3px]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="custom-avatar-url" className="text-[10px] text-muted-foreground">Or paste custom image URL</Label>
                        <Input
                          id="custom-avatar-url"
                          type="url"
                          placeholder="https://example.com/avatar.png"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          className="h-8 text-xs bg-background border-border text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Form Details */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dlg-fullName" className="text-muted-foreground">Full Name</Label>
                      <Input
                        id="dlg-fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="bg-background border-border text-foreground h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-email" className="text-muted-foreground">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="dlg-email"
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-muted/40 border-border/80 text-muted-foreground h-10 cursor-not-allowed"
                        />
                        <Badge variant="outline" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Info badges */}
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 pt-2">
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium tracking-wider">Plan Tier</span>
                      <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 mt-1">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {plan?.display_name || planName || 'Free Trial'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium tracking-wider">Account Status</span>
                      <span className="font-semibold text-foreground text-xs block mt-1">
                        {profile?.account_status || 'Active'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/40 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium tracking-wider">Member Since</span>
                      <span className="font-semibold text-foreground text-xs block mt-1">
                        {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2 bg-primary hover:bg-primary/90">
                      {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Profile
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PRIVACY & SECURITY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Security & Privacy</h2>
                  <p className="text-muted-foreground text-xs mt-1">Manage Multi-Factor Authentication, developer API credentials, and active Chrome extension devices.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-6">
                  {/* API keys and MFA */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-medium text-foreground">Multi-Factor Authentication</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          Secure your SellerSuit account by requiring OTP tokens from authenticator devices on login.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant={profile?.mfa_enabled ? 'default' : 'outline'} className={profile?.mfa_enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'border-border text-muted-foreground'}>
                          {profile?.mfa_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Laptop className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-medium text-foreground">Developer API Keys</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          Grant programmatic access to SellerSuit endpoints for integrations. Keep credentials secure.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">Developer API</span>
                        <Switch
                          checked={apiKeyEnabled}
                          onCheckedChange={handleToggleApiKey}
                          disabled={savingSecurity}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Paired Sessions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        Active Paired Extension Devices
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchSessions}
                        disabled={loadingSessions}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {loadingSessions && sessions.length === 0 ? (
                        <div className="flex justify-center items-center py-6 gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Loading paired sessions...</span>
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="p-6 border border-dashed border-border rounded-xl text-center bg-muted/20">
                          <Laptop className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">No paired extension devices found</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Connect your Chrome extension to sync listings.</p>
                        </div>
                      ) : (
                        sessions.map((session) => {
                          const dev = session.extension_devices;
                          return (
                            <div key={session.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/50 gap-3 hover:bg-muted/30 transition-colors">
                              <div className="min-w-0 flex items-start gap-2.5">
                                <div className="p-2 rounded-lg bg-muted shrink-0">
                                  <Laptop className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {dev?.device_name || 'Chrome Extension'}
                                    </span>
                                    <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/10 border-0 h-4 text-[9px] px-1.5 font-normal">Active</Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {dev?.browser || 'Chrome'} on {dev?.os || 'OS'} • IP: {session.ip_address || 'Unknown'}
                                  </p>
                                  <span className="text-[9px] text-muted-foreground block mt-0.5">
                                    Last Active: {session.last_seen_at ? new Date(session.last_seen_at).toLocaleDateString() : 'Just now'}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRevokeSession(session.device_id)}
                                className="h-8 px-2 text-[10px] font-medium bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900 hover:text-white"
                              >
                                Revoke
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. BILLING TAB */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Billing & Subscription</h2>
                  <p className="text-muted-foreground text-xs mt-1">Manage subscription plan, credit balance, payment cards, auto-reload, and invoices history.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-6">
                  {/* Current Plan Overview */}
                  <div className="p-5 rounded-xl bg-card border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30 font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          {planName || 'Pro Plan'}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">Monthly Billing</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {subscriptionEnd ? (
                          `Your subscription will auto renew on ${format(new Date(subscriptionEnd), 'MMM d, yyyy')}.`
                        ) : (
                          'Your subscription will auto renew on Jul 7, 2026.'
                        )}
                      </p>
                    </div>
                    <Button 
                      onClick={() => openCustomerPortal()} 
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs h-9"
                    >
                      Adjust plan
                    </Button>
                  </div>

                  {/* Payment section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</h4>
                    <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-12 rounded bg-background border border-border flex items-center justify-center font-bold text-blue-500 text-xs">
                          VISA
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">Visa •••• 3020</span>
                          <span className="text-[10px] text-muted-foreground block">Expires 12/28</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => openCustomerPortal()} 
                        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 text-xs"
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  {/* Usage Credits purchase */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usage Credits</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Buy usage credits so your team can keep listing products if they hit their monthly limits.
                        </p>
                        <div className="pt-2">
                          <span className="text-2xl font-bold text-foreground">$0.00</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">Current balance</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => openCustomerPortal()} 
                        className="w-full bg-primary hover:bg-primary/90 text-xs text-primary-foreground h-9 flex items-center justify-center gap-1 font-medium"
                      >
                        Buy usage credits
                        <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 text-[9px] border-0 h-4 px-1.5 font-semibold">
                          Up to 30% off
                        </Badge>
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto-Reload</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Automatically purchase more credits when your balance falls below a threshold so listing is never interrupted.
                        </p>
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Enable Auto-Reload</span>
                          <Switch
                            checked={autoReloadEnabled}
                            onCheckedChange={setAutoReloadEnabled}
                          />
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        disabled={!autoReloadEnabled}
                        className="w-full border-border text-muted-foreground hover:bg-muted h-9 text-xs"
                      >
                        Configure Auto-Reload
                      </Button>
                    </div>
                  </div>

                  {/* Invoice History */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoices</h4>
                    <div className="overflow-x-auto rounded-xl border border-border bg-muted/20">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted text-muted-foreground">
                            <th className="p-3 font-semibold">Date</th>
                            <th className="p-3 font-semibold">Total</th>
                            <th className="p-3 font-semibold">Status</th>
                            <th className="p-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr className="hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground font-medium">Jun 7, 2026</td>
                            <td className="p-3 text-foreground font-semibold">$20.00</td>
                            <td className="p-3">
                              <Badge className="bg-green-500/10 text-green-400 border-0 text-[10px] font-normal h-5">Paid</Badge>
                            </td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => openCustomerPortal()}
                                className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                              >
                                View
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground font-medium">May 7, 2026</td>
                            <td className="p-3 text-foreground font-semibold">$20.00</td>
                            <td className="p-3">
                              <Badge className="bg-green-500/10 text-green-400 border-0 text-[10px] font-normal h-5">Paid</Badge>
                            </td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => openCustomerPortal()}
                                className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                              >
                                View
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. USAGE TAB */}
            {activeTab === 'usage' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Plan Usage Limits</h2>
                  <p className="text-muted-foreground text-xs mt-1">Monitor remaining API credits, listing allocations, auto order runs, and capabilities.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-6">
                  {/* Usage Summary with Progress Bars */}
                  <div className="space-y-5">
                    {/* Credits */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">Current Session Credits</span>
                        <span className="text-muted-foreground font-medium">{creditsPercent}% used ({creditsUsed.toLocaleString()} / {creditsTotal.toLocaleString()})</span>
                      </div>
                      <div className="h-2.5 w-full bg-background border border-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${creditsPercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Resets in 3 hr 18 min</p>
                    </div>

                    {/* Listings Limit */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">Weekly Active Listings Limits</span>
                        <span className="text-muted-foreground font-medium">{listingsPercent}% used ({listingsActive} / {listingsLimit})</span>
                      </div>
                      <div className="h-2.5 w-full bg-background border border-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${listingsPercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Resets in 22 hr 18 min</p>
                    </div>

                    {/* Auto-Orders Limit */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">Monthly Automated Orders</span>
                        <span className="text-muted-foreground font-medium">{autoOrdersPercent}% used ({autoOrdersUsed} / {autoOrdersLimit})</span>
                      </div>
                      <div className="h-2.5 w-full bg-background border border-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${autoOrdersPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">Daily Included routine runs</span>
                      <span className="text-muted-foreground">0 / 5</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>

                  {/* Usage Credits switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-medium text-foreground">Usage credits fallback</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Turn on usage credits to keep using SellerSuit if you hit your plan listing limits.
                      </p>
                    </div>
                    <Switch
                      checked={autoReloadEnabled}
                      onCheckedChange={setAutoReloadEnabled}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. CAPABILITIES / AI CONFIG TAB */}
            {activeTab === 'capabilities' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Capabilities (AI configuration)</h2>
                  <p className="text-muted-foreground text-xs mt-1">Tune translation engines, model limits, prompt engineering guidelines, and token optimizations.</p>
                </div>
                <Separator className="bg-border" />
                <UserAISettings />
              </div>
            )}

            {/* 7. CONNECTORS TAB */}
            {activeTab === 'connectors' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Connectors &amp; Integrations</h2>
                  <p className="text-muted-foreground text-xs mt-1">Link your developer profiles, marketplace accounts, and Google Sheets connectors.</p>
                </div>
                <Separator className="bg-border" />
                <EbaySyncSettings />
                <Separator className="bg-border" />
                <GoogleSheetsSettings />
              </div>
            )}

            {/* 8. EXTENSION TAB */}
            {activeTab === 'extension' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Chrome Extension Pairing</h2>
                  <p className="text-muted-foreground text-xs mt-1">Download and securely authenticate the SellerSuit Chrome assistant on this device.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Chrome className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">1. Download Zip File</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Download the latest production bundle for the SellerSuit Chrome Extension. Keep automated scraping active.
                    </p>
                    <Button 
                      onClick={handleDownloadExtension}
                      disabled={isDownloading}
                      className="bg-primary hover:bg-primary/95 text-xs text-primary-foreground"
                    >
                      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                      Download Zip File
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">2. Pair Device Session</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter the pairing code shown inside your Chrome extension popover to register this browser profile instantly.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 123456"
                        maxLength={6}
                        className="w-32 bg-background border-border text-center font-mono tracking-widest text-foreground h-9"
                      />
                      <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs h-9">
                        Approve Pairing
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SELLER_SUIT IN CHROME */}
            {activeTab === 'inbrowser' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">SellerSuit in Chrome</h2>
                  <p className="text-muted-foreground text-xs mt-1">Get to know the browser automation suite and supplier importer tool features.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    The SellerSuit Chrome Extension injects advanced pricing widgets directly onto supplier platforms (Walmart, Amazon) and allows one-click import mapping directly into your SellerSuit inventory databases.
                  </p>
                  
                  <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-[11px]">
                    <h4 className="font-semibold text-foreground">Core Capabilities:</h4>
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li>Walmart &amp; Amazon catalog detail scraping</li>
                      <li>Calculates supplier costs vs eBay estimated payouts instantly</li>
                      <li>Handles cookie token synchronizations securely</li>
                      <li>Monitors inventory variations (sizes, colors, SKUs)</li>
                    </ul>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-2">
                    For detailed usage walkthroughs, please reference our help documentation center.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
