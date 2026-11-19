import React from 'react';
import { motion } from 'framer-motion';

interface HealthGaugeProps {
  score: number;
  upCount: number;
  warningCount: number;
  downCount: number;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({
  score,
  upCount,
  warningCount,
  downCount,
}) => {
  // SVG gauge calculations: semicircle from -180 deg to 0 deg
  const radius = 64;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // 180 degrees arc
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 90) return '#10b981'; // Emerald
    if (score >= 75) return '#f59e0b'; // Amber
    return '#ef4444'; // Rose
  };

  const getScoreStatus = () => {
    if (score >= 90) return 'Optimal Performance';
    if (score >= 75) return 'Degraded Condition';
    return 'Critical Attention';
  };

  return (
    <div className="flex flex-col items-center justify-center p-2">
      {/* Semi-circular Gauge SVG */}
      <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
        <svg className="w-44 h-44 absolute -top-1" viewBox="0 0 160 160">
          {/* Background Arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="currentColor"
            className="text-muted/50"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Animated Value Arc */}
          <motion.path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]"
          />
        </svg>

        {/* Center Score Display */}
        <div className="text-center z-10 pb-1">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-3xl font-black tracking-tight text-foreground font-tabular block leading-none"
          >
            {score}%
          </motion.span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5 block">
            Health Index
          </span>
        </div>
      </div>

      {/* Status Label */}
      <div className="mt-2 text-center">
        <span
          className="text-xs font-bold tracking-tight inline-block px-2.5 py-0.5 rounded-full"
          style={{
            backgroundColor: `${getScoreColor()}15`,
            color: getScoreColor(),
          }}
        >
          {getScoreStatus()}
        </span>
      </div>

      {/* Mini Segment Counter Bars */}
      <div className="w-full mt-4 pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl p-1.5 bg-emerald-500/10 border border-emerald-500/20">
          <span className="block text-emerald-500 font-bold font-tabular text-sm">{upCount}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Nominal</span>
        </div>
        <div className="rounded-xl p-1.5 bg-amber-500/10 border border-amber-500/20">
          <span className="block text-amber-500 font-bold font-tabular text-sm">{warningCount}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Degraded</span>
        </div>
        <div className="rounded-xl p-1.5 bg-rose-500/10 border border-rose-500/20">
          <span className="block text-rose-500 font-bold font-tabular text-sm">{downCount}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Outage</span>
        </div>
      </div>
    </div>
  );
};
