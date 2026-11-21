import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';

export const ReconnectingBanner: React.FC = () => {
  const wsConnected = useReliefStore((s) => s.wsConnected);
  const reconnectAttempt = useReliefStore((s) => s.reconnectAttempt);
  const reconnectDelaySeconds = useReliefStore((s) => s.reconnectDelaySeconds);
  const reloadStateAndScenario = useReliefStore((s) => s.reloadStateAndScenario);

  if (wsConnected) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 border-b border-amber-500/50 px-4 py-2 flex items-center justify-between text-xs font-mono shadow-2xl z-40 relative animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center space-x-3 text-amber-200">
        <div className="p-1 rounded bg-amber-500/20 border border-amber-500/40">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
          <span className="font-extrabold tracking-wide text-amber-100 uppercase">
            Backend waking up, please wait up to 60 seconds
          </span>
          <span className="text-amber-300/80 hidden sm:inline">•</span>
          <span className="text-amber-300/90 flex items-center space-x-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>
              Auto-reconnecting with exponential backoff (Next in ~{reconnectDelaySeconds}s, Attempt #{reconnectAttempt || 1})
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className="hidden md:inline text-[11px] text-amber-400/80 font-mono">
          [Controls Locked Offline]
        </span>
        <button
          onClick={() => reloadStateAndScenario()}
          className="px-2.5 py-1 rounded bg-amber-500/30 hover:bg-amber-500/40 border border-amber-400/50 text-amber-200 text-[11px] font-bold flex items-center space-x-1 transition active:scale-95"
          title="Probe backend health immediately"
        >
          <RefreshCw className="w-3 h-3 text-amber-300" />
          <span>Probe Link</span>
        </button>
      </div>
    </div>
  );
};
