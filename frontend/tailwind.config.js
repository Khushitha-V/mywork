/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pastel-blue': "#E8F4FD",
        'pastel-purple': "#F3E8FF",
        'pastel-pink': "#FDF2F8",
        'pastel-green': "#F0FDF4",
        'soft-blue': "#BFDBFE",
        'soft-purple': "#DDD6FE",
        'soft-pink': "#FBCFE8",
        'accent-blue': "#60A5FA",
        'accent-purple': "#A78BFA",
        'text-primary': "#374151",
        'text-secondary': "#6B7280"
      }
    }
  },
  plugins: [],
}