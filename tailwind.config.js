/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,html}', './index.html', './popup.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8fb4ff',
          400: '#5c8bff',
          500: '#3563ff',
          600: '#1f42f0',
          700: '#1a33c4',
          800: '#1c2e9c',
          900: '#1c2b7a',
        },
        surface: {
          light: '#ffffff',
          dark: '#111318',
        },
      },
      boxShadow: {
        panel: '0 8px 30px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-in': { '0%': { transform: 'translateX(16px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
