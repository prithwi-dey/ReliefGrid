/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          bg: "#070B14",
          surface: "rgba(13, 20, 36, 0.75)",
          card: "rgba(19, 29, 53, 0.85)",
          border: "rgba(56, 189, 248, 0.15)",
          glow: "rgba(6, 182, 212, 0.35)",
        },
        relief: {
          cyan: "#06b6d4",
          teal: "#14b8a6",
          blue: "#38bdf8",
          amber: "#f59e0b",
          red: "#ef4444",
          green: "#10b981",
          purple: "#8b5cf6",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'radar': 'radarWave 2s ease-out infinite',
      },
      keyframes: {
        radarWave: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
