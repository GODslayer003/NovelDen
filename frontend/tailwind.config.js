/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          50:  '#fdf8f0',
          100: '#f5e6d3',
          200: '#e8c9a0',
          300: '#d4a574',
          400: '#c08040',
          500: '#8B5E3C',
          600: '#6F4E37',
          700: '#5c3d2e',
          800: '#3d2314',
          900: '#1a0f00',
        },
        cream: '#F5E6D3',
        espresso: '#2C1810',
      },
      fontFamily: {
        serif:  ['"Playfair Display"', 'Georgia', 'serif'],
        sans:   ['"Inter"', 'system-ui', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
      },
      animation: {
        'float':      'float 6s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'fade-up':    'fadeUp 0.8s ease forwards',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float:   { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-20px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeUp:  { from: { opacity: 0, transform: 'translateY(30px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow:    { from: { textShadow: '0 0 10px #d4a574' }, to: { textShadow: '0 0 30px #d4a574, 0 0 60px #c08040' } },
      },
    },
  },
  plugins: [],
}