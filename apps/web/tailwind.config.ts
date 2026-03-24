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
        'fade-up-slow': 'fadeUpSlow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fadeIn': 'fadeIn 0.35s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 7s ease-in-out 1.5s infinite',
        'glow-soft': 'glowSoft 14s ease-in-out infinite',
        'share-shimmer': 'shareShimmer 2.5s ease-in-out infinite',
        /** Célébration quête / badges / niveau */
        'celebrate-confetti': 'celebrateConfetti 2.1s ease-out forwards',
        'badge-reveal': 'badgeReveal 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'xp-number-pop': 'xpNumberPop 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        'level-banner-in': 'levelBannerIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) both',
        'celebrate-shimmer': 'celebrateShimmer 2s ease-in-out infinite',
        /** Boutique — achats QC, modale recharge */
        'shop-balance-pop': 'shopBalancePop 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'shop-gold-flash': 'shopGoldFlash 0.85s ease-out forwards',
        'shop-modal-in': 'shopModalIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'shop-card-bump': 'shopCardBump 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'shop-btn-pulse': 'shopBtnPulse 0.45s ease-out both',
        'shop-sparkle': 'shopSparkle 1.2s ease-out forwards',
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
        fadeUpSlow: {
          '0%': { opacity: '0', transform: 'translateY(26px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shareShimmer: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.65' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.75' },
        },
        celebrateConfetti: {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: '1' },
          '100%': {
            transform:
              'translate3d(calc(var(--dx, 0px)), calc(var(--dy, 220px)), 0) rotate(calc(var(--spin, 540deg)))',
            opacity: '0',
          },
        },
        badgeReveal: {
          '0%': { opacity: '0', transform: 'scale(0.65) translateY(12px)' },
          '70%': { opacity: '1', transform: 'scale(1.04) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        xpNumberPop: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '55%': { opacity: '1', transform: 'scale(1.12)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        levelBannerIn: {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        celebrateShimmer: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
        shopBalancePop: {
          '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '35%': { transform: 'scale(1.08)', filter: 'brightness(1.12)' },
          '65%': { transform: 'scale(1.04)', filter: 'brightness(1.06)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        shopGoldFlash: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '0' },
        },
        shopModalIn: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shopCardBump: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.5)' },
          '40%': { transform: 'scale(1.04)', boxShadow: '0 0 0 8px rgba(251, 191, 36, 0.25)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)' },
        },
        shopBtnPulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        shopSparkle: {
          '0%': { opacity: '0', transform: 'scale(0.4) rotate(-8deg)' },
          '30%': { opacity: '1', transform: 'scale(1.05) rotate(4deg)' },
          '100%': { opacity: '0', transform: 'scale(1.2) rotate(12deg)' },
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
