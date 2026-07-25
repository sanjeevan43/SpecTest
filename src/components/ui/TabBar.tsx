import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  compact?: boolean;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  orientation = 'horizontal',
  compact = false,
  className = '',
}) => {
  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 text-left ${
              activeTab === tab.id
                ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon && <span className="w-4 h-4 flex-shrink-0">{tab.icon}</span>}
            <span className="flex-1">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-[9px] font-bold rounded-full leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
            activeTab === tab.id
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
          }`}
        >
          {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full leading-none ${
                activeTab === tab.id ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
