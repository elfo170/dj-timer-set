import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0B0E14",
          raised: "#121722",
          overlay: "#1A2130",
        },
        line: "#232B3B",
        ink: {
          DEFAULT: "#E8EDF5",
          muted: "#8B96A8",
          faint: "#5A6577",
        },
        wave: "#35D6E3",
        cueA: "#4ADE80",
        cueB: "#FB923C",
        alert: "#F87171",
      },
      fontFamily: {
        sans: ["'Segoe UI'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Cascadia Mono'", "'JetBrains Mono'", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
