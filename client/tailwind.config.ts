import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BL2020 Brand Colors
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#E48F00',  // BL2020 Primary Orange
          600: '#E48F00',  // BL2020 Primary Orange
          700: '#C77700',  // Darker shade for hover
          800: '#9A5E00',
          900: '#7C4D00',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
