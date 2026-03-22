/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          active: '#5C3AF6', // A deeper, richer violet-blue for active sidebar link
          button: '#563ef1', // Button purple/blue color
          hover: '#4e33e9',
        },
        sidebar: {
          bg: '#16192b', // Very dark blue/slate from the image
          text: '#a0a2b8',
          hover: '#20243d',
        },
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'header': '0 2px 4px rgba(0, 0, 0, 0.02)',
      },
      borderRadius: {
        'button': '0.375rem',
        'input': '0.5rem',
        'card': '0.75rem',
        'badge': '1rem',
      },
      spacing: {
        'sidebar': '260px',
        'header': '70px',
      }
    },
  },
  plugins: [],
}
