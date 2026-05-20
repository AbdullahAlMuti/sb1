import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';

interface ShopifyPageShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  ctaText?: string;
  ctaHref?: string;
}

/**
 * Reusable page shell for Shopify pages in Dropea.
 * Provides consistent premium header and clean, border-based empty/coming soon states.
 */
export function ShopifyPageShell({
  icon: Icon,
  title,
  description,
  children,
  ctaText,
  ctaHref,
}: ShopifyPageShellProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Page Content */}
      {children ? (
        children
      ) : (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-2">Workspace Module Coming Soon</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            We are indexing the latest Shopify store trends and ad creatives. This section will be populated shortly.
          </p>
          {ctaText && ctaHref && (
            <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-colors">
              <Link to={ctaHref}>
                {ctaText}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
