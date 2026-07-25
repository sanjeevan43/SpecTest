import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'default' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'xs' | 'sm';
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  get: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ring-1 ring-emerald-500/10',
  post: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 ring-1 ring-blue-500/10',
  put: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 ring-1 ring-amber-500/10',
  patch: 'bg-violet-500/15 text-violet-400 border border-violet-500/30 ring-1 ring-violet-500/10',
  delete: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 ring-1 ring-rose-500/10',
  default: 'bg-slate-700/60 text-slate-300 border border-slate-600/50',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
};

const sizeStyles: Record<string, string> = {
  xs: 'px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded',
  sm: 'px-2 py-0.5 text-[10px] font-bold tracking-wide rounded',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'xs',
  pulse = false,
  className = '',
}) => {
  const base = `inline-flex items-center uppercase ${variantStyles[variant]} ${sizeStyles[size]}`;
  return (
    <span className={`${base} ${className}`}>
      {pulse && (
        <span className="relative flex w-1.5 h-1.5 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
};
