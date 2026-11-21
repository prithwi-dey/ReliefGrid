import React from 'react';
import {
  Shield, Droplets, HeartPulse, AlertTriangle, CheckCircle2,
  Users
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';
import { Shelter } from '../../lib/types';

export const ShelterList: React.FC = () => {
  const state = useReliefStore((s) => s.state);
  const selectedEntity = useReliefStore((s) => s.selectedEntity);
  const setSelectedEntity = useReliefStore((s) => s.setSelectedEntity);

  if (!state) return null;

  const shelters = Object.values(state.shelters);

  return (
    <div className="flex flex-col border-b border-cyan-500/20 glass-panel">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
            Shelter Capacities
          </h2>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
          CAPACITY GUARD
        </span>
      </div>

      {/* Shelters Cards */}
      <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
        {shelters.map((shelter) => {
          const isOverflow = shelter.status === 'overflowed';
          const isFull = shelter.status === 'full';
          const isSelected = selectedEntity?.type === 'shelter' && selectedEntity.id === shelter.id;

          const occupied = Math.max(0, shelter.beds_total - shelter.beds_free);
          const reserved = shelter.beds_reserved;
          const availableFree = Math.max(0, shelter.beds_free - reserved);

          const freePct = (availableFree / shelter.beds_total) * 100;
          const reservedPct = (reserved / shelter.beds_total) * 100;
          const occupiedPct = (occupied / shelter.beds_total) * 100;

          return (
            <div
              key={shelter.id}
              onClick={() => setSelectedEntity({ type: 'shelter', id: shelter.id })}
              className={`p-2.5 rounded-lg border transition cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/70 border-emerald-400 shadow-lg shadow-emerald-950/40'
                  : isOverflow
                  ? 'bg-rose-950/40 border-rose-500/60 animate-pulse'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Shelter Name & Status Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-slate-200 truncate max-w-[170px]">
                  {shelter.name}
                </span>

                {isOverflow ? (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/30 border border-rose-500 text-rose-300 font-mono text-[9px] font-extrabold flex items-center space-x-1 animate-bounce">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>OVERFLOW (+{shelter.overflow_count})</span>
                  </span>
                ) : isFull ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-bold">
                    AT CAPACITY
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-bold">
                    AVAILABLE
                  </span>
                )}
              </div>

              {/* Segmented Capacity Bar */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>
                    Beds: <strong className="text-emerald-300 font-mono">{availableFree}</strong> free
                    {reserved > 0 && <span className="text-purple-300 ml-1">({reserved} rsv)</span>}
                  </span>
                  <span>{shelter.beds_total} Total</span>
                </div>

                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  {/* Occupied */}
                  <div
                    style={{ width: `${occupiedPct}%` }}
                    className="bg-slate-700 transition-all duration-300"
                    title={`Occupied: ${occupied}`}
                  />
                  {/* Reserved (Purple) */}
                  <div
                    style={{ width: `${reservedPct}%` }}
                    className="bg-purple-500 transition-all duration-300"
                    title={`Reserved: ${reserved}`}
                  />
                  {/* Free Available (Green) */}
                  <div
                    style={{ width: `${freePct}%` }}
                    className={`${isOverflow ? 'bg-rose-500' : 'bg-emerald-500'} transition-all duration-300`}
                    title={`Available: ${availableFree}`}
                  />
                </div>
              </div>

              {/* Auxiliary Resources: Water & Medical Supplies */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <div className="flex items-center space-x-1 text-cyan-300">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>Water {Math.round(shelter.water_pct)}%</span>
                </div>
                <div className="flex items-center space-x-1 text-rose-300">
                  <HeartPulse className="w-3 h-3 text-rose-400" />
                  <span>{shelter.medical_kits} Med Kits</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
