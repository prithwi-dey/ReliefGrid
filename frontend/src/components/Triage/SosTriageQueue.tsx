import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, Users, Clock, Zap, Ambulance, Ship,
  Truck, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';
import { Incident, IncidentType } from '../../lib/types';

export const SosTriageQueue: React.FC = () => {
  const state = useReliefStore((s) => s.state);
  const selectedEntity = useReliefStore((s) => s.selectedEntity);
  const setSelectedEntity = useReliefStore((s) => s.setSelectedEntity);
  const [filterType, setFilterType] = useState<string>('all');

  if (!state) return null;

  const incidents = Object.values(state.incidents);
  // Sort incidents by priority score descending if optimized, or arrival order if FIFO
  const isOptimized = state.policy === 'optimized';
  const sortedIncidents = [...incidents].sort((a, b) => {
    if (a.status === 'resolved' && b.status !== 'resolved') return 1;
    if (b.status === 'resolved' && a.status !== 'resolved') return -1;
    if (isOptimized) {
      return b.priority_score - a.priority_score;
    }
    return a.created_at_tick - b.created_at_tick;
  });

  const filteredIncidents = sortedIncidents.filter((inc) => {
    if (filterType === 'all') return true;
    if (filterType === 'pending') return inc.status === 'pending';
    if (filterType === 'active') return inc.status === 'assigned' || inc.status === 'in_progress';
    if (filterType === 'resolved') return inc.status === 'resolved';
    return inc.type === filterType;
  });

  const getSeverityBadge = (type: IncidentType) => {
    switch (type) {
      case 'critical_medical':
        return {
          label: 'CRITICAL',
          bg: 'bg-rose-500/20',
          border: 'border-rose-500/50',
          text: 'text-rose-400',
          dot: 'bg-rose-400',
          base: 100,
        };
      case 'stranded_family':
        return {
          label: 'STRANDED',
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          base: 60,
        };
      case 'supply_request':
        return {
          label: 'SUPPLY',
          bg: 'bg-cyan-500/20',
          border: 'border-cyan-500/50',
          text: 'text-cyan-400',
          dot: 'bg-cyan-400',
          base: 30,
        };
    }
  };

  return (
    <div className="w-80 h-full flex flex-col bg-[#070B14]/95 border-r border-cyan-500/20 glass-panel select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
            SOS Triage Queue
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
          {incidents.filter((i) => i.status !== 'resolved').length} ACTIVE
        </span>
      </div>

      {/* Triage Formula Banner */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span className="text-cyan-400 font-bold">Formula:</span>
        <span className="text-slate-300">Severity + 4N + 2.5(Wait)</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center px-2 py-1.5 border-b border-slate-800 text-[10px] font-mono space-x-1 overflow-x-auto">
        {['all', 'pending', 'active', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-2 py-1 rounded capitalize transition ${
              filterType === f
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence initial={false}>
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No incidents matching filter.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const badge = getSeverityBadge(inc.type);
              const isSelected = selectedEntity?.type === 'sos' && selectedEntity.id === inc.id;
              const isResolved = inc.status === 'resolved';

              return (
                <motion.div
                  key={inc.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setSelectedEntity({ type: 'sos', id: inc.id })}
                  className={`p-2.5 rounded-lg border transition cursor-pointer relative group ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-400 shadow-lg shadow-cyan-900/30'
                      : isResolved
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Row: Incident ID + Severity Badge + Priority Score */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {inc.id}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold flex items-center space-x-1 ${badge.bg} ${badge.border} ${badge.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Priority Score Tag */}
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-400 font-mono">Prio</span>
                      <span
                        className={`text-xs font-mono font-extrabold num-telemetry px-1.5 py-0.5 rounded ${
                          isResolved
                            ? 'bg-slate-800 text-slate-500'
                            : inc.priority_score >= 100
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                            : 'bg-slate-800 text-cyan-300'
                        }`}
                      >
                        {Math.round(inc.priority_score)}
                      </span>
                    </div>
                  </div>

                  {/* Details Row: Location + Victims + Wait Timer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono mb-1.5">
                    <span className="text-slate-400">
                      Junction: <strong className="text-slate-200">{inc.location_node_id}</strong>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-0.5 text-slate-300">
                        <Users className="w-3 h-3 text-cyan-400" />
                        <span>{inc.people_count}</span>
                      </span>
                      <span className="flex items-center space-x-0.5 text-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>{inc.wait_time_ticks}m wait</span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Assignment Status */}
                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">
                      {isResolved ? (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>RESOLVED ({inc.resolved_time_ticks}m)</span>
                        </span>
                      ) : inc.assigned_vehicle_id ? (
                        <span className="text-cyan-400 font-semibold flex items-center space-x-1">
                          <Zap className="w-3 h-3" />
                          <span>Unit {inc.assigned_vehicle_id} Dispatched</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold animate-pulse">
                          Awaiting Dispatch Unit...
                        </span>
                      )}
                    </span>

                    {inc.assigned_shelter_id && (
                      <span className="text-purple-300">
                        Bed Reserved @ {inc.assigned_shelter_id.replace('shelter_', '')}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
