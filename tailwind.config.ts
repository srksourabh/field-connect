import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#137fec",
          dark: "#0e62b6",
          light: "#eff8ff",
        },
        background: {
          light: "#f6f7f8",
          dark: "#101922",
        },
        surface: {
          light: "#ffffff",
          dark: "#1c2a36",
        },
        uds: {
          navy: "#0F172A",
          blue: "#2563EB",
          light: "#F8FAFC",
          success: "#10B981",
        },
        gold: {
          DEFAULT: "#d4af37",
          light: "#e8d5b7",
          dark: "#c49b2d",
        },
        forest: {
          DEFAULT: "#1b4d3e",
          light: "#f0f5f2",
          dark: "#0f2e24",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        satoshi: ["Satoshi", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      animation: {
        "pulse-ring": "pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "pulse-dot": "pulse-dot 2.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
        "bounce-slow": "bounce-slow 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.33)", opacity: "1" },
          "80%, 100%": { transform: "scale(1)", opacity: "0" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1)" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
