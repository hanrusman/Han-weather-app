/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        knmi: '#FF6B00',
        ecmwf: '#2563EB',
        icon: '#DC2626',
        gfs: '#7C3AED',
        meteofrance: '#06B6D4',
      },
    },
  },
  plugins: [],
};
