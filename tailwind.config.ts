import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0f766e", dark: "#115e59" },
      },
    },
  },
  plugins: [],
} satisfies Config;
