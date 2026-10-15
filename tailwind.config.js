/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#152238', muted: '#697586', brand: '#2358E8', canvas: '#F5F7FB', line: '#E7EAF0' },
    boxShadow: { soft: '0 8px 30px rgba(20, 35, 65, .05)' }
  }},
  plugins: []
}