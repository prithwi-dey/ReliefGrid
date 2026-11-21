import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';

export const ShortcutModal: React.FC = () => {
  const isShortcutHelpOpen = useReliefStore((s) => s.isShortcutHelpOpen);
  const setShortcutHelpOpen = useReliefStore((s) => s.setShortcutHelpOpen);

  if (!isShortcutHelpOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Toggle Simulation Play / Pause' },
    { key: 'F', desc: 'Toggle Road Flood Mode (Click any road to flood/clear)' },
    { key: 'S', desc: 'Toggle Drop SOS Mode (Click map to spawn incident)' },
    { key: 'B', desc: 'Launch Headless A/B Policy Benchmark' },
    { key: '?', desc: 'Toggle Keyboard Shortcuts Cheat Sheet' },
    { key: 'Esc', desc: 'Exit active chaos mode or close modals' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#070B14] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-sm font-bold">
            <Keyboard className="w-4 h-4" />
            <span>KEYBOARD SHORTCUTS</span>
          </div>
          <button
            onClick={() => setShortcutHelpOpen(false)}
            className="p-1 rounded bg-slate-900 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-bold shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="text-center pt-2 text-[11px] font-mono text-slate-400">
          Press any shortcut key directly while viewing the command center.
        </div>
      </div>
    </div>
  );
};
