import React from 'react';
import {
  Activity, AlertTriangle, ShieldCheck, HeartPulse,
  Navigation, Droplets, Clock, Users, ArrowUpRight
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';

export const EventLogTicker: React.FC = () => {
  const state = useReliefStore((s) => s.state);

  if (!state) return null;

  const kpis = state.kpis;
  const recentEvents = state.event_log.slice(-12).reverse();

  return (
    <footer className="h-28 bg-[#070B14]/95 border-t border-cyan-500/20 glass-panel flex flex-col select-none z-20">
      {/* Top Half: Real-time Command KPI Strip */}
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-6 overflow-x-auto py-1">
          {/* Critical Response Time */}
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Critical Response</div>
              <div className="text-sm font-bold text-rose-300 num-telemetry">
                {kpis.avg_critical_response_time.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">min</span>
              </div>
            </div>
          </div>

          {/* Overall Response Time */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Overall Response</div>
              <div className="text-sm font-bold text-cyan-300 num-telemetry">
                {kpis.avg_overall_response_time.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">min</span>
              </div>
            </div>
          </div>

          {/* People Sheltered */}
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">People Sheltered</div>
              <div className="text-sm font-bold text-emerald-300 num-telemetry">
                {kpis.people_sheltered} <span className="text-[10px] text-slate-400 font-normal">rescued</span>
              </div>
            </div>
          </div>

          {/* Shelter Overflows */}
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-4 h-4 ${kpis.shelter_overflows > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Shelter Overflows</div>
              <div className={`text-sm font-bold num-telemetry ${kpis.shelter_overflows > 0 ? 'text-rose-400 font-extrabold' : 'text-slate-400'}`}>
                {kpis.shelter_overflows} <span className="text-[10px] text-slate-400 font-normal">victims over cap</span>
              </div>
            </div>
          </div>

          {/* Stuck Vehicle Ticks */}
          <div className="flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Stuck in Water</div>
              <div className={`text-sm font-bold num-telemetry ${kpis.stuck_vehicle_ticks > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {kpis.stuck_vehicle_ticks} <span className="text-[10px] text-slate-400 font-normal">ticks penalty</span>
              </div>
            </div>
          </div>

          {/* Total Fleet Distance */}
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-teal-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Fleet Distance</div>
              <div className="text-sm font-bold text-teal-300 num-telemetry">
                {kpis.total_distance_km.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Active Mode Badge */}
        <div className="flex items-center space-x-2 pl-4 border-l border-slate-800">
          <span className="text-[10px] font-mono text-slate-400">DISPATCH ALGORITHM:</span>
          <span className={`px-2 py-0.5 rounded font-mono font-extrabold text-[11px] ${
            state.policy === 'optimized'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {state.policy === 'optimized' ? 'PRIORITY-OPTIMIZED (A*)' : 'NAIVE FIFO BASELINE'}
          </span>
        </div>
      </div>

      {/* Bottom Half: Live Scrolling Event Log Ticker */}
      <div className="h-16 px-4 flex items-center space-x-3 overflow-x-auto whitespace-nowrap scrollbar-thin">
        <div className="flex items-center space-x-1.5 text-cyan-400 font-mono text-xs font-bold shrink-0 pr-3 border-r border-slate-800">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>INCIDENT LOG</span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          {recentEvents.length === 0 ? (
            <span className="text-slate-400 italic">No events logged yet.</span>
          ) : (
            recentEvents.map((ev) => {
              const isCrit = ev.severity === 'critical';
              const isWarn = ev.severity === 'warning';
              const isSuccess = ev.severity === 'success';

              const badgeColor = isCrit
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : isWarn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700';

              return (
                <div
                  key={ev.id}
                  className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 shrink-0"
                >
                  <span className="text-[10px] text-slate-400">T+{ev.tick}m</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-bold ${badgeColor}`}>
                    {ev.type}
                  </span>
                  <span className="text-slate-200 text-[11px] font-sans">
                    {ev.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </footer>
  );
};
