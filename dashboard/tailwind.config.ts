import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui"],
        mono: ["Geist Mono", "ui-monospace", "Menlo"],
      },
    },
  },
  plugins: [],
};

export default config;
