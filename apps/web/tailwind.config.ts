import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#ebe8e0',
          card: '#faf8f4',
          hover: '#f2efe8',
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
        /** Modales / sheets / tiroir : opacité seule (évite voile mobile translateY + backdrop-filter). */
        'modal-fade': 'modalFade 0.38s cubic-bezier(0.22, 1, 0.36, 1) both',
        'modal-fade-slow': 'modalFade 0.58s cubic-bezier(0.22, 1, 0.36, 1) both',
        'quest-card-enter': 'questCardEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fadeIn': 'fadeIn 0.35s ease-out',
        /** Étapes onboarding : un peu plus de relief que fadeIn */
        'onboarding-step': 'onboardingStep 0.48s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 7s ease-in-out 1.5s infinite',
        'glow-soft': 'glowSoft 14s ease-in-out infinite',
        'share-shimmer': 'shareShimmer 2.5s ease-in-out infinite',
        /** Célébration quête / badges / niveau */
        'celebrate-confetti': 'celebrateConfetti 2.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
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
        /** Feedback « jeu » — acceptation quête, impact boutique */
        'quest-accept-flash': 'questAcceptFlash 0.78s ease-out forwards',
        'quest-victory-screen-flash': 'questVictoryScreenFlash 0.55s ease-out forwards',
        'quest-ring-pulse': 'questRingPulse 1.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'quest-modal-pop': 'questModalPop 0.58s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'quest-modal-shake': 'questModalShake 0.48s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'shop-celebration-overlay': 'shopCelebrationOverlay 2.15s ease-out forwards',
        'shop-screen-shake': 'shopScreenShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'shop-coin-burst': 'shopCoinBurst 1.9s ease-out forwards',
        'shop-sparkle-orbit': 'shopSparkleOrbit 2s ease-out forwards',
        /** Bandeau statut « Quête du jour » + loader accueil */
        'quest-day-strip-in': 'questDayStripIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        'quest-day-strip-shine': 'questDayStripShine 3.8s linear infinite',
        'quest-loader-in': 'questLoaderIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) both',
        'quest-loader-halo': 'questLoaderHalo 10s linear infinite',
        'quest-loader-bar': 'questLoaderBar 1.25s ease-in-out infinite alternate',
        'quest-loader-bounce': 'questLoaderBounce 1.05s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        onboardingStep: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
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
        questCardEnter: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
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
              'translate3d(calc(var(--dx, 0px)), calc(var(--dy, 260px)), 0) rotate(calc(var(--spin, 720deg)))',
            opacity: '0',
          },
        },
        badgeReveal: {
          '0%': { opacity: '0', transform: 'scale(0.5) translateY(18px) rotate(-4deg)' },
          '65%': { opacity: '1', transform: 'scale(1.08) translateY(-2px) rotate(1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0) rotate(0deg)' },
        },
        xpNumberPop: {
          '0%': { opacity: '0', transform: 'scale(0.35) rotate(-5deg)' },
          '48%': { opacity: '1', transform: 'scale(1.2) rotate(2deg)' },
          '72%': { transform: 'scale(0.94) rotate(0deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
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
          '0%': { opacity: '0.72' },
          '35%': { opacity: '0.38' },
          '100%': { opacity: '0' },
        },
        /** Avant : scale + translateY — sur mobile, voile / overlay qui « glisse » avec le verre. */
        shopModalIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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
        questAcceptFlash: {
          '0%': { opacity: '0' },
          '12%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        questVictoryScreenFlash: {
          '0%': { opacity: '0', filter: 'brightness(1)' },
          '18%': { opacity: '1', filter: 'brightness(1.35)' },
          '100%': { opacity: '0', filter: 'brightness(1)' },
        },
        questRingPulse: {
          '0%': { transform: 'scale(0.35)', opacity: '0.85' },
          '100%': { transform: 'scale(2.15)', opacity: '0' },
        },
        questModalPop: {
          '0%': { opacity: '0', transform: 'scale(0.72) rotate(-4deg)' },
          '65%': { opacity: '1', transform: 'scale(1.06) rotate(1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        questModalShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '12%': { transform: 'translateX(-8px) rotate(-0.5deg)' },
          '24%': { transform: 'translateX(7px) rotate(0.5deg)' },
          '36%': { transform: 'translateX(-5px)' },
          '48%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-2px)' },
        },
        shopCelebrationOverlay: {
          '0%': { opacity: '0.55' },
          '18%': { opacity: '0.42' },
          '100%': { opacity: '0' },
        },
        shopScreenShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-5px)' },
          '30%': { transform: 'translateX(5px)' },
          '45%': { transform: 'translateX(-3px)' },
        },
        shopCoinBurst: {
          '0%': { opacity: '0', transform: 'translate(-50%, 0) scale(0.3)' },
          '22%': { opacity: '1', transform: 'translate(-50%, -18px) scale(1.15)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -120px) scale(0.85)' },
        },
        shopSparkleOrbit: {
          '0%': { opacity: '0', transform: 'rotate(-12deg) scale(0.5)' },
          '25%': { opacity: '1', transform: 'rotate(8deg) scale(1.05)' },
          '100%': { opacity: '0', transform: 'rotate(24deg) scale(1.25)' },
        },
        questDayStripIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        questDayStripShine: {
          '0%': { transform: 'translateX(-100%) skewX(-12deg)' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)' },
        },
        questLoaderIn: {
          '0%': { opacity: '0', transform: 'translateY(28px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        questLoaderHalo: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        /** Barre type indéterminé : segment 38 % de large qui glisse (left % du parent). */
        questLoaderBar: {
          '0%': { left: '0%' },
          '100%': { left: '62%' },
        },
        questLoaderBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 28px rgba(19, 78, 74, 0.14)',
        'glow-cyan-sm': '0 0 14px rgba(19, 78, 74, 0.1)',
        'glow-orange': '0 0 24px rgba(194, 65, 12, 0.14)',
        'glow-gold': '0 0 24px rgba(146, 64, 14, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
