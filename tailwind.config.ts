import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ===== v2 Brand =====
        // Navy: primary ground (was #0F1E3C, now the deeper v2 #0D1B2A)
        navy: {
          DEFAULT: "#0D1B2A",
          900: "#07101B",      // navy-deep (body background)
          800: "#0D1B2A",      // navy
          700: "#142336",      // navy-2
          600: "#1B2E47",      // navy-3
        },
        // Gold: signal, reserved for live data / accents
        gold: {
          DEFAULT: "#C9973A",
          600: "#B5852E",
          400: "#D9AC55",      // gold-soft
        },
        cream: "#F5F0E8",
        ink: "#0D1B2A",
        mist: "#F5F0E8",       // light surface alias (legacy callsites)
        line: "rgba(255, 255, 255, 0.12)",
        "line-strong": "rgba(255, 255, 255, 0.20)",
        glass: "rgba(255, 255, 255, 0.06)",
        "glass-strong": "rgba(255, 255, 255, 0.10)",
        "glass-border": "rgba(255, 255, 255, 0.14)",
        // Data deltas
        positive: "#4AC09A",
        negative: "#E07A5F",
        // Neutral text greys for v2 dark UI
        "gray-2": "#9CA3AF",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.22em",
        widest3: "0.24em",
      },
      boxShadow: {
        glass:
          "0 1px 0 rgba(255,255,255,0.12) inset, 0 24px 60px -20px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.04)",
        gold: "0 10px 30px -10px rgba(201,151,58,0.6)",
      },
      backdropBlur: {
        glass: "24px",
      },
      maxWidth: {
        container: "1320px",
      },
    },
  },
  plugins: [],
};

export default config;
