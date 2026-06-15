import { Bell, Command, Moon, Search, Sun, Zap } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useTheme } from '@repo/ui/theme/useTheme';

export function EbayHeader() {
  const { usage, subscribed } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const creditsRemaining = subscribed ? (usage?.credits_remaining ?? 0) : 0;

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search listings, orders, SKUs..."
            className="w-full h-10 pl-10 pr-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <Command className="h-3 w-3" />
            K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Zap className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{creditsRemaining}</span>
          <span className="text-xs text-blue-500 dark:text-blue-400">Credits</span>
        </div>

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-500" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>
      </div>
    </div>
  );
}
