import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'accent' | 'featured';
  progress?: number;
  sparklineData?: number[];
}

export function StatsCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  variant = 'default',
  progress,
  sparklineData,
}: StatsCardProps) {
  const isFeatured = variant === 'featured';
  const hasChange = change !== undefined;
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className={cn(
      "rounded-2xl p-5 transition-all duration-200 relative overflow-hidden group",
      isFeatured 
        ? "bg-[#c8f169] dark:bg-[#c8f169] text-foreground col-span-1 row-span-2" 
        : "bg-card border border-border hover:border-primary/20"
    )}>
      {/* Header with icon and change badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
          isFeatured 
            ? "bg-foreground/10" 
            : "bg-muted group-hover:bg-primary/10"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            isFeatured 
              ? "text-foreground" 
              : "text-muted-foreground group-hover:text-primary transition-colors"
          )} />
        </div>
        
        {hasChange && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
            isFeatured 
              ? "bg-foreground/10 text-foreground" 
              : isPositive 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}>
            {isPositive ? '+' : ''}{change}%
          </div>
        )}
      </div>

      {/* Title */}
      <p className={cn(
        "text-xs mb-1",
        isFeatured ? "text-foreground/70" : "text-muted-foreground"
      )}>
        {title}
      </p>

      {/* Value and Sparkline */}
      <div className="flex items-end justify-between">
        <p className={cn(
          "text-2xl font-semibold tracking-tight",
          isFeatured ? "text-foreground" : "text-foreground"
        )}>
          {value}
        </p>
        
        {/* Mini Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-16 h-8">
            <Sparkline data={sparklineData} featured={isFeatured} />
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className={cn(
          "text-xs mt-2",
          isFeatured ? "text-foreground/60" : "text-muted-foreground/70"
        )}>
          {subtitle}
        </p>
      )}

      {/* Optional Progress Bar */}
      {progress !== undefined && (
        <div className="mt-4">
          <div className={cn(
            "w-full h-1.5 rounded-full overflow-hidden",
            isFeatured ? "bg-foreground/10" : "bg-muted"
          )}>
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isFeatured ? "bg-foreground/40" : "bg-primary"
              )}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          {changeLabel && (
            <p className={cn(
              "text-xs mt-2",
              isFeatured ? "text-foreground/60" : "text-muted-foreground"
            )}>
              {changeLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Mini Sparkline Chart Component
function Sparkline({ 
  data, 
  featured = false 
}: { 
  data: number[]; 
  featured?: boolean;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const width = 64;
  const height = 32;
  const padding = 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * usableWidth;
    const y = padding + usableHeight - ((value - min) / range) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = featured ? 'rgba(0,0,0,0.6)' : 'currentColor';

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className={cn(
        "w-full h-full",
        !featured && "text-muted-foreground"
      )}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Compact Stats Card for smaller spaces
export function CompactStatsCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'accent';
}) {
  const variantStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-500/10 text-emerald-500',
    warning: 'bg-amber-500/10 text-amber-500',
    accent: 'bg-primary/10 text-primary',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", variantStyles[variant])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
