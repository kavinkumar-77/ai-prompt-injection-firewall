/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#0A0C10",
        sidebar: "#0E1015",
        surface: {
          DEFAULT: "#13151B",
          hover: "#181B23",
          active: "#1D202A",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.06)",
          DEFAULT: "rgba(255, 255, 255, 0.09)",
          strong: "rgba(255, 255, 255, 0.16)",
        },
      },
    },
  },
  plugins: [],
};
