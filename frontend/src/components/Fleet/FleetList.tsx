import React from 'react';
import {
  Ambulance, Ship, Truck, Navigation, AlertOctagon,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';
import { Vehicle, VehicleState } from '../../lib/types';

export const FleetList: React.FC = () => {
  const state = useReliefStore((s) => s.state);
  const selectedEntity = useReliefStore((s) => s.selectedEntity);
  const setSelectedEntity = useReliefStore((s) => s.setSelectedEntity);

  if (!state) return null;

  const vehicles = Object.values(state.vehicles);

  const getStateBadge = (vstate: VehicleState) => {
    switch (vstate) {
      case 'idle':
        return { label: 'IDLE', color: 'bg-slate-800 text-slate-400 border-slate-700' };
      case 'en_route_to_sos':
        return { label: 'TO SCENE', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'loading':
        return { label: 'LOADING', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'en_route_to_shelter':
        return { label: 'TO SHELTER', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'unloading':
        return { label: 'UNLOADING', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'stuck':
        return { label: 'STUCK (TRAPPED)', color: 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse' };
      case 'returning':
        return { label: 'RETURNING', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
  };

  return (
    <div className="flex-1 flex flex-col glass-panel overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
            Fleet Telemetry
          </h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
          {vehicles.filter((v) => v.state !== 'idle').length}/{vehicles.length} ACTIVE
        </span>
      </div>

      {/* Fleet Cards */}
      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {vehicles.map((veh) => {
          const sBadge = getStateBadge(veh.state);
          const isSelected = selectedEntity?.type === 'vehicle' && selectedEntity.id === veh.id;
          const isAmbulance = veh.type === 'ambulance';
          const isBoat = veh.type === 'boat';

          return (
            <div
              key={veh.id}
              onClick={() => setSelectedEntity({ type: 'vehicle', id: veh.id })}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/70 border-cyan-400 shadow-lg shadow-cyan-950/40'
                  : veh.state === 'stuck'
                  ? 'bg-rose-950/40 border-rose-500/60'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    {isAmbulance ? (
                      <Ambulance className="w-3.5 h-3.5 text-rose-400" />
                    ) : isBoat ? (
                      <Ship className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {veh.name}
                    </span>
                    <div className="text-[9px] font-mono text-slate-400">
                      Speed: {veh.speed_factor}x • Cap: {veh.capacity}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${sBadge.color}`}
                >
                  {sBadge.label}
                </span>
              </div>

              {/* Status details: Target, ETA, Load */}
              {veh.state !== 'idle' ? (
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <span>Target:</span>
                    <strong className="text-cyan-300">{veh.target_node_id || 'Depot'}</strong>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-300 font-bold">
                      ETA {Math.max(1, Math.round(veh.eta_to_target))}m
                    </span>
                    {veh.current_load > 0 && (
                      <span className="text-emerald-400">
                        ({veh.current_load} aboard)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between">
                  <span>Stationed at {veh.home_depot_id.replace('depot_', '').toUpperCase()} Depot</span>
                  <span className="text-slate-400">{veh.trips_completed} trips</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
