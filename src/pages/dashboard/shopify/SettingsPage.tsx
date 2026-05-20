import { useState } from 'react';
import { Settings, Shield, User, Bell, Check } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || 'Abdullah Al Muti');
  const [defaultNiche, setDefaultNiche] = useState('Beauty');
  const [targetMarket, setTargetMarket] = useState('United States');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <ShopifyPageShell
      icon={Settings}
      title="Dashboard Settings"
      description="Customize your account profile, product research preferences, and notification channels."
    >
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Profile Card */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-slate-400" />
            Profile Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 uppercase font-semibold">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-455 uppercase font-semibold">Email Address</label>
              <input
                type="text"
                disabled
                value={user?.email || 'test.shopify.user123@gmail.com'}
                className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs font-medium text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-slate-400" />
            Research Preferences
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-455 uppercase font-semibold">Default Niche</label>
              <select
                value={defaultNiche}
                onChange={(e) => setDefaultNiche(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="Beauty">Beauty & Skincare</option>
                <option value="Pets">Pets & Accessories</option>
                <option value="Fitness">Fitness & Wellness</option>
                <option value="Home">Home & Kitchen</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-455 uppercase font-semibold">Target Market Region</label>
              <select
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="United States">United States (US)</option>
                <option value="United Kingdom">United Kingdom (UK)</option>
                <option value="Canada">Canada (CA)</option>
                <option value="Europe">European Union (EU)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications Checkbox */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 text-slate-400" />
            Notification Settings
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-xs text-slate-650 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              <span>Email me when a new product opportunity crosses Score 90</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-650 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              <span>Weekly updates on competitor store marketing shifts</span>
            </label>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex-1">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-450 font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                <Check className="h-4.5 w-4.5" />
                Settings saved successfully!
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-750 text-white rounded-xl px-5 h-10 text-xs font-semibold shadow-xs transition-colors"
          >
            Save Settings
          </Button>
        </div>

      </div>
    </ShopifyPageShell>
  );
}
