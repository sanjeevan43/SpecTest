import { Settings, Moon, Sun, Minus, X } from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';
import { IconButton } from '@/components/shared/Primitives';

export function Header({ onOpenSettings, onCollapse, onClose }: { onOpenSettings: () => void; onCollapse: () => void; onClose: () => void }) {
  const document = useAppStore((s) => s.document);
  const pageInfo = useAppStore((s) => s.pageInfo);
  const config = useAppStore((s) => s.config);
  const setConfig = useAppStore((s) => s.setConfig);

  const isDark = config.theme === 'dark';

  return (
    <div className="flex cursor-move items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-2.5 text-white dark:border-gray-800">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{document?.title ?? 'Swagger API Auto Tester'}</div>
        <div className="truncate text-[11px] opacity-80">
          {pageInfo?.framework ?? 'unknown'} · {document?.endpoints.length ?? 0} endpoints
        </div>
      </div>
      <IconButton title="Toggle theme" className="text-white hover:bg-white/15" onClick={() => setConfig({ theme: isDark ? 'light' : 'dark' })}>
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </IconButton>
      <IconButton title="Settings" className="text-white hover:bg-white/15" onClick={onOpenSettings}>
        <Settings size={15} />
      </IconButton>
      <IconButton title="Collapse" className="text-white hover:bg-white/15" onClick={onCollapse}>
        <Minus size={15} />
      </IconButton>
      <IconButton title="Close" className="text-white hover:bg-white/15" onClick={onClose}>
        <X size={15} />
      </IconButton>
    </div>
  );
}
