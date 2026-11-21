import { create } from 'zustand';
import { SimulationState, DispatchPolicy, BenchmarkResult } from '../lib/types';
import { soundFX } from '../lib/sound';
import { API_BASE } from '../lib/config';

interface ReliefStore {
  // Live Simulation State
  state: SimulationState | null;
  wsConnected: boolean;
  reconnectAttempt: number;

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

export const useReliefStore = create<ReliefStore>((set, get) => ({
  state: null,
  wsConnected: false,
  reconnectAttempt: 0,

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
    // Check if new critical event arrived to trigger sound
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
    reconnectAttempt: connected ? 0 : s.reconnectAttempt + 1
  })),

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

  // REST API Implementations
  startSim: async () => {
    try {
      await fetch(`${API_BASE}/sim/start`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  },

  pauseSim: async () => {
    try {
      await fetch(`${API_BASE}/sim/pause`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  },

  stepSim: async () => {
    try {
      await fetch(`${API_BASE}/sim/step`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  },

  resetSim: async () => {
    try {
      await fetch(`${API_BASE}/sim/reset`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  },

  setSpeed: async (speed) => {
    try {
      await fetch(`${API_BASE}/sim/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  setPolicy: async (policy) => {
    try {
      await fetch(`${API_BASE}/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  loadScenario: async (name) => {
    try {
      await fetch(`${API_BASE}/scenario/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  toggleRoad: async (edgeId) => {
    try {
      await fetch(`${API_BASE}/road/${edgeId}/toggle`, { method: 'POST' });
      soundFX.hazardWarning();
    } catch (e) {
      console.error(e);
    }
  },

  createSos: async (nodeId, x, y, type, people) => {
    try {
      const pType = type || get().selectedSosType;
      const pCount = people || get().selectedSosPeople;
      await fetch(`${API_BASE}/sos`, {
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
      soundFX.alertCritical();
    } catch (e) {
      console.error(e);
    }
  },

  autoDispatch: async () => {
    try {
      await fetch(`${API_BASE}/dispatch/auto`, { method: 'POST' });
      soundFX.ping(1200, 0.15);
    } catch (e) {
      console.error(e);
    }
  },

  runBenchmark: async (scenarioName) => {
    const sName = scenarioName || get().state?.scenario_name || 'Urban Flash Flood';
    set({ isBenchmarkLoading: true });
    try {
      const res = await fetch(`${API_BASE}/benchmark?scenario=${encodeURIComponent(sName)}&ticks=60`);
      const data: BenchmarkResult = await res.json();
      set({ benchmarkData: data, isBenchmarkLoading: false, isBenchmarkOpen: true });
    } catch (e) {
      console.error(e);
      set({ isBenchmarkLoading: false });
    }
  },
}));
