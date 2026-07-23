import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { Header } from '@/components/sidebar/Header';
import { Toolbar } from '@/components/sidebar/Toolbar';
import { SummaryBar } from '@/components/sidebar/SummaryBar';
import { Filters } from '@/components/sidebar/Filters';
import { ResultList } from '@/components/sidebar/ResultList';
import { ExportMenu } from '@/components/sidebar/ExportMenu';
import { SettingsPanel } from '@/components/sidebar/SettingsPanel';
import { Spinner } from '@/components/shared/Primitives';

export function SidebarApp({ tabId }: { tabId: number }) {
  const init = useAppStore((s) => s.init);
  const document_ = useAppStore((s) => s.document);
  const parseError = useAppStore((s) => s.parseError);
  const config = useAppStore((s) => s.config);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  const [width, setWidth] = useState(420);
  const [position, setPosition] = useState({ top: 24, right: 24 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; startTop: number; startRight: number } | null>(null);
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    init(tabId);
  }, [init, tabId]);

  useEffect(() => {
    const isSystemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = config.theme === 'dark' || (config.theme === 'system' && isSystemDark);
    const root = window.document.getElementById('swagger-api-auto-tester-root');
    root?.classList.toggle('dark', shouldBeDark);
  }, [config.theme]);

  function onDragStart(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, startY: e.clientY, startTop: position.top, startRight: position.right };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }
  function onDragMove(e: PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPosition({ top: Math.max(0, dragState.current.startTop + dy), right: Math.max(0, dragState.current.startRight - dx) });
  }
  function onDragEnd() {
    dragState.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  }

  function onResizeStart(e: React.PointerEvent) {
    resizeState.current = { startX: e.clientX, startWidth: width };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }
  function onResizeMove(e: PointerEvent) {
    if (!resizeState.current) return;
    const dx = resizeState.current.startX - e.clientX;
    setWidth(Math.min(720, Math.max(320, resizeState.current.startWidth + dx)));
  }
  function onResizeEnd() {
    resizeState.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="satt-root fixed bottom-6 right-6 z-[999999] flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-panel hover:bg-brand-700"
        title="Open Swagger API Auto Tester"
        style={{ position: 'fixed' }}
      >
        ⚡
      </button>
    );
  }

  if (sidebarCollapsed) {
    return (
      <div
        className="satt-root fixed z-[999999] flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-panel"
        style={{ top: position.top, right: position.right, position: 'fixed' }}
      >
        <span>{document_?.title ?? 'Swagger API Auto Tester'}</span>
        <button onClick={() => setSidebarCollapsed(false)} className="rounded-full bg-white/20 px-2 py-0.5">
          Expand
        </button>
      </div>
    );
  }

  return (
    <div
      className="satt-root fixed z-[999999] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-panel animate-slide-in dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      style={{ top: position.top, right: position.right, width, height: 'min(720px, 85vh)', position: 'fixed' }}
    >
      <div onPointerDown={onDragStart}>
        <Header onOpenSettings={() => setSettingsOpen(true)} onCollapse={() => setSidebarCollapsed(true)} onClose={() => setSidebarOpen(false)} />
      </div>

      <div
        onPointerDown={onResizeStart}
        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-brand-400/40"
      />

      {!document_ && !parseError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <Spinner className="h-6 w-6" />
          <span className="text-xs">Parsing OpenAPI document…</span>
        </div>
      )}

      {parseError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-red-500">
          Failed to parse the OpenAPI document:
          <span className="font-mono text-[11px] text-gray-500">{parseError}</span>
        </div>
      )}

      {document_ && (
        <>
          <Toolbar />
          <SummaryBar />
          <Filters />
          <ResultList />
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-2.5 dark:border-gray-800">
            <ExportMenu />
          </div>
        </>
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
