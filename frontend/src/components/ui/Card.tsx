import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'indigo' | 'cyber' | 'emerald' | 'rose' | 'none';
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = 'none', hoverEffect = false, children, ...props }, ref) => {
    const glowClasses = {
      none: 'border-border/80',
      indigo: 'border-indigo-500/30 border-glow-indigo',
      cyber: 'border-cyan-500/30 border-glow-cyber',
      emerald: 'border-emerald-500/30 border-glow-emerald',
      rose: 'border-rose-500/30 border-glow-rose',
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'bg-card/90 text-card-foreground rounded-2xl border backdrop-blur-md shadow-sm transition-all duration-200',
            glowClasses[glow],
            hoverEffect && 'hover:shadow-md hover:border-indigo-500/40 hover:-translate-y-0.5',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx('flex flex-col space-y-1.5 p-5', className))} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge(clsx('text-base font-semibold leading-none tracking-tight text-foreground', className))}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={twMerge(clsx('text-xs text-muted-foreground', className))} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx('p-5 pt-0', className))} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx('flex items-center p-5 pt-0 border-t border-border/50 mt-4', className))} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';
