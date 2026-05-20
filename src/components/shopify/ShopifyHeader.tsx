import { Search, Bell, Command, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

export function ShopifyHeader() {
  const { user, profile } = useAuth();
  const { usage, limits, subscribed } = useSubscription();
  const { theme, toggleTheme } = useTheme();

  const creditsRemaining = subscribed ? (usage?.credits_remaining ?? 0) : 0;

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center justify-between w-full">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, stores, ads..."
            className="w-full h-10 pl-10 pr-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <Command className="h-3 w-3" />
            K
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 ml-4">
        {/* Credits */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">⚡</span>
          </div>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{creditsRemaining}</span>
          <span className="text-xs text-violet-500 dark:text-violet-400">Credits</span>
        </div>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-500" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* Date Range */}
        <Button variant="outline" size="sm" className="hidden md:flex h-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 gap-1.5">
          May 15 – Jun 13, 2025
          <ChevronDown className="h-3 w-3" />
        </Button>

        {/* Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[100px]">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {subscribed ? 'Pro Plan' : 'Free Plan'}
            </p>
          </div>
          <Avatar className="h-9 w-9 border-2 border-violet-200 dark:border-violet-800">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs font-medium">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
