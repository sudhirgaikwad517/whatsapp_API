/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf5',
          100: '#d6fbc6',
          500: '#25D366', // Official WhatsApp Emerald Green
          600: '#128C7E', // WhatsApp Dark Teal
          700: '#075E54', // WhatsApp Deep Green
          900: '#0b141a', // WhatsApp Dark Theme Background
        },
      },
    },
  },
  plugins: [],
};
