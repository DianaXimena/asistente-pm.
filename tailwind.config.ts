import type { Config } from "tailwindcss";

// Paleta corporativa Kruger (naranja, gris y oscuro).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kruger: {
          orange: "#F05A22",
          "orange-dark": "#C8461A",
          "orange-soft": "#FDEDE6",
          gray: "#9AA0A6",
          "gray-soft": "#F3F4F5",
          dark: "#333333",
        },
        semaforo: {
          verde: "#1E8E3E",
          ambar: "#E8A317",
          rojo: "#D93025",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(51,51,51,0.06), 0 8px 24px rgba(51,51,51,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
