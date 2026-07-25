import React, { useState, useEffect } from 'react';
import { useApiStore } from '../store/apiStore';
import { useDependencyStore } from '../store/dependencyStore';
import { useTestStore } from '../store/testStore';
import { useValidationStore } from '../store/validationStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { useAuthenticationStore } from '../store/authenticationStore';
import { useReportStore } from '../store/reportStore';
import { useApiRunner } from '../hooks/useApiRunner';
import { useTestRunner } from '../hooks/useTestRunner';
import { ResponseComparator } from '../services/ResponseComparator';
import { SessionManager } from '../services/SessionManager';
import { SecureStorage } from '../storage/SecureStorage';
import { ReportGenerator } from '../services/ReportGenerator';
import { CurlGenerator } from '../services/CurlGenerator';
import { HttpFileGenerator } from '../services/HttpFileGenerator';
import { CollectionGenerator } from '../services/CollectionGenerator';
import { MarkdownReportGenerator } from '../services/MarkdownReportGenerator';
import { CsvReportGenerator } from '../services/CsvReportGenerator';
import { JsonReportGenerator } from '../services/JsonReportGenerator';
import { ExcelReportGenerator } from '../services/ExcelReportGenerator';
import { HtmlReportGenerator } from '../services/HtmlReportGenerator';
import { PdfReportGenerator } from '../services/PdfReportGenerator';
import type { ApiEndpoint } from '../types';
import type { Report } from '../models/Report';

interface ApiPanelProps {
  onClose: () => void;
  discoveredUrls: string[];
  onSelectUrl: (url: string) => void;
  selectedUrl: string | null;
}

type TabType = 'endpoints' | 'testCases' | 'auth' | 'reports' | 'graph' | 'settings';

export const ApiPanel: React.FC<ApiPanelProps> = ({
  onClose,
  discoveredUrls,
  onSelectUrl,
  selectedUrl,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('endpoints');

  const {
    document,
    loading,
    error,
    searchQuery,
    selectedMethod,
    selectedTag,
    selectedServerUrl,
    executionResults,
    statusFilter,
    setSearchQuery,
    setSelectedMethod,
    setSelectedTag,
    setSelectedServerUrl,
    setStatusFilter,
  } = useApiStore();

  const {
    isDependencyEngineEnabled,
    entityCache,
    manualMappings,
    dependencyGraph,
    setDependencyEngineEnabled,
    setManualMapping,
    clearEntityCache,
    clearStoredIds,
    clearManualMappings,
  } = useDependencyStore();

  const {
    scenarios,
    settings: testSettings,
    testFilter,
    updateSettings: updateTestSettings,
    setTestFilter,
  } = useTestStore();

  const {
    validationResults,
    settings: validationSettings,
    updateSettings: updateValidationSettings,
  } = useValidationStore();

  const {
    environments,
    selectedEnvironmentId,
    globalHeaders,
    isVariablesEnabled,
    selectEnvironment,
    updateEnvironment,
    setGlobalHeaders,
    setVariablesEnabled,
    loadFromStorage: loadEnvFromStorage,
  } = useEnvironmentStore();

  const {
    currentAuth,
    settings: authSettings,
    setCurrentAuth,
    updateSettings: updateAuthSettings,
    clearAuth,
    loadFromStorage: loadAuthFromStorage,
  } = useAuthenticationStore();

  const {
    reports,
    settings: reportSettings,
    compareLeftReportId,
    compareRightReportId,
    addReport,
    deleteReport,
    renameReport,
    setCompareLeft,
    setCompareRight,
    updateSettings: updateReportSettings,
    loadFromStorage: loadReportsFromStorage,
  } = useReportStore();

  const { runEndpoint, runAll, stop, retryFailed, isRunningAll } = useApiRunner();
  const { generateAllTests, runTestCase, runEndpointSuite, runAllScenarios, isRunningSuite } = useTestRunner();

  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [expandedTestDetail, setExpandedTestDetail] = useState<string | null>(null);
  const [showVisualDiff, setShowVisualDiff] = useState<boolean>(true);

  // Report creation local title input
  const [reportTitleInput, setReportTitleInput] = useState<string>('');

  // Auth local inputs
  const [tokenInput, setTokenInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [apiKeyNameInput, setApiKeyNameInput] = useState<string>('');
  const [apiKeyValueInput, setApiKeyValueInput] = useState<string>('');

  // Load storage states
  useEffect(() => {
    loadEnvFromStorage();
    loadAuthFromStorage();
    loadReportsFromStorage();
  }, []);

  // Sync auth state to local fields
  useEffect(() => {
    setTokenInput(currentAuth.token || '');
    setUsernameInput(currentAuth.username || '');
    setPasswordInput(currentAuth.password || '');
    setApiKeyNameInput(currentAuth.apiKeyName || '');
    setApiKeyValueInput(currentAuth.apiKeyValue || '');
  }, [currentAuth]);

  // Auto-generate test cases when document gets loaded
  useEffect(() => {
    if (document) {
      generateAllTests();
    }
  }, [document, testSettings.maxTestCases, testSettings.enableBoundary, testSettings.enableNegative, testSettings.maxStringLength, testSettings.maxArraySize]);

  // Filter endpoints
  const filteredEndpoints = document
    ? document.endpoints.filter((endpoint) => {
        const matchesSearch =
          endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (endpoint.summary &&
            endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesMethod =
          selectedMethod === 'ALL' || endpoint.method === selectedMethod;

        const matchesTag =
          selectedTag === 'ALL' || endpoint.tags.includes(selectedTag);

        const result = executionResults[endpoint.id];
        const matchesStatus =
          statusFilter === 'ALL' || (result && result.status === statusFilter);

        return matchesSearch && matchesMethod && matchesTag && matchesStatus;
      })
    : [];

  const allTags = document
    ? Array.from(new Set(document.endpoints.flatMap((e) => e.tags)))
    : [];

  // Exporter Actions for Reports
  const handleDownloadReport = (report: Report, format: string) => {
    let content = '';
    let mimeType = 'text/plain';
    let filename = `report-${report.id}`;

    switch (format) {
      case 'JSON':
        content = JsonReportGenerator.generate(report);
        mimeType = 'application/json';
        filename += '.json';
        break;
      case 'CSV':
        content = CsvReportGenerator.generate(report);
        mimeType = 'text/csv';
        filename += '.csv';
        break;
      case 'MARKDOWN':
        content = MarkdownReportGenerator.generate(report);
        mimeType = 'text/markdown';
        filename += '.md';
        break;
      case 'EXCEL':
        content = ExcelReportGenerator.generate(report);
        mimeType = 'application/vnd.ms-excel';
        filename += '.xls';
        break;
      case 'HTML':
        content = HtmlReportGenerator.generate(report);
        mimeType = 'text/html';
        filename += '.html';
        break;
      case 'PDF':
        content = PdfReportGenerator.generate(report);
        const win = window.open('', '_blank');
        win?.document.write(content);
        win?.document.close();
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleExportCollection = (format: string) => {
    if (!document) return;
    const currentReport = ReportGenerator.generateReport('Temporary Export');
    const apis = currentReport.apis;

    let content = '';
    let filename = `collection-${document.info.title.replace(/\s+/g, '-')}`;

    if (format === 'postman') {
      const pm = CollectionGenerator.toPostman(document.info.title, apis);
      content = JSON.stringify(pm, null, 2);
      filename += '.postman_collection.json';
    } else if (format === 'bruno') {
      content = CollectionGenerator.toBruno(apis);
      filename += '.bru';
    } else if (format === 'http') {
      content = HttpFileGenerator.generate(apis, reportSettings.maskSensitiveData);
      filename += '.http';
    } else if (format === 'insomnia') {
      const ins = CollectionGenerator.toInsomnia(document.info.title, apis);
      content = JSON.stringify(ins, null, 2);
      filename += '-insomnia.json';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // Report comparison dashboard generator
  const getComparisonSummary = () => {
    const left = reports.find((r) => r.id === compareLeftReportId);
    const right = reports.find((r) => r.id === compareRightReportId);

    if (!left || !right) return null;

    const leftFailedIds = new Set(left.apis.filter((a) => a.status === 'failed').map((a) => a.id));
    const rightFailedIds = new Set(right.apis.filter((a) => a.status === 'failed').map((a) => a.id));

    // New Failures: Failed in right (current/newer) but was passed/not-failed in left (previous)
    const newFailures = right.apis.filter((a) => a.status === 'failed' && !leftFailedIds.has(a.id));

    // Resolved Failures: Passed in right but was failed in left
    const resolvedFailures = right.apis.filter((a) => a.status === 'passed' && leftFailedIds.has(a.id));

    const latencyDelta = right.summary.p95ResponseTimeMs - left.summary.p95ResponseTimeMs;
    const validationScoreDelta = right.summary.averageValidationScore - left.summary.averageValidationScore;

    return {
      newFailures,
      resolvedFailures,
      latencyDelta,
      validationScoreDelta,
      leftTitle: left.title,
      rightTitle: right.title,
    };
  };

  const comparison = getComparisonSummary();

  // statistics
  const totalCount = document ? document.endpoints.length : 0;
  const passedCount = Object.values(executionResults).filter((r) => r.status === 'passed').length;
  const failedCount = Object.values(executionResults).filter((r) => r.status === 'failed').length;
  const progressPercent = totalCount > 0 ? Math.round(((passedCount + failedCount) / totalCount) * 100) : 0;

  // Test suite statistics
  const totalTestsCount = Object.values(scenarios).flat().length;
  const passedTestsCount = Object.values(scenarios).flat().filter((t) => t.status === 'passed').length;
  const failedTestsCount = Object.values(scenarios).flat().filter((t) => t.status === 'failed').length;
  const pendingTestsCount = Object.values(scenarios).flat().filter((t) => t.status === 'pending').length;

  const session = SessionManager.getSessionStatus();

  const getMethodBadgeClass = (method: string) => {
    const base = 'px-2 py-0.5 text-[9px] font-bold rounded mr-2 uppercase tracking-wide border';
    switch (method.toUpperCase()) {
      case 'GET':
        return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
      case 'POST':
        return `${base} bg-blue-500/10 text-blue-400 border-blue-500/20`;
      case 'PUT':
        return `${base} bg-amber-500/10 text-amber-400 border-amber-500/20`;
      case 'PATCH':
        return `${base} bg-purple-500/10 text-purple-400 border-purple-500/20`;
      case 'DELETE':
        return `${base} bg-rose-500/10 text-rose-400 border-rose-500/20`;
      default:
        return `${base} bg-slate-500/10 text-slate-400 border-slate-500/20`;
    }
  };

  const getStatusBadge = (status: string, code?: number) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Running</span>
          </span>
        );
      case 'passed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Pass {code && `(${code})`}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Fail {code && `(${code})`}</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] text-slate-500 font-bold bg-slate-800/40 border border-slate-800/85 px-1.5 py-0.5 rounded animate-pulse">
            Pending
          </span>
        );
    }
  };

  const getDiffStatusColor = (status: string) => {
    switch (status) {
      case 'missing':
        return 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
      case 'added':
        return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
      case 'mismatched':
        return 'text-red-400 bg-red-500/15 border border-red-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15';
    }
  };

  const handleCopyCurl = (endpointId: string) => {
    const resObj = executionResults[endpointId];
    if (resObj?.request) {
      const curl = CurlGenerator.generate(resObj.request, reportSettings.maskSensitiveData);
      navigator.clipboard.writeText(curl);
      alert('cURL command copied to clipboard!');
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-[2147483646] w-[490px] bg-slate-900 text-slate-100 shadow-2xl flex flex-col border-l border-slate-800 font-sans">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold shadow-md shadow-blue-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Swagger API Auto Tester</h2>
            <p className="text-[10px] text-slate-400">Step 9: Reporting & Export System</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-950/80 border-b border-slate-850 px-2 text-xs">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-3 py-2.5 font-bold transition-all border-b-2 hover:text-slate-100 ${
            activeTab === 'endpoints' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
          }`}
        >
          Endpoints
        </button>
        <button
          onClick={() => setActiveTab('testCases')}
          className={`px-3 py-2.5 font-bold transition-all border-b-2 hover:text-slate-100 ${
            activeTab === 'testCases' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
          }`}
        >
          Test Generator
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-3 py-2.5 font-bold transition-all border-b-2 hover:text-slate-100 ${
            activeTab === 'auth' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
          }`}
        >
          Auth & Envs
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3 py-2.5 font-bold transition-all border-b-2 hover:text-slate-100 ${
            activeTab === 'reports' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
          }`}
        >
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-2.5 font-bold transition-all border-b-2 hover:text-slate-100 ${
            activeTab === 'settings' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Processing...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
            <div className="font-bold mb-1 font-mono">Process Error</div>
            <p className="font-mono text-[10px] break-all leading-normal bg-slate-950/40 p-2 rounded">{error}</p>
          </div>
        )}

        {!loading && !error && document && (
          <>
            {/* TAB 1: ENDPOINTS */}
            {activeTab === 'endpoints' && (
              <div className="space-y-4">
                {/* Run Controls */}
                <div className="flex gap-2 p-1 bg-slate-950/30 border border-slate-800/80 rounded-lg">
                  <button
                    onClick={() => runAll()}
                    disabled={isRunningAll}
                    className="flex-1 py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Run Smart CRUD</span>
                  </button>
                  <button
                    onClick={stop}
                    className="py-2 px-3 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-755 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Stop</span>
                  </button>
                </div>

                {/* API Cards */}
                <div className="space-y-2">
                  {filteredEndpoints.map((endpoint) => {
                    const isExpanded = expandedEndpoint === endpoint.id;
                    const result = executionResults[endpoint.id] || {
                      status: 'pending',
                      request: null,
                      response: null,
                    };
                    const valResult = validationResults[endpoint.id];

                    return (
                      <div
                        key={endpoint.id}
                        className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-lg overflow-hidden transition-all duration-200"
                      >
                        {/* Summary Block */}
                        <div className="p-2.5 flex items-center justify-between select-none active:bg-slate-900/30">
                          <div
                            onClick={() => setExpandedEndpoint(isExpanded ? null : endpoint.id)}
                            className="flex items-center min-w-0 flex-1 cursor-pointer"
                          >
                            <span className={getMethodBadgeClass(endpoint.method)}>
                              {endpoint.method}
                            </span>
                            <span className="text-xs font-mono font-medium text-slate-200 truncate pr-2">
                              {endpoint.path}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {result.request && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCurl(endpoint.id);
                                }}
                                title="Copy cURL"
                                className="p-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                              >
                                cURL
                              </button>
                            )}

                            {getStatusBadge(result.status, result.response?.statusCode)}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                runEndpoint(endpoint.id);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-350 transition-colors"
                            >
                              Run
                            </button>
                          </div>
                        </div>

                        {/* Expanded Block */}
                        {isExpanded && (
                          <div className="p-3 bg-slate-950/60 border-t border-slate-800/60 text-xs space-y-3 leading-relaxed">
                            {/* PRE-FLIGHT REQUEST INSPECTION PANEL */}
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-850 space-y-1.5 font-mono text-[10px]">
                              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-sans block mb-1">
                                Pre-flight Request Inspector
                              </span>
                              <div>
                                <span className="text-slate-500">Target Path (Resolved):</span>
                                <div className="text-slate-250 break-all">{endpoint.path}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Active Authentication:</span>
                                <div className="text-indigo-400 capitalize">{currentAuth.method}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: REPORTS & COMPARISON DASHBOARD */}
            {activeTab === 'reports' && (
              <div className="space-y-5 text-xs">
                {/* Collection Exporters */}
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg space-y-3">
                  <div>
                    <span className="font-bold text-white block text-sm">Export API Client Collection</span>
                    <span className="text-slate-450 text-[11px]">Generate collection bundles for external REST clients.</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleExportCollection('postman')}
                      className="py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded font-bold"
                    >
                      Postman
                    </button>
                    <button
                      onClick={() => handleExportCollection('bruno')}
                      className="py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded font-bold"
                    >
                      Bruno
                    </button>
                    <button
                      onClick={() => handleExportCollection('http')}
                      className="py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded font-bold"
                    >
                      REST (.http)
                    </button>
                  </div>
                </div>

                {/* Generate New Report Form */}
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg space-y-3">
                  <div>
                    <span className="font-bold text-white block text-sm">Create Execution Report</span>
                    <span className="text-slate-450 text-[11px]">Compile active CRUD results into a saved history report.</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Report Title (e.g. QA Release)"
                      value={reportTitleInput}
                      onChange={(e) => setReportTitleInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!reportTitleInput.trim()) return;
                        const r = ReportGenerator.generateReport(reportTitleInput);
                        addReport(r);
                        setReportTitleInput('');
                        alert('Report generated and saved in history!');
                      }}
                      className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {/* Report Comparison Dashboard */}
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg space-y-3">
                  <div>
                    <span className="font-bold text-white block text-sm">Compare Reports Dashboard</span>
                    <span className="text-slate-450 text-[11px]">Compare current vs historical test runs to highlight delta metrics.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={compareLeftReportId || ''}
                      onChange={(e) => setCompareLeft(e.target.value || null)}
                      className="bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-none"
                    >
                      <option value="">Select Left Report</option>
                      {reports.map((r) => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                    <select
                      value={compareRightReportId || ''}
                      onChange={(e) => setCompareRight(e.target.value || null)}
                      className="bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 focus:outline-none"
                    >
                      <option value="">Select Right Report</option>
                      {reports.map((r) => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  </div>

                  {comparison && (
                    <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-3 font-mono text-[10px]">
                      <div className="text-[11px] font-bold text-indigo-400 border-b border-slate-850 pb-1.5">
                        Comparison: {comparison.leftTitle} vs {comparison.rightTitle}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-slate-500">Latency Delta (P95):</div>
                          <div className={`font-bold ${comparison.latencyDelta <= 0 ? 'text-emerald-450' : 'text-rose-455'}`}>
                            {comparison.latencyDelta > 0 ? `+${comparison.latencyDelta}` : comparison.latencyDelta}ms
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Validation Score Delta:</div>
                          <div className={`font-bold ${comparison.validationScoreDelta >= 0 ? 'text-emerald-450' : 'text-rose-455'}`}>
                            {comparison.validationScoreDelta > 0 ? `+${comparison.validationScoreDelta}` : comparison.validationScoreDelta}%
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 font-bold mb-1">New Failures ({comparison.newFailures.length}):</div>
                        {comparison.newFailures.length > 0 ? (
                          <div className="space-y-0.5 pl-2 border-l border-rose-500/30 text-rose-400 max-h-24 overflow-y-auto">
                            {comparison.newFailures.map((f) => (
                              <div key={f.id}>{f.method} {f.path}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-650 italic">None</div>
                        )}
                      </div>

                      <div>
                        <div className="text-slate-500 font-bold mb-1">Resolved Failures ({comparison.resolvedFailures.length}):</div>
                        {comparison.resolvedFailures.length > 0 ? (
                          <div className="space-y-0.5 pl-2 border-l border-emerald-500/30 text-emerald-400 max-h-24 overflow-y-auto">
                            {comparison.resolvedFailures.map((r) => (
                              <div key={r.id}>{r.method} {r.path}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-650 italic">None</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Historical Reports list */}
                <div className="space-y-2">
                  <span className="font-bold text-white block text-sm">Reports History ({reports.length})</span>
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2.5"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-200">{report.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(report.executionDate).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-850 font-mono text-[10px]">
                        <div>Score: <span className="text-blue-400 font-bold">{report.summary.averageValidationScore}%</span></div>
                        <div>Success: <span className="text-emerald-450 font-bold">{report.summary.successRate}%</span></div>
                        <div>Avg Latency: <span className="text-slate-350">{report.summary.averageResponseTimeMs}ms</span></div>
                      </div>

                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleDownloadReport(report, 'JSON')}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px]"
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => handleDownloadReport(report, 'CSV')}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px]"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleDownloadReport(report, 'MARKDOWN')}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px]"
                        >
                          MD
                        </button>
                        <button
                          onClick={() => handleDownloadReport(report, 'EXCEL')}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px]"
                        >
                          Excel
                        </button>
                        <button
                          onClick={() => handleDownloadReport(report, 'HTML')}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px]"
                        >
                          HTML
                        </button>
                        <button
                          onClick={() => handleDownloadReport(report, 'PDF')}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px]"
                        >
                          PDF Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: SETTINGS CONTROL PANEL */}
            {activeTab === 'settings' && (
              <div className="space-y-5 text-xs">
                {/* Exporter configurations settings */}
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg space-y-4">
                  <div>
                    <span className="font-bold text-white block text-sm">Exporter & Report Options</span>
                    <span className="text-slate-450 text-[11px]">Configure formatting and safety parameters.</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-300">Mask Sensitive Headers & cURL Tokens</span>
                      <input
                        type="checkbox"
                        checked={reportSettings.maskSensitiveData}
                        onChange={(e) => updateReportSettings({ maskSensitiveData: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-300">Include Request Bodies Payload</span>
                      <input
                        type="checkbox"
                        checked={reportSettings.includeRequestBodies}
                        onChange={(e) => updateReportSettings({ includeRequestBodies: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-300">Include Response Bodies Payload</span>
                      <input
                        type="checkbox"
                        checked={reportSettings.includeResponseBodies}
                        onChange={(e) => updateReportSettings({ includeResponseBodies: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
