import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useReliefStore, ToastNotification } from '../../store/useReliefStore';

export const ToastContainer: React.FC = () => {
  const toasts = useReliefStore((s) => s.toasts);
  const removeToast = useReliefStore((s) => s.removeToast);

  const getToastIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />;
    }
  };

  const getToastStyle = (type: ToastNotification['type']) => {
    switch (type) {
      case 'error':
        return 'bg-rose-950/95 border-rose-500/60 text-rose-100 shadow-rose-950/50';
      case 'warning':
        return 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-amber-950/50';
      case 'success':
        return 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100 shadow-emerald-950/50';
      default:
        return 'bg-cyan-950/95 border-cyan-500/60 text-cyan-100 shadow-cyan-950/50';
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 24, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto p-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-start space-x-2.5 font-sans ${getToastStyle(
              toast.type
            )}`}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-bold font-mono tracking-wide uppercase mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-xs leading-relaxed opacity-90 break-words">
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
              title="Dismiss Toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
