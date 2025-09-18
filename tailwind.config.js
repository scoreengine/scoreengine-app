const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#316bff',
        secondary: '#213856',
        'neutral-dark': '#1d1d1a',
        'neutral-light': '#fafafa',
        'ai-gradient-from': '#316bff',
        'ai-gradient-to': '#ff9aff'
      },
      backdropBlur: {
        xs: '4px'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};