import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'critical'
  | 'info'
  | 'cyber'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  dot = false,
  pulse = false,
  size = 'md',
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; dotColor: string }> = {
    default: {
      bg: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20',
      dotColor: 'bg-indigo-500',
    },
    success: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dotColor: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      dotColor: 'bg-amber-500',
    },
    destructive: {
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      dotColor: 'bg-rose-500',
    },
    critical: {
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      dotColor: 'bg-rose-500',
    },
    info: {
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      dotColor: 'bg-blue-500',
    },
    cyber: {
      bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      dotColor: 'bg-cyan-400',
    },
    neutral: {
      bg: 'bg-muted text-muted-foreground border-border',
      dotColor: 'bg-muted-foreground',
    },
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-0.5 font-medium gap-1.5',
  };

  const selected = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border tracking-wide select-none',
          selected.bg,
          sizeStyles[size],
          className
        )
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={twMerge(
                clsx(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  selected.dotColor
                )
              )}
            />
          )}
          <span
            className={twMerge(
              clsx('relative inline-flex rounded-full h-1.5 w-1.5', selected.dotColor)
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
};
