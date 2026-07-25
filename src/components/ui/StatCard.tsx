import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'slate';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

const colorStyles: Record<string, { icon: string; value: string; glow: string }> = {
  blue: { icon: 'text-blue-400 bg-blue-500/15', value: 'text-blue-300', glow: 'shadow-blue-500/10' },
  emerald: { icon: 'text-emerald-400 bg-emerald-500/15', value: 'text-emerald-300', glow: 'shadow-emerald-500/10' },
  rose: { icon: 'text-rose-400 bg-rose-500/15', value: 'text-rose-300', glow: 'shadow-rose-500/10' },
  amber: { icon: 'text-amber-400 bg-amber-500/15', value: 'text-amber-300', glow: 'shadow-amber-500/10' },
  violet: { icon: 'text-violet-400 bg-violet-500/15', value: 'text-violet-300', glow: 'shadow-violet-500/10' },
  slate: { icon: 'text-slate-400 bg-slate-800', value: 'text-slate-200', glow: '' },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  icon,
  color = 'slate',
  trend,
  trendValue,
  className = '',
}) => {
  const styles = colorStyles[color];

  return (
    <div
      className={`bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-2 shadow-sm ${styles.glow} ${className}`}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${styles.icon}`}>
            {icon}
          </div>
        )}
        {trend && trendValue && (
          <div
            className={`flex items-center gap-0.5 text-[10px] font-bold ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-500'
            }`}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <div className={`text-xl font-black leading-none tabular-nums ${styles.value}`}>{value}</div>
        <div className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">{label}</div>
        {sub && <div className="text-[9px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

interface ProgressBarProps {
  percent: number;
  color?: 'blue' | 'emerald' | 'rose' | 'amber';
  showLabel?: boolean;
  height?: 'xs' | 'sm' | 'md';
  className?: string;
}

const progressColors: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
};

const heightStyles: Record<string, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  color = 'blue',
  showLabel = false,
  height = 'sm',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-slate-800 rounded-full overflow-hidden ${heightStyles[height]}`}>
        <div
          className={`${heightStyles[height]} rounded-full transition-all duration-700 ${progressColors[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-bold text-slate-400 tabular-nums w-9 text-right">{clamped}%</span>
      )}
    </div>
  );
};
