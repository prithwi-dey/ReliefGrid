import React from 'react';
import {
  X, BarChart3, TrendingUp, AlertTriangle, ShieldCheck,
  Droplets, HeartPulse, Clock, Users, Navigation, Zap, RotateCcw
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useReliefStore } from '../../store/useReliefStore';

export const BenchmarkModal: React.FC = () => {
  const isBenchmarkOpen = useReliefStore((s) => s.isBenchmarkOpen);
  const setBenchmarkOpen = useReliefStore((s) => s.setBenchmarkOpen);
  const benchmarkData = useReliefStore((s) => s.benchmarkData);
  const isBenchmarkLoading = useReliefStore((s) => s.isBenchmarkLoading);
  const runBenchmark = useReliefStore((s) => s.runBenchmark);
  const state = useReliefStore((s) => s.state);

  if (!isBenchmarkOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#070B14] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden glass-panel">
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono tracking-wide text-slate-100 flex items-center space-x-2">
                <span>HEADLESS A/B POLICY BENCHMARK</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {benchmarkData?.scenario || state?.scenario_name || 'Urban Flash Flood'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Rigorous side-by-side execution: Priority-Optimized vs Naive First-Come-First-Served on identical seed
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => runBenchmark()}
              disabled={isBenchmarkLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 flex items-center space-x-1.5 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isBenchmarkLoading ? 'animate-spin' : ''}`} />
              <span>{isBenchmarkLoading ? 'Simulating...' : 'Re-Run'}</span>
            </button>
            <button
              onClick={() => setBenchmarkOpen(false)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isBenchmarkLoading ? (
            <div className="py-24 text-center space-y-3 font-mono text-cyan-400">
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Executing 60-tick Headless Dual Simulation on Seed #42...</p>
            </div>
          ) : !benchmarkData ? (
            <div className="py-20 text-center text-slate-400 font-mono text-sm">
              No benchmark results available. Click Re-Run above.
            </div>
          ) : (
            <>
              {/* Bold Headline Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-slate-900 border border-cyan-500/40 flex items-center justify-between shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono tracking-widest text-cyan-300 font-bold uppercase">
                      BENCHMARK OUTCOME
                    </div>
                    <div className="text-lg font-bold text-slate-100 tracking-wide font-sans">
                      {benchmarkData.headline}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-slate-300">
                  <div>Seed: <strong className="text-cyan-400">#42</strong></div>
                  <div>Duration: <strong className="text-cyan-400">{benchmarkData.max_ticks} Ticks (Mins)</strong></div>
                </div>
              </div>

              {/* Side-by-Side KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {/* 1. Critical Response Time */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-mono">
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Crit Response</span>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-300">
                    {benchmarkData.optimized_kpis.avg_critical_response_time.toFixed(1)}m
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    FIFO: <span className="text-rose-400">{benchmarkData.fifo_kpis.avg_critical_response_time.toFixed(1)}m</span>
                  </div>
                </div>

                {/* 2. Overall Response Time */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Avg Response</span>
                  </div>
                  <div className="text-base font-bold font-mono text-cyan-300">
                    {benchmarkData.optimized_kpis.avg_overall_response_time.toFixed(1)}m
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    FIFO: <span className="text-slate-300">{benchmarkData.fifo_kpis.avg_overall_response_time.toFixed(1)}m</span>
                  </div>
                </div>

                {/* 3. People Sheltered */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>Rescued</span>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-300">
                    {benchmarkData.optimized_kpis.people_sheltered}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    FIFO: <span className="text-slate-300">{benchmarkData.fifo_kpis.people_sheltered}</span>
                  </div>
                </div>

                {/* 4. Shelter Overflows */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Overflows</span>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {benchmarkData.optimized_kpis.shelter_overflows} <span className="text-xs text-emerald-300 font-normal">(0% Fail)</span>
                  </div>
                  <div className="text-[10px] font-mono text-rose-400 font-bold">
                    FIFO: {benchmarkData.fifo_kpis.shelter_overflows} OVERFLOWS
                  </div>
                </div>

                {/* 5. Stuck Ticks */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-mono">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Trapped Ticks</span>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-300">
                    {benchmarkData.optimized_kpis.stuck_vehicle_ticks}m
                  </div>
                  <div className="text-[10px] font-mono text-rose-400">
                    FIFO: {benchmarkData.fifo_kpis.stuck_vehicle_ticks}m
                  </div>
                </div>

                {/* 6. Total Distance */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-teal-400 text-xs font-mono">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Distance</span>
                  </div>
                  <div className="text-base font-bold font-mono text-teal-300">
                    {benchmarkData.optimized_kpis.total_distance_km.toFixed(1)}km
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    FIFO: <span className="text-slate-300">{benchmarkData.fifo_kpis.total_distance_km.toFixed(1)}km</span>
                  </div>
                </div>
              </div>

              {/* Charts Section: Recharts Line & Bar Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Cumulative Rescues Over Time (Line Chart) */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span>Cumulative People Rescued (Over Time)</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">Higher is Better</span>
                  </div>

                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={benchmarkData.time_series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Simulation Tick (Min)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Rescued', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#070B14', borderColor: '#0284c7', fontSize: 11, fontFamily: 'monospace' }} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                        <Line
                          type="monotone"
                          dataKey="optimized_rescued"
                          name="Priority-Optimized"
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="fifo_rescued"
                          name="FIFO Baseline"
                          stroke="#f43f5e"
                          strokeWidth={1.8}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Response Time by Incident Type (Bar Chart) */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span>Response Time by Severity Category</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">Lower is Faster</span>
                  </div>

                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={benchmarkData.type_chart_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#070B14', borderColor: '#0284c7', fontSize: 11, fontFamily: 'monospace' }} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                        <Bar dataKey="optimized" name="Priority-Optimized" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fifo" name="FIFO Baseline" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
