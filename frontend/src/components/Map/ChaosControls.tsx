import React from 'react';
import {
  Waves, AlertTriangle, PlusCircle, Flame, Droplets,
  RotateCcw
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';

export const ChaosControls: React.FC = () => {
  const chaosMode = useReliefStore((s) => s.chaosMode);
  const setChaosMode = useReliefStore((s) => s.setChaosMode);
  const selectedSosType = useReliefStore((s) => s.selectedSosType);
  const setSelectedSosType = useReliefStore((s) => s.setSelectedSosType);
  const selectedSosPeople = useReliefStore((s) => s.selectedSosPeople);
  const setSelectedSosPeople = useReliefStore((s) => s.setSelectedSosPeople);
  const toggleRoad = useReliefStore((s) => s.toggleRoad);
  const createSos = useReliefStore((s) => s.createSos);
  const state = useReliefStore((s) => s.state);

  const handleFloodCentralBridge = () => {
    toggleRoad('edge_W12_E9');
  };

  const handleSpawnSurge = async () => {
    if (!state) return;
    const nodeKeys = Object.keys(state.nodes);
    const types: Array<'critical_medical' | 'stranded_family' | 'supply_request'> = [
      'critical_medical', 'stranded_family', 'supply_request', 'critical_medical', 'stranded_family'
    ];

    for (let i = 0; i < 5; i++) {
      const randNode = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      const node = state.nodes[randNode];
      const count = Math.floor(Math.random() * 5) + 2;
      await createSos(randNode, node.x, node.y, types[i], count);
    }
  };

  const handleClearAllFloods = async () => {
    if (!state) return;
    for (const edge of Object.values(state.edges)) {
      if (edge.status === 'flooded') {
        await toggleRoad(edge.id);
      }
    }
  };

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2 select-none">
      <div className="glass-panel p-2.5 rounded-xl border border-cyan-500/30 flex items-center space-x-2 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-300 font-mono text-[11px] font-bold">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>CHAOS CONTROLS</span>
        </div>

        {/* Toggle Flood Tool */}
        <button
          onClick={() => setChaosMode(chaosMode === 'flood' ? 'none' : 'flood')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
            chaosMode === 'flood'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-1 ring-blue-300'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
          title="Click road to toggle flood/clear (Hot: F)"
        >
          <Waves className="w-3.5 h-3.5 text-blue-400" />
          <span>{chaosMode === 'flood' ? 'Click Road to Flood' : 'Flood Road (F)'}</span>
        </button>

        {/* Toggle Drop SOS Tool */}
        <button
          onClick={() => setChaosMode(chaosMode === 'sos' ? 'none' : 'sos')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
            chaosMode === 'sos'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40 ring-1 ring-rose-300'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
          title="Click map to drop incident (Hot: S)"
        >
          <PlusCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{chaosMode === 'sos' ? 'Click Map to Drop SOS' : 'Drop SOS (S)'}</span>
        </button>

        {/* Quick Flood Central Bridge Button */}
        <button
          onClick={handleFloodCentralBridge}
          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition"
          title="Instantly toggle Central Metro Bridge flood status"
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Flood Central Bridge</span>
        </button>

        {/* Quick Surge: Spawn 5 SOS */}
        <button
          onClick={handleSpawnSurge}
          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition"
          title="Simulate sudden disaster surge (+5 incidents)"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Surge +5 SOS</span>
        </button>

        {/* Clear All Floods */}
        {state && Object.values(state.edges).some(e => e.status === 'flooded') && (
          <button
            onClick={handleClearAllFloods}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-emerald-400 transition"
            title="Clear all flooded roads"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* SOS Configuration bar when SOS mode active */}
      {chaosMode === 'sos' && (
        <div className="glass-panel p-2 rounded-xl border border-rose-500/40 flex items-center space-x-3 text-xs shadow-xl animate-in fade-in duration-200">
          <span className="text-[11px] font-mono text-rose-300 font-bold uppercase pl-1">
            New Incident Type:
          </span>
          <select
            value={selectedSosType}
            onChange={(e) => setSelectedSosType(e.target.value as unknown as typeof selectedSosType)}
            className="bg-slate-900 border border-rose-500/40 rounded px-2 py-1 text-slate-200 font-semibold text-xs focus:outline-none"
          >
            <option value="critical_medical">🔴 Critical Medical (Prio 100+)</option>
            <option value="stranded_family">🟡 Stranded Family (Prio 60+)</option>
            <option value="supply_request">🔵 Supply Request (Prio 30+)</option>
          </select>

          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono text-slate-400">Evacuees:</span>
            {[1, 2, 4, 6, 8].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setSelectedSosPeople(cnt)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  selectedSosPeople === cnt
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
