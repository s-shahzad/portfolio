import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090c12",
        panel: "#111827",
        line: "#2b374a",
        accent: "#dbe8ff",
      },
      boxShadow: {
        soft: "0 12px 28px rgba(0,0,0,0.24)",
        deep: "0 20px 50px rgba(0,0,0,0.34)",
      },
      keyframes: {
        heroZoom: {
          from: { transform: "scale(1.03)" },
          to: { transform: "scale(1.07)" },
        },
      },
      animation: {
        heroZoom: "heroZoom 16s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
} satisfies Config;
