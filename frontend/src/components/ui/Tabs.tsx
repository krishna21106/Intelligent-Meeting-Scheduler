import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 p-1 bg-muted/60 border border-border/60 rounded-xl backdrop-blur-sm',
          className
        )
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors select-none',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-background shadow-xs border border-border/80 rounded-lg -z-0"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
              />
            )}
            {tab.icon && <span className="relative z-10 flex-shrink-0">{tab.icon}</span>}
            <span className="relative z-10">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="relative z-10 ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
