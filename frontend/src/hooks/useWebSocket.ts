import { useEffect, useRef } from 'react';
import { useReliefStore } from '../store/useReliefStore';
import { SimulationState } from '../lib/types';
import { WS_BASE, API_BASE } from '../lib/config';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const healthPollIntervalRef = useRef<number | null>(null);

  // Exponential backoff tracker (1s up to 10s)
  const backoffDelayRef = useRef<number>(1000);
  const attemptCounterRef = useRef<number>(0);

  const setSimulationState = useReliefStore((s) => s.setSimulationState);
  const setWsConnected = useReliefStore((s) => s.setWsConnected);
  const setReconnectStatus = useReliefStore((s) => s.setReconnectStatus);
  const reloadStateAndScenario = useReliefStore((s) => s.reloadStateAndScenario);
  const addToast = useReliefStore((s) => s.addToast);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      attemptCounterRef.current += 1;
      setReconnectStatus(attemptCounterRef.current, Math.round(backoffDelayRef.current / 1000));

      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = async () => {
          if (!isMounted) return;
          console.log('[WS] Connected to ReliefGrid Telemetry Engine.');
          setWsConnected(true);

          // Reset exponential backoff on successful connection
          const wasDisconnected = attemptCounterRef.current > 1;
          backoffDelayRef.current = 1000;
          attemptCounterRef.current = 0;
          setReconnectStatus(0, 1);

          // Stop polling if active
          if (healthPollIntervalRef.current) {
            clearInterval(healthPollIntervalRef.current);
            healthPollIntervalRef.current = null;
          }

          // Reload current scenario and authoritative state after reconnecting
          await reloadStateAndScenario();

          if (wasDisconnected) {
            addToast({
              type: 'success',
              title: 'Backend Reconnected',
              message: 'Command link re-established. Current scenario and state reloaded.',
            });
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data: SimulationState = JSON.parse(event.data);
            setSimulationState(data);
          } catch (e) {
            console.error('Failed to parse WS data:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WS] Telemetry link error:', err);
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          wsRef.current = null;

          // Compute next exponential backoff: 1s -> 1.5s -> 2.25s ... capped at 10s
          const currentDelay = backoffDelayRef.current;
          const nextDelay = Math.min(10000, Math.round(currentDelay * 1.5));
          backoffDelayRef.current = nextDelay;

          setReconnectStatus(attemptCounterRef.current, Math.round(nextDelay / 1000));

          // Background HTTP Health Probe while WS is disconnected
          if (!healthPollIntervalRef.current) {
            healthPollIntervalRef.current = window.setInterval(async () => {
              try {
                const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                  // Backend is awake! Trigger immediate reconnect
                  if (healthPollIntervalRef.current) {
                    clearInterval(healthPollIntervalRef.current);
                    healthPollIntervalRef.current = null;
                  }
                  if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                  }
                  backoffDelayRef.current = 1000;
                  connect();
                }
              } catch {
                // Still waiting for backend to wake up
              }
            }, 2500);
          }

          // Schedule next reconnection attempt with exponential backoff
          reconnectTimeoutRef.current = window.setTimeout(connect, currentDelay);
        };
      } catch (err) {
        console.error('[WS] Connection attempt failed:', err);
        const currentDelay = backoffDelayRef.current;
        backoffDelayRef.current = Math.min(10000, Math.round(currentDelay * 1.5));
        reconnectTimeoutRef.current = window.setTimeout(connect, currentDelay);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (healthPollIntervalRef.current) {
        clearInterval(healthPollIntervalRef.current);
      }
    };
  }, [setSimulationState, setWsConnected, setReconnectStatus, reloadStateAndScenario, addToast]);
}
