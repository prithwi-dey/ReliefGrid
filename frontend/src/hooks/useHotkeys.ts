import { useEffect } from 'react';
import { useReliefStore } from '../store/useReliefStore';

export function useHotkeys() {
  const isRunning = useReliefStore((s) => s.state?.is_running ?? false);
  const startSim = useReliefStore((s) => s.startSim);
  const pauseSim = useReliefStore((s) => s.pauseSim);
  const chaosMode = useReliefStore((s) => s.chaosMode);
  const setChaosMode = useReliefStore((s) => s.setChaosMode);
  const isBenchmarkOpen = useReliefStore((s) => s.isBenchmarkOpen);
  const setBenchmarkOpen = useReliefStore((s) => s.setBenchmarkOpen);
  const runBenchmark = useReliefStore((s) => s.runBenchmark);
  const isShortcutHelpOpen = useReliefStore((s) => s.isShortcutHelpOpen);
  const setShortcutHelpOpen = useReliefStore((s) => s.setShortcutHelpOpen);
  const isSplitViewOpen = useReliefStore((s) => s.isSplitViewOpen);
  const setSplitViewOpen = useReliefStore((s) => s.setSplitViewOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if inside input or select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) {
          pauseSim();
        } else {
          startSim();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setChaosMode(chaosMode === 'flood' ? 'none' : 'flood');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setChaosMode(chaosMode === 'sos' ? 'none' : 'sos');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (!isBenchmarkOpen) {
          runBenchmark();
        } else {
          setBenchmarkOpen(false);
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutHelpOpen(!isShortcutHelpOpen);
      } else if (e.key === 'Escape') {
        setChaosMode('none');
        setBenchmarkOpen(false);
        setSplitViewOpen(false);
        setShortcutHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isRunning, startSim, pauseSim, chaosMode, setChaosMode,
    isBenchmarkOpen, setBenchmarkOpen, runBenchmark,
    isShortcutHelpOpen, setShortcutHelpOpen,
    isSplitViewOpen, setSplitViewOpen
  ]);
}
