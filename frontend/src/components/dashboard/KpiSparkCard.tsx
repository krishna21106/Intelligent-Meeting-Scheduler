import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

interface KpiSparkCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'cyber';
  sparklineData?: number[];
  onClick?: () => void;
}

export const KpiSparkCard: React.FC<KpiSparkCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'default',
  sparklineData = [35, 42, 38, 55, 62, 58, 70, 78, 74, 85],
  onClick,
}) => {
  const variantConfig = {
    default: {
      borderGlow: 'border-border/80',
      iconBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      sparkColor: '#6366f1',
    },
    success: {
      borderGlow: 'border-emerald-500/30 border-glow-emerald',
      iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      sparkColor: '#10b981',
    },
    warning: {
      borderGlow: 'border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      sparkColor: '#f59e0b',
    },
    danger: {
      borderGlow: 'border-rose-500/30 border-glow-rose',
      iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      sparkColor: '#ef4444',
    },
    cyber: {
      borderGlow: 'border-cyan-500/30 border-glow-cyber',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      sparkColor: '#06b6d4',
    },
  };

  const current = variantConfig[variant];

  // SVG sparkline path generation
  const width = 84;
  const height = 28;
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;

  const points = sparklineData
    .map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Card
      onClick={onClick}
      className={`p-4 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${current.borderGlow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${current.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-end justify-between mt-2">
        <div>
          <span className="text-2xl font-black text-foreground tracking-tight font-tabular block">
            {value}
          </span>
          {subValue && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{subValue}</p>
          )}
        </div>

        {/* Embedded SVG Sparkline */}
        <div className="flex-shrink-0 ml-2">
          <svg width={width} height={height} className="overflow-visible">
            <polyline
              fill="none"
              stroke={current.sparkColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
            {/* End point dot */}
            {points && (
              <circle
                cx={points.split(' ').slice(-1)[0].split(',')[0]}
                cy={points.split(' ').slice(-1)[0].split(',')[1]}
                r="3"
                fill={current.sparkColor}
              />
            )}
          </svg>
        </div>
      </div>
    </Card>
  );
};
