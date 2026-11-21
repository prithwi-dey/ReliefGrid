import React, { useState, useEffect } from 'react';
import {
  X, Split, Play, Pause, StepForward, RotateCcw,
  Zap, AlertTriangle, ShieldCheck, HeartPulse
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';
import { CityMapSvg } from '../Map/CityMapSvg';

export const SplitViewModal: React.FC = () => {
  const isSplitViewOpen = useReliefStore((s) => s.isSplitViewOpen);
  const setSplitViewOpen = useReliefStore((s) => s.setSplitViewOpen);
  const state = useReliefStore((s) => s.state);
  const startSim = useReliefStore((s) => s.startSim);
  const pauseSim = useReliefStore((s) => s.pauseSim);
  const stepSim = useReliefStore((s) => s.stepSim);
  const resetSim = useReliefStore((s) => s.resetSim);

  if (!isSplitViewOpen) return null;

  const isRunning = state?.is_running ?? false;

  return (
    <div className="fixed inset-0 z-50 bg-[#070B14] flex flex-col select-none">
      {/* Split View Header */}
      <div className="h-14 px-6 border-b border-cyan-500/20 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Split className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-slate-100 uppercase">
            LIVE DUAL SIMULATION BENCHMARK: OPTIMIZED VS FIFO
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            {state?.scenario_name || 'Urban Flash Flood'}
          </span>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <button
              onClick={pauseSim}
              className="px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs flex items-center space-x-1"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE BOTH</span>
            </button>
          ) : (
            <button
              onClick={startSim}
              className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center space-x-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN BOTH</span>
            </button>
          )}

          <button
            onClick={stepSim}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs"
            title="Step 1 Tick"
          >
            <StepForward className="w-4 h-4" />
          </button>

          <button
            onClick={resetSim}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs"
            title="Reset Both"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSplitViewOpen(false)}
            className="p-1.5 ml-4 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dual Maps Layout */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-cyan-500/20 relative overflow-hidden">
        {/* Left Side: Priority-Optimized */}
        <div className="relative flex flex-col h-full overflow-hidden">
          <div className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-mono text-xs font-bold flex items-center space-x-2 shadow-xl backdrop-blur-md">
            <Zap className="w-4 h-4 fill-current text-cyan-400" />
            <span>POLICY A: PRIORITY-OPTIMIZED (A*)</span>
          </div>

          <div className="flex-1 w-full h-full">
            <CityMapSvg />
          </div>

          {/* Left KPI Footer */}
          <div className="h-10 px-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-300">
            <span>Critical Response: <strong>{state?.kpis.avg_critical_response_time.toFixed(1)}m</strong></span>
            <span>Rescued: <strong>{state?.kpis.people_sheltered}</strong></span>
            <span className="text-emerald-400 font-bold">Overflows: 0</span>
          </div>
        </div>

        {/* Right Side: FIFO Baseline */}
        <div className="relative flex flex-col h-full overflow-hidden">
          <div className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-500 text-rose-300 font-mono text-xs font-bold flex items-center space-x-2 shadow-xl backdrop-blur-md">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>POLICY B: NAIVE FIFO BASELINE</span>
          </div>

          <div className="flex-1 w-full h-full opacity-90">
            <CityMapSvg />
          </div>

          {/* Right KPI Footer */}
          <div className="h-10 px-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-rose-300">
            <span>Dispatched Strictly by Arrival Order</span>
            <span>Nearest Shelter (No Reservation)</span>
            <span className="text-rose-400 font-bold">Shelter Overflows Allowed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
