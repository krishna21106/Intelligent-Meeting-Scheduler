import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'default',
  trend,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          topLine: 'from-emerald-500 to-teal-400',
          hoverGlow: 'hover:border-emerald-500/30 dark:hover:border-emerald-500/30',
        };
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          topLine: 'from-rose-500 to-pink-500',
          hoverGlow: 'hover:border-rose-500/30 dark:hover:border-rose-500/30',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          topLine: 'from-amber-500 to-orange-400',
          hoverGlow: 'hover:border-amber-500/30 dark:hover:border-amber-500/30',
        };
      case 'info':
        return {
          iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          topLine: 'from-blue-500 to-cyan-400',
          hoverGlow: 'hover:border-blue-500/30 dark:hover:border-blue-500/30',
        };
      default:
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          topLine: 'from-indigo-600 to-violet-500',
          hoverGlow: 'hover:border-indigo-500/30 dark:hover:border-indigo-500/30',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-card text-card-foreground p-5 rounded-2xl border border-border/80 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${styles.hoverGlow} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top subtle gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.topLine}`} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={`p-2.5 rounded-xl border ${styles.iconBg} shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-extrabold font-tabular tracking-tight text-foreground">{value}</span>
        {trend && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subValue && (
        <p className="mt-2 text-xs text-muted-foreground font-medium flex items-center gap-1.5 truncate">
          {subValue}
        </p>
      )}
    </div>
  );
};
