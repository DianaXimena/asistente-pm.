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
      keyframes: {
        enter: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        expand: { "0%": { opacity: "0", transform: "scaleY(0.96)" }, "100%": { opacity: "1", transform: "scaleY(1)" } },
        fade: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      animation: {
        enter: "enter 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        expand: "expand 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        fade: "fade 160ms ease-out both",
      },
      boxShadow: {
        card: "0 1px 2px rgba(51,51,51,0.06), 0 8px 24px rgba(51,51,51,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
