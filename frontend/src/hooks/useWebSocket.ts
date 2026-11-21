import { useEffect, useRef } from 'react';
import { useReliefStore } from '../store/useReliefStore';
import { SimulationState } from '../lib/types';
import { WS_BASE, API_BASE } from '../lib/config';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const setSimulationState = useReliefStore((s) => s.setSimulationState);
  const setWsConnected = useReliefStore((s) => s.setWsConnected);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          // Stop fallback polling if active
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
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
          console.warn('WebSocket error:', err);
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          wsRef.current = null;

          // Start fallback polling if not already started
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = window.setInterval(async () => {
              try {
                const res = await fetch(`${API_BASE}/state`);
                if (res.ok) {
                  const data: SimulationState = await res.json();
                  setSimulationState(data);
                }
              } catch {
                // Backend temporarily unreachable
              }
            }, 1000);
          }

          // Try reconnecting in 2s
          reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        };
      } catch (err) {
        console.error('WS Connection failed:', err);
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
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
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [setSimulationState, setWsConnected]);
}
