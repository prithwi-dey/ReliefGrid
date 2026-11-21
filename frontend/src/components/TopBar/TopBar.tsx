import React from 'react';
import {
  ShieldAlert, Play, Pause, StepForward, RotateCcw,
  Volume2, VolumeX, CloudRain, BarChart3, Split,
  HelpCircle, Zap, Activity, Loader2
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';

export const TopBar: React.FC = () => {
  const state = useReliefStore((s) => s.state);
  const wsConnected = useReliefStore((s) => s.wsConnected);
  const audioEnabled = useReliefStore((s) => s.audioEnabled);
  const weatherRainEnabled = useReliefStore((s) => s.weatherRainEnabled);
  const isBenchmarkLoading = useReliefStore((s) => s.isBenchmarkLoading);
  const isActionPending = useReliefStore((s) => s.isActionPending);

  const startSim = useReliefStore((s) => s.startSim);
  const pauseSim = useReliefStore((s) => s.pauseSim);
  const stepSim = useReliefStore((s) => s.stepSim);
  const resetSim = useReliefStore((s) => s.resetSim);
  const setSpeed = useReliefStore((s) => s.setSpeed);
  const setPolicy = useReliefStore((s) => s.setPolicy);
  const loadScenario = useReliefStore((s) => s.loadScenario);
  const autoDispatch = useReliefStore((s) => s.autoDispatch);
  const toggleAudio = useReliefStore((s) => s.toggleAudio);
  const toggleWeatherRain = useReliefStore((s) => s.toggleWeatherRain);
  const runBenchmark = useReliefStore((s) => s.runBenchmark);
  const setSplitViewOpen = useReliefStore((s) => s.setSplitViewOpen);
  const setShortcutHelpOpen = useReliefStore((s) => s.setShortcutHelpOpen);

  const isRunning = state?.is_running ?? false;
  const currentSpeed = state?.speed ?? 1;
  const currentPolicy = state?.policy ?? 'optimized';
  const scenarioName = state?.scenario_name ?? 'Urban Flash Flood';
  const tick = state?.tick ?? 0;

  // Pending action states
  const isStarting = isActionPending('start');
  const isPausing = isActionPending('pause');
  const isStepping = isActionPending('step');
  const isResetting = isActionPending('reset');
  const isPolicyPending = isActionPending('policy');
  const isAutoDispatching = isActionPending('autoDispatch');
  const isScenarioLoading = isActionPending('scenario');

  // Format tick as simulated time HH:MM (each tick = 1 min)
  const hours = Math.floor(tick / 60);
  const mins = tick % 60;
  const timeFormatted = `T+${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  return (
    <header className="h-16 px-4 bg-[#070B14]/90 backdrop-blur-md border-b border-cyan-500/20 flex items-center justify-between select-none z-30 relative">
      {/* Brand & Connection Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400/40">
            <ShieldAlert className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-base text-slate-100 uppercase">
                Relief<span className="text-cyan-400">Grid</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                MUNICIPAL CAD v2.4
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span>Emergency Operations Command</span>
              <span>•</span>
              <span className="text-xs flex items-center space-x-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span className={`font-mono text-[10px] font-bold ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {wsConnected ? 'TELEMETRY LIVE' : 'BACKEND WAKING UP...'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="hidden lg:flex items-center pl-4 border-l border-slate-800">
          <label className="text-[11px] uppercase tracking-wider text-slate-400 mr-2 font-mono">
            Scenario:
          </label>
          <div className="relative flex items-center">
            <select
              value={scenarioName}
              disabled={!wsConnected || isScenarioLoading}
              onChange={(e) => loadScenario(e.target.value)}
              className={`bg-slate-900/90 text-xs text-slate-200 border border-cyan-500/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 hover:border-cyan-400/60 font-medium transition ${
                !wsConnected || isScenarioLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="Urban Flash Flood">Urban Flash Flood (12 SOS, Bridge Collapse)</option>
              <option value="Cyclone Coastal Surge">Cyclone Coastal Surge (18 SOS, 4 Flooded Arterials)</option>
              <option value="Sandbox">Sandbox (Free-Play & Custom Chaos)</option>
            </select>
            {isScenarioLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 ml-2" />
            )}
          </div>
        </div>
      </div>

      {/* Center Controls: Play, Step, Speed, Simulated Clock */}
      <div className="flex items-center space-x-3">
        {/* Clock Pill */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center space-x-2 shadow-inner">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Sim Clock</span>
            <span className="text-sm font-mono font-bold tracking-wider text-cyan-300 num-telemetry">
              {timeFormatted}
            </span>
          </div>
        </div>

        {/* Sim Transport Controls */}
        <div
          className={`flex items-center space-x-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800 shadow-md transition ${
            !wsConnected ? 'opacity-50 ring-1 ring-amber-500/30' : ''
          }`}
          title={!wsConnected ? 'Controls locked: Backend is connecting/waking up' : undefined}
        >
          {isRunning ? (
            <button
              onClick={pauseSim}
              disabled={!wsConnected || isPausing}
              className={`p-1.5 px-3 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center space-x-1.5 text-xs font-semibold transition ${
                !wsConnected || isPausing ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              title={wsConnected ? 'Pause Simulation (Space)' : 'Controls locked: Backend connecting'}
            >
              {isPausing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              <span>{isPausing ? 'PAUSING...' : 'PAUSE'}</span>
            </button>
          ) : (
            <button
              onClick={startSim}
              disabled={!wsConnected || isStarting}
              className={`p-1.5 px-3 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center space-x-1.5 text-xs font-semibold transition ${
                !wsConnected || isStarting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              title={wsConnected ? 'Start Simulation (Space)' : 'Controls locked: Backend connecting'}
            >
              {isStarting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isStarting ? 'STARTING...' : 'RUN'}</span>
            </button>
          )}

          <button
            onClick={stepSim}
            disabled={!wsConnected || isStepping}
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 transition ${
              !wsConnected || isStepping ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={wsConnected ? 'Step 1 Minute' : 'Controls locked: Backend connecting'}
          >
            {isStepping ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <StepForward className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={resetSim}
            disabled={!wsConnected || isResetting}
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 transition ${
              !wsConnected || isResetting ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={wsConnected ? 'Reset Scenario' : 'Controls locked: Backend connecting'}
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Speed Selector */}
        <div className={`flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-xs font-mono transition ${
          !wsConnected ? 'opacity-50' : ''
        }`}>
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              disabled={!wsConnected}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded transition text-xs ${
                currentSpeed === s
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              } ${!wsConnected ? 'cursor-not-allowed' : ''}`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Policy Toggle: FIFO vs Priority-Optimized */}
        <div className={`flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono transition ${
          !wsConnected ? 'opacity-50 cursor-not-allowed ring-1 ring-amber-500/20' : ''
        }`}>
          <button
            disabled={!wsConnected || isPolicyPending}
            onClick={() => setPolicy('fifo')}
            className={`px-2.5 py-1.5 rounded transition flex items-center space-x-1.5 ${
              currentPolicy === 'fifo'
                ? 'bg-rose-600/90 text-white font-bold shadow-lg shadow-rose-900/40'
                : 'text-slate-400 hover:text-slate-200'
            } ${!wsConnected || isPolicyPending ? 'cursor-not-allowed' : ''}`}
            title={wsConnected ? 'Naive FIFO Baseline (No triage, no rerouting, nearest shelter)' : 'Controls locked: Backend connecting'}
          >
            {isPolicyPending && currentPolicy !== 'fifo' ? (
              <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            )}
            <span>FIFO Baseline</span>
          </button>
          <button
            disabled={!wsConnected || isPolicyPending}
            onClick={() => setPolicy('optimized')}
            className={`px-2.5 py-1.5 rounded transition flex items-center space-x-1.5 ${
              currentPolicy === 'optimized'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            } ${!wsConnected || isPolicyPending ? 'cursor-not-allowed' : ''}`}
            title={wsConnected ? 'Priority-Optimized (A* Dijkstra, Triage Queue, Capacity Reservation, Preemption)' : 'Controls locked: Backend connecting'}
          >
            {isPolicyPending && currentPolicy !== 'optimized' ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
            ) : (
              <Zap className="w-3 h-3 fill-current" />
            )}
            <span>Priority-Optimized</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Auto-Dispatch Button & Tools */}
      <div className="flex items-center space-x-2">
        {/* BIG AUTO-DISPATCH & OPTIMIZE BUTTON */}
        <button
          onClick={autoDispatch}
          disabled={!wsConnected || isAutoDispatching}
          className={`px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs tracking-wider uppercase flex items-center space-x-1.5 shadow-lg shadow-cyan-500/30 transition transform active:scale-95 ${
            !wsConnected || isAutoDispatching ? 'opacity-40 cursor-not-allowed grayscale' : ''
          }`}
          title={wsConnected ? 'Instant one-click triage re-scoring, vehicle assignment, and capacity reservation' : 'Controls locked: Backend connecting'}
        >
          {isAutoDispatching ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <Zap className="w-4 h-4 fill-current" />
          )}
          <span>{isAutoDispatching ? 'Optimizing...' : 'Auto-Dispatch & Optimize'}</span>
        </button>

        {/* Benchmark A/B Modal Launcher */}
        <button
          onClick={() => runBenchmark()}
          disabled={isBenchmarkLoading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition"
          title="Run Headless A/B Benchmark (Press B)"
        >
          {isBenchmarkLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <BarChart3 className="w-3.5 h-3.5" />
          )}
          <span>{isBenchmarkLoading ? 'Benchmarking...' : 'A/B Benchmark'}</span>
        </button>

        {/* Live Split View Launcher */}
        <button
          onClick={() => setSplitViewOpen(true)}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition"
          title="Live Dual Split-Screen Simulation"
        >
          <Split className="w-4 h-4" />
        </button>

        {/* Ambience & Audio Toggles */}
        <button
          onClick={toggleAudio}
          className={`p-2 rounded-lg border transition ${
            audioEnabled
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title={audioEnabled ? 'Mute Tactical Telemetry Audio' : 'Enable Tactical Telemetry Audio'}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleWeatherRain}
          className={`p-2 rounded-lg border transition ${
            weatherRainEnabled
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Storm Weather Ambience Layer"
        >
          <CloudRain className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShortcutHelpOpen(true)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Keyboard Shortcuts Cheat Sheet (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
