/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("../../tailwind.preset.cjs")],
  content: ["./index.html", "./today/index.html", "./src/**/*.{ts,tsx}"],
  plugins: [],
};
