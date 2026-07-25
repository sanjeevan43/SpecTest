import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: 'default' | 'accent' | 'danger' | 'success' | 'warning' | 'none';
}

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const borderStyles: Record<string, string> = {
  default: 'border border-slate-800/80',
  accent: 'border border-blue-500/30 shadow-sm shadow-blue-500/10',
  danger: 'border border-rose-500/30',
  success: 'border border-emerald-500/30',
  warning: 'border border-amber-500/30',
  none: 'border-0',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  onClick,
  padding = 'md',
  border = 'default',
}) => {
  const base = `bg-slate-900/60 backdrop-blur-sm rounded-xl ${borderStyles[border]} ${paddingStyles[padding]}`;
  const interactiveStyles = interactive
    ? 'cursor-pointer hover:bg-slate-800/60 hover:border-slate-700/80 transition-all duration-200 active:scale-[0.99]'
    : '';

  return (
    <div className={`${base} ${interactiveStyles} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, icon, actions, className = '' }) => {
  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
            {icon}
          </div>
        )}
        <div>
          <div className="text-sm font-bold text-white leading-tight">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 ml-3">{actions}</div>}
    </div>
  );
};
