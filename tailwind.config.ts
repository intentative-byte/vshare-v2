import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mist: "#eef5ff",
        pine: "#0f766e",
        violet: "#6d28d9",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(8, 17, 31, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
