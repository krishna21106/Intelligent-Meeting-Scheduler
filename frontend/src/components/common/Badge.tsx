import React from 'react';

interface BadgeProps {
  variant?: 'up' | 'down' | 'warning' | 'info' | 'default' | 'critical' | 'secondary';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  dot = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'up':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'down':
      case 'critical':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'info':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'secondary':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'up':
        return 'bg-emerald-500';
      case 'down':
      case 'critical':
        return 'bg-rose-500';
      case 'warning':
        return 'bg-amber-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVariantStyles()} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />}
      {children}
    </span>
  );
};

