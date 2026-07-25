import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}) => {
  const trackSm = 'w-8 h-4';
  const thumbSm = 'w-3 h-3';
  const trackMd = 'w-10 h-5';
  const thumbMd = 'w-3.5 h-3.5';

  const isSm = size === 'sm';

  return (
    <label className={`flex items-start gap-3 cursor-pointer select-none group ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex-shrink-0 pt-0.5">
        <div
          onClick={() => onChange(!checked)}
          className={`relative inline-flex items-center rounded-full transition-colors duration-200 ${isSm ? trackSm : trackMd} ${
            checked ? 'bg-blue-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block rounded-full bg-white shadow transform transition-transform duration-200 ${isSm ? thumbSm : thumbMd} ${
              checked ? (isSm ? 'translate-x-4.5' : 'translate-x-5') : 'translate-x-0.5'
            }`}
          />
        </div>
      </div>
      {(label || description) && (
        <div>
          {label && <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</div>}
          {description && <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{description}</div>}
        </div>
      )}
    </label>
  );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
  inputClassName?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  description,
  error,
  icon,
  className = '',
  inputClassName = '',
  ...props
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
        )}
        <input
          className={`w-full bg-slate-950/80 border rounded-lg py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${
            error
              ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50'
              : 'border-slate-800 focus:ring-blue-500/40 focus:border-blue-500/50'
          } ${icon ? 'pl-8' : 'pl-3'} pr-3 ${inputClassName}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-rose-400">{error}</p>}
      {description && !error && <p className="text-[10px] text-slate-500">{description}</p>}
    </div>
  );
};

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  options: { label: string; value: string }[];
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, description, options, className = '', ...props }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <select
        className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all cursor-pointer"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {description && <p className="text-[10px] text-slate-500">{description}</p>}
    </div>
  );
};
