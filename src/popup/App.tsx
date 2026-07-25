import React, { useEffect, useState } from 'react';
import type { BackgroundStateResponse } from '../types';

interface TabState {
  url: string;
  detected: boolean;
  framework: string;
  version: string;
}

export function App() {
  const [tabState, setTabState] = useState<TabState | null>(null);
  const [loading, setLoading] = useState(true);

  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  const name = manifest.name;

  useEffect(() => {
    async function fetchState() {
      setLoading(true);
      // Get current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const tabUrl = activeTab?.url || 'Unknown';

        // Message background to get state
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response: BackgroundStateResponse) => {
          if (chrome.runtime.lastError || !response) {
            setTabState({
              url: tabUrl,
              detected: false,
              framework: 'None',
              version: version,
            });
          } else {
            setTabState({
              url: tabUrl,
              detected: response.detected,
              framework: response.pageInfo?.framework || 'None',
              version: version,
            });
          }
          setLoading(false);
        });
      });
    }

    fetchState();
  }, [version]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 w-80">
        <div className="w-5 h-5 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    );
  }

  const isSwagger = tabState?.detected ?? false;

  return (
    <div className="w-80 bg-slate-900 text-slate-100 p-5 select-none font-sans">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold shadow-md shadow-blue-500/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">{name}</h1>
          <p className="text-[10px] text-slate-400 font-medium">Version {tabState?.version}</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="space-y-4 text-xs">
        {/* Current Tab */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Tab</span>
          <div className="mt-1 p-2 bg-slate-950/50 border border-slate-800 rounded-md text-slate-300 break-all max-h-16 overflow-y-auto font-mono text-[10px] scrollbar-thin">
            {tabState?.url}
          </div>
        </div>

        {/* Detection Status */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/30 border border-slate-800/80">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Swagger Detected</span>
            <div className="mt-0.5 text-xs font-semibold text-slate-200">
              {isSwagger ? `Yes (${tabState?.framework})` : 'No'}
            </div>
          </div>
          <div className="flex items-center">
            {isSwagger ? (
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="inline-flex rounded-full h-3.5 w-3.5 bg-slate-600"></span>
            )}
          </div>
        </div>

        {/* Operational Status */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
          <div className="mt-1 flex items-center gap-1.5 text-slate-300 font-medium">
            {isSwagger ? (
              <>
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Detection Active. Floating button injected.</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Waiting for Swagger page.</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
