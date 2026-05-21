import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0F1E3C",
          900: "#0A1429",
          800: "#0F1E3C",
          700: "#1B2E54",
          600: "#28406E",
        },
        gold: {
          DEFAULT: "#E8A020",
          600: "#D08F18",
          400: "#F0B54E",
        },
        ink: "#0F1E3C",
        mist: "#F5F5F5",
        line: "#E5E7EB",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        container: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
