import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#e8f8ff',
          card: '#ffffff',
          hover: '#f5fbff',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fadeIn': 'fadeIn 0.35s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 7s ease-in-out 1.5s infinite',
        'glow-soft': 'glowSoft 14s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.75' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 36px rgba(34, 211, 238, 0.22)',
        'glow-cyan-sm': '0 0 18px rgba(34, 211, 238, 0.12)',
        'glow-orange': '0 0 28px rgba(249, 115, 22, 0.2)',
        'glow-gold': '0 0 30px rgba(251, 191, 36, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
