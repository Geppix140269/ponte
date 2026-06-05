import type { Config } from "tailwindcss";

// ===== Ponte Brand v4 — "Heritage trading press × terminal data" =====
// Light heritage theme. Tokens mirror app/ponte-landing.css. Legacy v2 color
// names (navy, cream, gray-2, positive, negative, glass-border…) are remapped
// onto v4 values so existing utility classes flip to the light theme centrally.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- v4 surfaces & ink ----
        surface: "#FCFBF7",
        raised: "#FFFFFF",
        sunken: "#F2EFE6",
        ink: {
          DEFAULT: "#0F0F0E",
          2: "#3A3733",
        },
        "ink-2": "#3A3733",
        mute: "#9A958A",
        rule: { DEFAULT: "#E5DFD2", 2: "#D5CEBC" },
        "rule-2": "#D5CEBC",

        // ---- accent (gold) ----
        gold: { DEFAULT: "#C9973A", 600: "#B5852E", 400: "#D9AC55" },

        // ---- semantic ----
        pos: { DEFAULT: "#0F6E3D", mid: "#5C9C5A" },
        neg: { DEFAULT: "#C84A2C", mid: "#E07A5F" },
        warn: "#C9973A",
        positive: "#0F6E3D",
        negative: "#C84A2C",

        // ---- legacy v2 names remapped to v4 (so old classes flip) ----
        navy: {
          DEFAULT: "#FCFBF7", // was dark ground → now light surface
          900: "#F2EFE6",
          800: "#FCFBF7",
          700: "#FFFFFF",
          600: "#F2EFE6",
        },
        cream: "#0F0F0E", // legacy "light text on dark" → now ink (dark text)
        mist: "#FCFBF7",
        "gray-2": "#5C5852",
        line: "#E5DFD2",
        "line-strong": "#D5CEBC",
        glass: "rgba(15,15,14,0.04)",
        "glass-strong": "rgba(15,15,14,0.06)",
        "glass-border": "#E5DFD2",
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
        glass: "0 1px 0 var(--rule), 0 20px 40px -28px rgba(15,15,14,0.18)",
        gold: "0 14px 30px -16px rgba(201,151,58,0.4)",
        card: "0 1px 0 var(--rule), 0 20px 40px -28px rgba(15,15,14,0.18)",
      },
      backdropBlur: {
        glass: "16px",
      },
      maxWidth: {
        container: "1320px",
      },
    },
  },
  plugins: [],
};

export default config;
