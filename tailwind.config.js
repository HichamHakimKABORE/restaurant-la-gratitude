/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        script: ["Kaushan Script", "Georgia", "serif"]
      },
      colors: {
        bordeaux: {
          DEFAULT: "#801313",
          dark: "#5a0b0b",
          light: "#991b1b"
        },
        creme: {
          DEFAULT: "#fffcf7",
          warm: "#fdf5e8",
          border: "#e6d5c3"
        }
      }
    }
  },
  plugins: []
};
