import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Waves, ShieldCheck, ChevronRight } from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';

export const IntroSplash: React.FC = () => {
  const showIntroSplash = useReliefStore((s) => s.showIntroSplash);
  const dismissIntroSplash = useReliefStore((s) => s.dismissIntroSplash);

  useEffect(() => {
    // Automatically auto-dismiss after 3.2 seconds
    const timer = setTimeout(() => {
      dismissIntroSplash();
    }, 3200);
    return () => clearTimeout(timer);
  }, [dismissIntroSplash]);

  if (!showIntroSplash) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 bg-[#070B14]/95 backdrop-blur-xl flex items-center justify-center p-6 select-none"
      >
        <div className="max-w-xl w-full text-center space-y-6">
          {/* Radar Logo Animation */}
          <motion.div
            initial={{ scale: 0.6, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 14 }}
            className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50 ring-2 ring-cyan-400"
          >
            <ShieldAlert className="w-10 h-10 text-slate-950 stroke-[2.5]" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-wider text-slate-100 font-mono uppercase">
              Relief<span className="text-cyan-400">Grid</span>
            </h1>
            <p className="text-sm font-mono text-cyan-300 tracking-widest uppercase">
              COMMAND CENTER INITIALIZING...
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs font-mono space-y-2.5 text-slate-300">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
              Active Municipal Protocols
            </div>
            <div className="flex items-center space-x-2 text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Priority Triage Queue with Wait-Time Aging</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-300">
              <Waves className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Dynamic A* Road Rerouting on Flood Inundation</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Capacity-Constrained Advance Bed Reservations</span>
            </div>
          </div>

          <button
            onClick={dismissIntroSplash}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase flex items-center space-x-2 mx-auto shadow-lg shadow-cyan-500/30 transition transform hover:scale-105"
          >
            <span>ENTER COMMAND DASHBOARD</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
