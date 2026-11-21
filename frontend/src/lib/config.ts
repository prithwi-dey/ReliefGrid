// Centralized API and WebSocket Endpoint Configuration
// Supports environment variables VITE_API_URL and VITE_WS_URL for production deployment

const envApiUrl = import.meta.env.VITE_API_URL;
const envWsUrl = import.meta.env.VITE_WS_URL;

export const API_BASE: string = (
  envApiUrl ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000')
).replace(/\/$/, '');

export const WS_BASE: string = (
  envWsUrl ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws`
    : 'ws://localhost:8000/ws')
);
