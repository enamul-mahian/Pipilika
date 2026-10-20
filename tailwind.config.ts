import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fdf7f1",
        blush: "#fbeeea",
        brand: { DEFAULT: "#b3161f", deep: "#6e0d12", light: "#d8343d" },
        gold: "#e0b04f",
        ink: "#2f1a15",
        muted: "#7d665e",
        line: "#f0e0d6",
        cocoa: "#24120e",
      },
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        script: ['"Dancing Script"', "cursive"],
        body: ['"Hind Siliguri"', '"Segoe UI"', "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 2px 12px rgba(110,13,18,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
