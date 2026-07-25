import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm shadow-blue-500/20 border border-blue-500/30',
  secondary: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700/80',
  danger: 'bg-rose-600/80 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-500/30',
  ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent',
  outline: 'bg-transparent hover:bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-slate-600',
  success: 'bg-emerald-600/80 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/30',
};

const sizeStyles: Record<string, string> = {
  xs: 'px-2 py-1 text-[10px] font-bold rounded gap-1',
  sm: 'px-3 py-1.5 text-xs font-semibold rounded gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-md gap-2',
  lg: 'px-5 py-2.5 text-sm font-semibold rounded-lg gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const base = `inline-flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 select-none`;
  const styles = `${base} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  return (
    <button className={styles} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};
