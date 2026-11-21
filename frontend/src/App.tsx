import React from 'react';
import { TopBar } from './components/TopBar/TopBar';
import { CityMapSvg } from './components/Map/CityMapSvg';
import { SosTriageQueue } from './components/Triage/SosTriageQueue';
import { ShelterList } from './components/Shelters/ShelterList';
import { FleetList } from './components/Fleet/FleetList';
import { EventLogTicker } from './components/EventLog/EventLogTicker';
import { BenchmarkModal } from './components/Benchmark/BenchmarkModal';
import { SplitViewModal } from './components/Benchmark/SplitViewModal';
import { IntroSplash } from './components/Modals/IntroSplash';
import { ShortcutModal } from './components/Modals/ShortcutModal';
import { useWebSocket } from './hooks/useWebSocket';
import { useHotkeys } from './hooks/useHotkeys';

export const App: React.FC = () => {
  // Initialize WebSocket stream and Global Hotkeys
  useWebSocket();
  useHotkeys();

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070B14] text-slate-100 overflow-hidden font-sans">
      {/* 1. Municipal Command Top Bar */}
      <TopBar />

      {/* 2. Main Interactive Workspace Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Live SOS Triage Queue */}
        <SosTriageQueue />

        {/* Center: Full Interactive SVG City Map */}
        <div className="flex-1 h-full relative overflow-hidden">
          <CityMapSvg />
        </div>

        {/* Right: Shelter Capacities & Fleet Telemetry */}
        <div className="w-80 h-full flex flex-col border-l border-cyan-500/20 bg-[#070B14]/95 glass-panel select-none">
          <ShelterList />
          <FleetList />
        </div>
      </div>

      {/* 3. Bottom: Event Log Ticker & Real-Time KPI Strip */}
      <EventLogTicker />

      {/* 4. Modals & Overlays */}
      <BenchmarkModal />
      <SplitViewModal />
      <IntroSplash />
      <ShortcutModal />
    </div>
  );
};

export default App;
