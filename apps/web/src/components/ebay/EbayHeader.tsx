import { Bell, Command, Moon, Search, Sun, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useTheme } from '@repo/ui/theme/useTheme';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useEbayConnection } from '../../hooks/useEbayConnection';

export function EbayHeader() {
  const { user, profile } = useAuth();
  const { usage, subscribed, planName } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const { ebayConnected, lastSyncTime, isSyncing, syncNow } = useEbayConnection();
  const creditsRemaining = subscribed ? (usage?.credits_remaining ?? 0) : 0;

  const getLastSyncText = () => {
    if (!lastSyncTime) return 'Last sync: Never';
    const diffMs = Date.now() - lastSyncTime;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Last sync: Just now';
    if (diffMins === 1) return 'Last sync: 1 min ago';
    if (diffMins < 60) return `Last sync: ${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Last sync: 1 hour ago';
    if (diffHours < 24) return `Last sync: ${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Last sync: 1 day ago';
    return `Last sync: ${diffDays} days ago`;
  };

  const lastSyncText = getLastSyncText();

  return (
    <div className="flex items-center justify-between w-full">
      {/* Search Input Box */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SKU, listing title, order ID, buyer, item ID..."
            className="w-full h-9 pl-9 pr-14 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-semibold border border-border/50">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Center Connected Status Info */}
      {ebayConnected && (
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-semibold text-muted-foreground/95 ml-4">
          <span className="text-[#e53238] font-bold tracking-tight">e</span>
          <span className="text-[#0064d2] font-bold tracking-tight -ml-0.5">b</span>
          <span className="text-[#f5af02] font-bold tracking-tight -ml-0.5">a</span>
          <span className="text-[#86b817] font-bold tracking-tight -ml-0.5">y</span>
          <span className="text-foreground ml-1">eBay US</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
          <span className="text-emerald-600 dark:text-emerald-400">Connected</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="text-[10px] font-normal text-muted-foreground/80">{lastSyncText}</span>
        </div>
      )}

      {/* Right Action Controls */}
      <div className="flex items-center gap-2.5 ml-4">
        
        {/* Sync Now Button */}
        <Button 
          size="sm" 
          onClick={syncNow}
          disabled={isSyncing}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs border-0 disabled:opacity-75"
        >
          <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
        </Button>

        {/* Credits Counter Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 px-4 rounded-xl border border-border bg-card hover:bg-muted/30 text-xs font-bold flex items-center gap-1.5 text-foreground shadow-xs"
        >
          <Zap size={13} className="text-blue-500 fill-blue-500" />
          <span>{creditsRemaining.toLocaleString() || '10,240'} Credits</span>
        </Button>

        {/* Theme toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground border border-border bg-card"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notification Bell */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground border border-border bg-card"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[9px] font-extrabold text-white flex items-center justify-center border border-card">
            5
          </span>
        </Button>

      </div>
    </div>
  );
}
