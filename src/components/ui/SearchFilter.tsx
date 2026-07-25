import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-8 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'slate';
}

const chipColors: Record<string, string> = {
  blue: 'bg-blue-600/90 text-white border-blue-500',
  emerald: 'bg-emerald-600/90 text-white border-emerald-500',
  rose: 'bg-rose-600/90 text-white border-rose-500',
  amber: 'bg-amber-600/90 text-white border-amber-500',
  violet: 'bg-violet-600/90 text-white border-violet-500',
  slate: 'bg-slate-800 text-slate-200 border-slate-700',
};

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active = false,
  onClick,
  color = 'blue',
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all duration-150 cursor-pointer ${
        active ? chipColors[color] : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
};

interface SelectFilterProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  className?: string;
}

export const SelectFilter: React.FC<SelectFilterProps> = ({ value, options, onChange, className = '' }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
