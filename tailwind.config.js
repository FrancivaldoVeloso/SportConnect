/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0a0a',
          surface: '#1c1c1c',
          primary: '#005BBB',
          electric: '#2563EB',
          'electric-hover': '#1d4ed8',
          'electric-light': '#3B82F6',
          neon: '#F59E0B',
          'neon-hover': '#d97706',
          'neon-orange': '#EA580C',
          border: '#262626',
          'border-focus': '#404040',
          text: '#F3F4F6',
          'text-muted': '#9CA3AF',
          success: '#2E7D32',
          warning: '#F57C00',
        }
      }
    },
  },
  presets: [require("nativewind/preset")],
  plugins: [],
}
