import type { Config } from "tailwindcss";

/**
 * Ponte design system, from the Rebranding 21st July handoff bundle.
 *
 * Dark obsidian canvas, lime as the only "go" colour, violet for trust and AI,
 * cyan for verified, gold for the institutional tier, coral for alerts and
 * nothing else.
 *
 * On the legacy block at the bottom: `cream`, `gray-2`, `navy`, `positive` and
 * `negative` are the v2 navy/gold names, still referenced by roughly 500 class
 * usages across the routes that have not been reskinned yet. They are kept as
 * aliases and re-pointed at their new-system equivalents, so an unreskinned
 * page moves onto the obsidian palette instead of rendering colourless while it
 * waits its turn. They are deprecated: when the last route is converted in U2,
 * this block goes.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ===== Ground =====
        obsidian: {
          DEFAULT: "#0A0C11", // app canvas
          deep: "#06070A", // brand-book ground
        },
        surface: "#1B2029", // raised panels

        // ===== Text =====
        ink: "#EEF1F5", // primary text
        muted: "#8A93A2", // secondary text
        slate: "#C2CCD8", // L1 tier, neutral chip text

        // ===== Signal =====
        lime: {
          DEFAULT: "#CBFB5E", // primary action, go, live, principals
          tint: "rgba(203,251,94,.13)",
        },
        violet: {
          DEFAULT: "#8B6BFF", // trust, AI, premium, intermediaries
          lift: "#A98BFF", // closes the premium gradient
          ink: "#B6A2FF", // violet at text weight
          tint: "rgba(139,107,255,.16)",
        },
        cyan: {
          DEFAULT: "#3FE0C5", // verified, service providers
          tint: "rgba(63,224,197,.14)",
        },
        gold: {
          DEFAULT: "#F5C542", // L4 institutional, institutions
          tint: "rgba(245,197,66,.15)",
        },
        coral: {
          DEFAULT: "#FF6B5C", // alerts and errors ONLY
          tint: "rgba(255,107,92,.14)",
        },

        // ===== Glass and hairlines =====
        glass: "rgba(255,255,255,.05)",
        hairline: {
          soft: "rgba(255,255,255,.08)",
          DEFAULT: "rgba(255,255,255,.10)",
          strong: "rgba(255,255,255,.12)",
        },

        // ===== Legacy v2 aliases. Deprecated, removed at the end of U2. =====
        cream: "#EEF1F5", // was #F5F0E8, now ink
        "gray-2": "#8A93A2", // was #9CA3AF, now muted
        navy: {
          DEFAULT: "#0A0C11",
          900: "#06070A",
          800: "#0A0C11",
          700: "#1B2029",
          600: "#232936",
        },
        positive: "#3FE0C5", // now cyan
        negative: "#FF6B5C", // now coral
      },

      fontFamily: {
        // Inter carries the interface. Space Grotesk is display only.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
        // Legacy aliases: `font-serif` was Playfair, `font-mono` was JetBrains.
        // Neither font ships any more, so both resolve into the new pairing.
        serif: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      // Bundle sizes: hero 30-34, screen title 22-26, card title 14-17,
      // body 12-13, meta 10-11, uppercase labels 10 at .6px tracking.
      letterSpacing: {
        label: "0.06em", // 10px uppercase labels
        tightest: "-0.02em",
        hero: "-0.045em", // -2px at 44px
      },

      borderRadius: {
        phone: "37px",
        glass: "20px", // cards 16-22
        card: "18px",
        field: "12px", // inputs 11-13
        btn: "13px", // buttons 13-15
        tag: "7px", // square tags 6-8
      },

      boxShadow: {
        // Elevation is border plus background shift plus a soft coloured glow.
        // No hard drop shadows anywhere in this system.
        lime: "0 10px 26px -10px rgba(203,251,94,.7)",
        violet: "0 10px 26px -10px rgba(139,107,255,.7)",
        cyan: "0 10px 26px -10px rgba(63,224,197,.6)",
        glass: "0 1px 0 rgba(255,255,255,.06) inset, 0 24px 60px -24px rgba(0,0,0,.6)",
      },

      backgroundImage: {
        // Lime through violet to cyan. The logo arc, the trust dial, AI blocks.
        bridge: "linear-gradient(90deg,#CBFB5E,#8B6BFF,#3FE0C5)",
        "violet-cta": "linear-gradient(120deg,#8B6BFF,#A98BFF)",
      },

      // 8px grid. 18px is the screen body padding the bundle uses throughout.
      spacing: {
        screen: "18px",
      },

      maxWidth: {
        container: "1320px",
      },

      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(203,251,94,.55)" },
          "70%": { boxShadow: "0 0 0 9px rgba(203,251,94,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(203,251,94,0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        rise: "rise 600ms cubic-bezier(.2,.7,.3,1) both",
        "pulse-ring": "pulse-ring 1800ms ease-out infinite",
        shimmer: "shimmer 1400ms ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
