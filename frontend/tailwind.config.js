/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0a0f1e",
          panel: "#0f172a",
          border: "#1e293b",
          cyan: "#06b6d4",
          cyanGlow: "#22d3ee",
          blue: "#0ea5e9",
          red: "#ef4444",
          redGlow: "#f87171",
          green: "#22c55e",
          yellow: "#eab308",
          orange: "#f97316",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        cyan: "0 0 20px rgba(6,182,212,0.3)",
        "cyan-lg": "0 0 40px rgba(6,182,212,0.4)",
        red: "0 0 20px rgba(239,68,68,0.3)",
        "red-lg": "0 0 40px rgba(239,68,68,0.4)",
        green: "0 0 20px rgba(34,197,94,0.3)",
      },
      animation: {
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
        fadeIn: "fadeIn 0.5s ease-out forwards",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6,182,212,0.3)" },
          "50%": { boxShadow: "0 0 35px rgba(6,182,212,0.5)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
