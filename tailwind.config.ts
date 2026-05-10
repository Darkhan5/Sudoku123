import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        diamond: "var(--color-diamond)",
        gold: "var(--color-gold)",
        surface: "var(--color-surface)"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(26, 26, 46, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
