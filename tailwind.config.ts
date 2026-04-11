import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        henry: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          900: "#1e3a5f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
