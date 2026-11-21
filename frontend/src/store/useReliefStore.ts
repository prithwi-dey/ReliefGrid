import { create } from 'zustand';
import { SimulationState, DispatchPolicy, BenchmarkResult } from '../lib/types';
import { soundFX } from '../lib/sound';
import { API_BASE } from '../lib/config';

export interface ToastNotification {
  id: string;
  type: 'error' | 'success' | 'info' | 'warning';
  title?: string;
  message: string;
  timestamp: number;
}

interface ReliefStore {
  // Live Simulation State
  state: SimulationState | null;
  wsConnected: boolean;
  reconnectAttempt: number;
  reconnectDelaySeconds: number;

  // Pending Actions Tracker (for button loading spinners)
  pendingActions: Record<string, boolean>;

  // Toasts
  toasts: ToastNotification[];

  // UI & Interactive Control State
  audioEnabled: boolean;
  weatherRainEnabled: boolean;
  isBenchmarkOpen: boolean;
  isSplitViewOpen: boolean;
  isShortcutHelpOpen: boolean;
  showIntroSplash: boolean;
  chaosMode: 'none' | 'flood' | 'sos';
  selectedSosType: 'critical_medical' | 'stranded_family' | 'supply_request';
  selectedSosPeople: number;
  selectedEntity: { type: 'node' | 'edge' | 'vehicle' | 'shelter' | 'sos'; id: string } | null;

  // Map Navigation
  zoom: number;
  pan: { x: number; y: number };

  // Benchmark Cache
  benchmarkData: BenchmarkResult | null;
  isBenchmarkLoading: boolean;

  // Mutators
  setSimulationState: (state: SimulationState) => void;
  setWsConnected: (connected: boolean) => void;
  setReconnectStatus: (attempt: number, delaySeconds: number) => void;
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  isActionPending: (actionKey: string) => boolean;

  toggleAudio: () => void;
  toggleWeatherRain: () => void;
  setBenchmarkOpen: (open: boolean) => void;
  setSplitViewOpen: (open: boolean) => void;
  setShortcutHelpOpen: (open: boolean) => void;
  dismissIntroSplash: () => void;
  setChaosMode: (mode: 'none' | 'flood' | 'sos') => void;
  setSelectedSosType: (type: 'critical_medical' | 'stranded_family' | 'supply_request') => void;
  setSelectedSosPeople: (count: number) => void;
  setSelectedEntity: (entity: { type: 'node' | 'edge' | 'vehicle' | 'shelter' | 'sos'; id: string } | null) => void;
  setPanZoom: (pan: { x: number; y: number }, zoom: number) => void;

  // REST API Actions
  reloadStateAndScenario: () => Promise<void>;
  startSim: () => Promise<void>;
  pauseSim: () => Promise<void>;
  stepSim: () => Promise<void>;
  resetSim: () => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  setPolicy: (policy: DispatchPolicy) => Promise<void>;
  loadScenario: (name: string) => Promise<void>;
  toggleRoad: (edgeId: string) => Promise<void>;
  createSos: (nodeId?: string, x?: number, y?: number, type?: string, people?: number) => Promise<void>;
  autoDispatch: () => Promise<void>;
  runBenchmark: (scenarioName?: string) => Promise<void>;
}

export const useReliefStore = create<ReliefStore>((set, get) => {
  const setActionPending = (key: string, isPending: boolean) => {
    set((s) => ({
      pendingActions: {
        ...s.pendingActions,
        [key]: isPending,
      },
    }));
  };

  const handleApiError = (actionName: string, err: unknown) => {
    const message = err instanceof Error ? err.message : 'Backend unreachable or request timed out.';
    get().addToast({
      type: 'error',
      title: `${actionName} Failed`,
      message: `${message} (Backend may still be starting up)`,
    });
  };

  return {
    state: null,
    wsConnected: false,
    reconnectAttempt: 0,
    reconnectDelaySeconds: 1,

    pendingActions: {},
    toasts: [],

    audioEnabled: false,
    weatherRainEnabled: true,
    isBenchmarkOpen: false,
    isSplitViewOpen: false,
    isShortcutHelpOpen: false,
    showIntroSplash: true,
    chaosMode: 'none',
    selectedSosType: 'critical_medical',
    selectedSosPeople: 2,
    selectedEntity: null,

    zoom: 1.0,
    pan: { x: 0, y: 0 },

    benchmarkData: null,
    isBenchmarkLoading: false,

    setSimulationState: (newState) => {
      const prevState = get().state;
      if (prevState && newState) {
        if (newState.kpis.shelter_overflows > prevState.kpis.shelter_overflows) {
          soundFX.hazardWarning();
        } else if (newState.kpis.resolved_incidents > prevState.kpis.resolved_incidents) {
          soundFX.rescueChime();
        } else if (newState.kpis.pending_incidents > prevState.kpis.pending_incidents) {
          soundFX.ping(950, 0.1);
        }
      }
      set({ state: newState });
    },

    setWsConnected: (connected) => set((s) => ({
      wsConnected: connected,
      reconnectAttempt: connected ? 0 : s.reconnectAttempt + 1,
    })),

    setReconnectStatus: (attempt, delaySeconds) => set({
      reconnectAttempt: attempt,
      reconnectDelaySeconds: delaySeconds,
    }),

    addToast: (toast) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastNotification = {
        ...toast,
        id,
        timestamp: Date.now(),
      };
      set((s) => ({
        toasts: [...s.toasts.slice(-4), newToast], // keep up to 5 toasts
      }));

      // Auto-dismiss after 5.5 seconds
      setTimeout(() => {
        get().removeToast(id);
      }, 5500);
    },

    removeToast: (id) => set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

    isActionPending: (actionKey) => Boolean(get().pendingActions[actionKey]),

    toggleAudio: () => {
      const next = !get().audioEnabled;
      soundFX.setEnabled(next);
      if (next) soundFX.ping(880, 0.1);
      set({ audioEnabled: next });
    },

    toggleWeatherRain: () => set((s) => ({ weatherRainEnabled: !s.weatherRainEnabled })),
    setBenchmarkOpen: (open) => set({ isBenchmarkOpen: open }),
    setSplitViewOpen: (open) => set({ isSplitViewOpen: open }),
    setShortcutHelpOpen: (open) => set({ isShortcutHelpOpen: open }),
    dismissIntroSplash: () => set({ showIntroSplash: false }),
    setChaosMode: (mode) => set({ chaosMode: mode }),
    setSelectedSosType: (type) => set({ selectedSosType: type }),
    setSelectedSosPeople: (count) => set({ selectedSosPeople: count }),
    setSelectedEntity: (entity) => set({ selectedEntity: entity }),
    setPanZoom: (pan, zoom) => set({ pan, zoom }),

    // Reload State and Current Scenario after reconnection
    reloadStateAndScenario: async () => {
      try {
        const res = await fetch(`${API_BASE}/state`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SimulationState = await res.json();
        get().setSimulationState(data);
      } catch (e) {
        console.warn('Failed to reload state upon reconnection:', e);
      }
    },

    // REST API Implementations with Loading States & Error Toasts
    startSim: async () => {
      setActionPending('start', true);
      try {
        const res = await fetch(`${API_BASE}/sim/start`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      } catch (e) {
        handleApiError('Start Simulation', e);
      } finally {
        setActionPending('start', false);
      }
    },

    pauseSim: async () => {
      setActionPending('pause', true);
      try {
        const res = await fetch(`${API_BASE}/sim/pause`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      } catch (e) {
        handleApiError('Pause Simulation', e);
      } finally {
        setActionPending('pause', false);
      }
    },

    stepSim: async () => {
      setActionPending('step', true);
      try {
        const res = await fetch(`${API_BASE}/sim/step`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      } catch (e) {
        handleApiError('Step Simulation', e);
      } finally {
        setActionPending('step', false);
      }
    },

    resetSim: async () => {
      setActionPending('reset', true);
      try {
        const res = await fetch(`${API_BASE}/sim/reset`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        get().addToast({
          type: 'info',
          title: 'Scenario Reset',
          message: 'Simulation clock and units reset to T+00:00.',
        });
      } catch (e) {
        handleApiError('Reset Simulation', e);
      } finally {
        setActionPending('reset', false);
      }
    },

    setSpeed: async (speed) => {
      setActionPending('speed', true);
      try {
        const res = await fetch(`${API_BASE}/sim/speed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speed }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        handleApiError('Set Speed', e);
      } finally {
        setActionPending('speed', false);
      }
    },

    setPolicy: async (policy) => {
      setActionPending('policy', true);
      try {
        const res = await fetch(`${API_BASE}/policy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policy }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        get().addToast({
          type: 'info',
          title: 'Policy Switched',
          message: `Active dispatch algorithm set to ${policy === 'optimized' ? 'Priority-Optimized' : 'Naive FIFO Baseline'}.`,
        });
      } catch (e) {
        handleApiError('Switch Policy', e);
      } finally {
        setActionPending('policy', false);
      }
    },

    loadScenario: async (name) => {
      setActionPending('scenario', true);
      try {
        const res = await fetch(`${API_BASE}/scenario/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        get().addToast({
          type: 'success',
          title: 'Scenario Loaded',
          message: `Loaded "${name}" timeline and topology.`,
        });
      } catch (e) {
        handleApiError('Load Scenario', e);
      } finally {
        setActionPending('scenario', false);
      }
    },

    toggleRoad: async (edgeId) => {
      setActionPending(`road_${edgeId}`, true);
      try {
        const res = await fetch(`${API_BASE}/road/${edgeId}/toggle`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        soundFX.hazardWarning();
      } catch (e) {
        handleApiError('Toggle Road', e);
      } finally {
        setActionPending(`road_${edgeId}`, false);
      }
    },

    createSos: async (nodeId, x, y, type, people) => {
      setActionPending('sos', true);
      try {
        const pType = type || get().selectedSosType;
        const pCount = people || get().selectedSosPeople;
        const res = await fetch(`${API_BASE}/sos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_node_id: nodeId,
            x,
            y,
            type: pType,
            people_count: pCount,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        soundFX.alertCritical();
        get().addToast({
          type: 'warning',
          title: 'SOS Broadcast',
          message: `Emergency reported at ${nodeId || 'coordinates'} (${pCount} victims).`,
        });
      } catch (e) {
        handleApiError('Create SOS', e);
      } finally {
        setActionPending('sos', false);
      }
    },

    autoDispatch: async () => {
      setActionPending('autoDispatch', true);
      try {
        const res = await fetch(`${API_BASE}/dispatch/auto`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        soundFX.ping(1200, 0.15);
      } catch (e) {
        handleApiError('Auto-Dispatch', e);
      } finally {
        setActionPending('autoDispatch', false);
      }
    },

    runBenchmark: async (scenarioName) => {
      const sName = scenarioName || get().state?.scenario_name || 'Urban Flash Flood';
      set({ isBenchmarkLoading: true });
      try {
        const res = await fetch(`${API_BASE}/benchmark?scenario=${encodeURIComponent(sName)}&ticks=60`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data: BenchmarkResult = await res.json();
        set({ benchmarkData: data, isBenchmarkLoading: false, isBenchmarkOpen: true });
      } catch (e) {
        handleApiError('Benchmark Execution', e);
        set({ isBenchmarkLoading: false });
      }
    },
  };
});
