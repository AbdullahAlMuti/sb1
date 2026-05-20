import { CreditCard, Check, ShieldCheck, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { cn } from '@repo/ui/lib/utils';

export default function BillingPage() {
  const usageStats = [
    { label: 'AI Copy Credits', used: 180, total: 1000, color: 'bg-violet-650' },
    { label: 'Tracked Stores', used: 5, total: 20, color: 'bg-emerald-500' },
    { label: 'Product Opp. Searches', used: 12, total: 50, color: 'bg-blue-500' },
  ];

  const invoiceHistory = [
    { date: 'May 10, 2025', desc: 'Dropea Pro - Monthly', amount: '$29.00', status: 'Paid' },
    { date: 'Apr 10, 2025', desc: 'Dropea Pro - Monthly', amount: '$29.00', status: 'Paid' },
    { date: 'Mar 10, 2025', desc: 'Dropea Pro - Monthly', amount: '$29.00', status: 'Paid' },
  ];

  return (
    <ShopifyPageShell
      icon={CreditCard}
      title="Billing & Subscription"
      description="Manage your SaaS subscription plan, inspect API credit usage limits, and view invoice history."
    >
      <div className="space-y-8">
        {/* Plan Overview & Credits grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Current plan card */}
          <div className="md:col-span-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] text-slate-450 uppercase font-semibold">Active Plan</span>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Pro Plan</h3>
                <Badge className="bg-violet-50 dark:bg-violet-950/20 text-violet-750 border border-violet-100/50 text-[10px] font-bold">
                  Monthly
                </Badge>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">$29.00<span className="text-xs font-semibold text-slate-400">/mo</span></p>
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-400">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>1,000 AI Studio Credits</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-400">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Track up to 20 stores</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-400">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Priority product discovery</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
              Next invoice date: June 10, 2025
            </p>
          </div>

          {/* Limit Usage card */}
          <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] text-slate-450 uppercase font-semibold">Usage Limits</span>
              <div className="space-y-4">
                {usageStats.map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-350">{stat.label}</span>
                      <span className="font-bold text-slate-850 dark:text-slate-200">
                        {stat.used} <span className="text-slate-400">/ {stat.total}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', stat.color)} style={{ width: `${(stat.used / stat.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
              <span className="text-[10px] text-slate-400">Credits automatically reset every month.</span>
              <Button variant="link" className="text-xs text-violet-650 font-bold p-0 h-auto">
                Need more limits?
              </Button>
            </div>
          </div>

        </div>

        {/* Invoice History */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white uppercase tracking-wider">Invoices & Statements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-2.5">Billing Date</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {invoiceHistory.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{inv.date}</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{inv.desc}</td>
                    <td className="py-3 text-right font-bold text-slate-800 dark:text-slate-200">{inv.amount}</td>
                    <td className="py-3 text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 text-[9px] font-semibold px-2 py-0.5">
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </ShopifyPageShell>
  );
}
