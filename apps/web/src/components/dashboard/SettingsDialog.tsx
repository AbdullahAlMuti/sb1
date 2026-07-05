import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings, User, Shield, CreditCard, BarChart3, Bot, Globe, Puzzle, Chrome,
  Search, Check, Loader2, Mail, 
  ShieldCheck, ArrowUpRight, Download, Laptop, Smartphone, RefreshCw,
  Link, CheckCircle, AlertCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
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

  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const isSettingsPath = pathParts.includes('settings');
  const activeTab = isSettingsPath ? (pathParts[pathParts.indexOf('settings') + 1] || 'general') : 'general';

  const handleTabChange = (tabId: string) => {
    const basePath = location.pathname.includes('/dashboard/ebay') 
      ? '/dashboard/ebay/settings' 
      : '/dashboard/settings';
    navigate(`${basePath}/${tabId}`);
  };
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

  // General Settings State
  const [defaultMarketplace, setDefaultMarketplace] = useState<string>((profile?.settings as any)?.default_marketplace || 'eBay US');
  const [currency, setCurrency] = useState<string>((profile?.settings as any)?.currency || 'USD');

  // Auto reload settings
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);

  // Extension state
  const [isDownloading, setIsDownloading] = useState(false);

  // Billing details
  interface CardDetails {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  }

  interface InvoiceDetails {
    id: string;
    date: string;
    amount_paid: number;
    currency: string;
    status: string;
    hosted_invoice_url: string;
    invoice_pdf: string;
  }

  const [billingDetails, setBillingDetails] = useState<{ card: CardDetails | null; invoices: InvoiceDetails[] } | null>(null);
  const [loadingBillingDetails, setLoadingBillingDetails] = useState(false);

  // Tabs state is synchronized automatically via react-router-dom URL parameters

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setApiKeyEnabled(profile.api_key_enabled || false);
      setDefaultMarketplace((profile.settings as any)?.default_marketplace || 'eBay US');
      setCurrency((profile.settings as any)?.currency || 'USD');
    }
  }, [profile]);

  useEffect(() => {
    if (user && (activeTab === 'privacy' || activeTab === 'general')) {
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

  useEffect(() => {
    if (open && activeTab === 'billing' && user) {
      fetchBillingDetails();
    }
  }, [open, activeTab, user]);

  const fetchBillingDetails = async () => {
    setLoadingBillingDetails(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) return;

      const { data, error } = await supabase.functions.invoke('get-billing-details', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      setBillingDetails(data);
    } catch (error) {
      console.error('Error fetching billing details:', error);
      toast.error('Failed to load billing history');
    } finally {
      setLoadingBillingDetails(false);
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

  const handleSaveGeneralSetting = async (key: string, value: string) => {
    if (!user) return;
    try {
      const updatedSettings = {
        ...(profile?.settings || {}),
        [key]: value
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Setting updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update setting');
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
    { id: 'general', label: 'General', icon: Settings, searchKeywords: 'general theme language preference default marketplace currency chrome connection' },
    { id: 'account', label: 'Account', icon: User, searchKeywords: 'account profile name avatar email verified mfa' },
    { id: 'privacy', label: 'Privacy', icon: Shield, searchKeywords: 'privacy security mfa API key developer token devices sessions' },
    { id: 'billing', label: 'Billing', icon: CreditCard, searchKeywords: 'billing subscription plan Pro price Visa payment invoices credits auto reload' },
    { id: 'connectors', label: 'Connectors', icon: Link, searchKeywords: 'connectors integrations eBay Google Sheets sync sheets' },
    { id: 'inbrowser', label: 'SellerSuit in Chrome', icon: Puzzle, searchKeywords: 'inbrowser chrome extension usage instructions features documentation pairing' },
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
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-muted text-foreground' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
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
                  <h2 className="text-xl font-semibold text-foreground">eBay Settings</h2>
                  <p className="text-muted-foreground text-xs mt-1">Manage your core preferences and extension connection.</p>
                </div>
                
                <div className="divide-y divide-border border-t border-b border-border">
                  {/* Default Marketplace */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-semibold text-foreground">Default marketplace</span>
                      <p className="text-xs text-muted-foreground">Select your default eBay marketplace.</p>
                    </div>
                    <Select 
                      value={defaultMarketplace} 
                      onValueChange={(val) => {
                        setDefaultMarketplace(val);
                        handleSaveGeneralSetting('default_marketplace', val);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm shadow-none rounded-md border-border bg-background">
                        <SelectValue placeholder="Select marketplace" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eBay US">eBay US</SelectItem>
                        <SelectItem value="eBay UK">eBay UK</SelectItem>
                        <SelectItem value="eBay DE">eBay DE</SelectItem>
                        <SelectItem value="eBay FR">eBay FR</SelectItem>
                        <SelectItem value="eBay IT">eBay IT</SelectItem>
                        <SelectItem value="eBay ES">eBay ES</SelectItem>
                        <SelectItem value="eBay AU">eBay AU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Currency */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-semibold text-foreground">Currency</span>
                      <p className="text-xs text-muted-foreground">Choose your preferred currency.</p>
                    </div>
                    <Select 
                      value={currency} 
                      onValueChange={(val) => {
                        setCurrency(val);
                        handleSaveGeneralSetting('currency', val);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm shadow-none rounded-md border-border bg-background">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Credit Usage */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-semibold text-foreground">Credit usage</span>
                      <p className="text-xs text-muted-foreground">Usage is tracked through credits.</p>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground px-4 py-1.5">—</span>
                  </div>

                  {/* Chrome Connection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4">
                    <div className="space-y-1 pr-4">
                      <span className="text-sm font-semibold text-foreground">Chrome connection</span>
                      <p className="text-xs text-muted-foreground">Connect the SellerSuit extension in Chrome.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {sessions.length > 0 ? (
                        <>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            <CheckCircle className="h-4 w-4 animate-none" /> Connected
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleTabChange('privacy')} className="h-8 shadow-none rounded-md">
                            Manage
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 text-muted-foreground text-xs font-semibold">
                            <AlertCircle className="h-4 w-4" /> Disconnected
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleTabChange('privacy')} className="h-8 shadow-none rounded-md">
                            Manage
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Account Details</h2>
                  <p className="text-muted-foreground text-xs mt-1">Customize your public profile details.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-6">
                  {/* Flat Avatar Preview */}
                  <div className="flex items-center gap-4 py-2">
                    <Avatar className="h-14 w-14 border border-border shadow-none">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-muted text-foreground text-base font-semibold">
                        {getInitials(fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-semibold">{fullName || 'User'}</h3>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  {/* Form Details */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dlg-fullName" className="text-xs font-semibold text-muted-foreground">Full Name</Label>
                      <Input
                        id="dlg-fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="bg-background border-border text-foreground h-9 shadow-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-email" className="text-xs font-semibold text-muted-foreground">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="dlg-email"
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-muted/40 border-border/80 text-muted-foreground h-9 cursor-not-allowed shadow-none text-sm"
                        />
                        <Badge variant="outline" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Info badges */}
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 pt-2">
                    <div className="p-3.5 rounded-lg border border-border bg-card">
                      <span className="text-[10px] text-muted-foreground block uppercase font-semibold tracking-wider">Plan Tier</span>
                      <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 mt-1">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {plan?.display_name || planName || 'Free Trial'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg border border-border bg-card">
                      <span className="text-[10px] text-muted-foreground block uppercase font-semibold tracking-wider">Account Status</span>
                      <span className="font-semibold text-foreground text-xs block mt-1">
                        {profile?.account_status || 'Active'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg border border-border bg-card col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-semibold tracking-wider">Member Since</span>
                      <span className="font-semibold text-foreground text-xs block mt-1">
                        {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2 bg-primary hover:bg-primary/90 h-9">
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
                  <p className="text-muted-foreground text-xs mt-1">Manage Multi-Factor Authentication and active Chrome extension devices.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-6">
                  {/* Multi-Factor Authentication */}
                  <div className="p-4 rounded-lg bg-card border border-border flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Multi-Factor Authentication</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Secure your SellerSuit account by requiring OTP tokens from authenticator devices on login.
                      </p>
                    </div>
                    <Badge variant={profile?.mfa_enabled ? 'default' : 'outline'} className={profile?.mfa_enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'border-border text-muted-foreground'}>
                      {profile?.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  {/* Paired Sessions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
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
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Loading paired sessions...</span>
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="p-6 border border-dashed border-border rounded-lg text-center bg-muted/20">
                          <Laptop className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">No paired extension devices found</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Connect your Chrome extension to sync listings.</p>
                        </div>
                      ) : (
                        sessions.map((session) => {
                          const dev = session.extension_devices;
                          return (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card gap-3 hover:bg-muted/10 transition-colors">
                              <div className="min-w-0 flex items-start gap-2.5">
                                <div className="p-2 rounded-lg bg-muted shrink-0">
                                  <Laptop className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {dev?.device_name || 'Chrome Extension'}
                                    </span>
                                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/10 border-0 h-4 text-[9px] px-1.5 font-normal">Active</Badge>
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
                                className="h-8 px-2 text-[10px] font-medium bg-red-950/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-600 hover:text-white"
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
                      {loadingBillingDetails ? (
                        <div className="flex items-center justify-center py-2 w-full">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : billingDetails?.card ? (
                        <div className="flex items-center gap-3 w-full justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-12 rounded bg-background border border-border flex items-center justify-center font-bold text-blue-500 text-xs uppercase">
                              {billingDetails.card.brand}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground capitalize">
                                {billingDetails.card.brand} •••• {billingDetails.card.last4}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                Expires {billingDetails.card.exp_month}/{billingDetails.card.exp_year}
                              </span>
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
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm text-muted-foreground">No payment method on file</span>
                          <Button 
                            variant="outline" 
                            onClick={() => openCustomerPortal()} 
                            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 text-xs"
                          >
                            Add Card
                          </Button>
                        </div>
                      )}
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
                          <span className="text-2xl font-bold text-foreground">
                            {usage?.credits_remaining ?? profile?.credits ?? 0}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">Credits remaining</span>
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
                          {loadingBillingDetails ? (
                            <tr>
                              <td colSpan={4} className="p-8 text-center">
                                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                              </td>
                            </tr>
                          ) : !billingDetails?.invoices || billingDetails.invoices.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-muted-foreground font-medium">
                                No invoices found.
                              </td>
                            </tr>
                          ) : (
                            billingDetails.invoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-muted/30">
                                <td className="p-3 text-muted-foreground font-medium">
                                  {format(new Date(inv.date), 'MMM d, yyyy')}
                                </td>
                                <td className="p-3 text-foreground font-semibold">
                                  ${(inv.amount_paid / 100).toFixed(2)}
                                </td>
                                <td className="p-3">
                                  <Badge className={
                                    inv.status === 'paid' 
                                      ? "bg-green-500/10 text-green-400 border-0 text-[10px] font-normal h-5" 
                                      : inv.status === 'open'
                                        ? "bg-blue-500/10 text-blue-400 border-0 text-[10px] font-normal h-5"
                                        : "bg-muted text-muted-foreground border-0 text-[10px] font-normal h-5"
                                  }>
                                    {inv.status}
                                  </Badge>
                                </td>
                                <td className="p-3 text-right">
                                  {inv.hosted_invoice_url || inv.invoice_pdf ? (
                                    <a 
                                      href={inv.hosted_invoice_url || inv.invoice_pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                                    >
                                      View
                                      <ArrowUpRight className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
                  {/* 5. CONNECTORS TAB */}
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

            {/* 6. SELLER_SUIT IN CHROME */}
            {activeTab === 'inbrowser' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">SellerSuit in Chrome</h2>
                  <p className="text-muted-foreground text-xs mt-1">Get to know the browser automation suite and pair your device.</p>
                </div>
                <Separator className="bg-border" />

                <div className="space-y-5">
                  <div className="p-4 rounded-lg bg-card border border-border space-y-3">
                    <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      1. Download Chrome Extension
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Download the latest production bundle for the SellerSuit Chrome Extension to start scraping and syncing inventory details.
                    </p>
                    <Button 
                      onClick={handleDownloadExtension}
                      disabled={isDownloading}
                      className="bg-primary hover:bg-primary/95 text-xs text-primary-foreground h-8 shadow-none rounded-md"
                    >
                      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                      Download Zip File
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border space-y-3">
                    <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      2. Pair Device Session
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter the pairing code shown inside your Chrome extension popover to register this browser profile instantly.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 123456"
                        maxLength={6}
                        className="w-32 bg-background border-border text-center font-mono tracking-widest text-foreground h-9 shadow-none text-sm"
                      />
                      <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs h-9 shadow-none rounded-md">
                        Approve Pairing
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                    <h4 className="font-semibold text-foreground text-xs">Core Capabilities:</h4>
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li>Walmart &amp; Amazon catalog detail scraping</li>
                      <li>Calculates supplier costs vs eBay estimated payouts instantly</li>
                      <li>Handles cookie token synchronizations securely</li>
                      <li>Monitors inventory variations (sizes, colors, SKUs)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
