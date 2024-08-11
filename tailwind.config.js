/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fff3f1",
          100: "#ffe6e1",
          200: "#ffd0c7",
          300: "#ffb0a0",
          400: "#ff7053",
          500: "#f85b3b",
          600: "#e53f1d",
          700: "#c13114",
          800: "#a02c14",
          900: "#842a18",
          950: "#481207",
          DEFAULT: "#ff7053",
        },
        secondary: {
          50: "#faf6fe",
          100: "#f2eafd",
          200: "#e7d9fb",
          300: "#d5bbf7",
          400: "#ae7bed",
          500: "#a165e7",
          600: "#8a45d8",
          700: "#7633bd",
          800: "#642f9a",
          900: "#53277c",
          950: "#36105b",
          DEFAULT: "#ae7bed",
        },
        tertiary: {
          50: "#e4ebff",
          100: "#cfdaff",
          200: "#a8b9ff",
          300: "#748bff",
          400: "#3e48ff",
          500: "#1d13ff",
          600: "#1100ff",
          700: "#1100ff",
          800: "#0f00e4",
          900: "#1200b0",
          950: "#070036",
          DEFAULT: "#070036",
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        twilight: {
          primary: "#ff7053",
          "primary-content": "#ffffff",
          secondary: "#ae7bed",
          "secondary-content": "#ffffff",
          accent: "#1d13ff",
          "accent-content": "#ffffff",
        },
      },
    ],
  },
};
