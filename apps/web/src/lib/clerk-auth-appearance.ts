/**
 * Thème Clerk aligné sur la DA Questia — panneau blanc, CTA orange→or, accents cyan.
 * Complété par `.auth-clerk-root` dans globals.css pour les classes internes Clerk.
 */
export const clerkAuthAppearance = {
  /** Retire le logo Clerk (déjà dans AuthQuestShell) — sinon grand vide au-dessus de « Continuer avec Google » */
  options: {
    logoImageUrl: '',
  },
  variables: {
    colorPrimary: '#f97316',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorInputBackground: '#f8fafc',
    colorInputText: '#0f172a',
    colorDanger: '#dc2626',
    borderRadius: '14px',
    spacingUnit: '12px',
    fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.9375rem',
  },
  elements: {
    rootBox: '!mx-auto !w-full !max-w-full !flex !flex-col !items-stretch',
    card: '!mx-auto !w-full !max-w-full !border-0 !bg-transparent !shadow-none',
    /** Titres masqués dans le shell ; le conteneur Clerk garde souvent une marge — resserrer sans casser les autres étapes */
    header: '!m-0 !p-0 !min-h-0 !gap-0 !border-0 !shadow-none',
    main: '!mx-auto !w-full !max-w-full !mt-0 !pt-0 !gap-3',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsRoot: '!mt-0 !pt-0 gap-3 !relative !overflow-hidden',
    socialButtonsBlockButton:
      '!w-full !justify-center !border !border-slate-200 !bg-slate-50 !text-slate-800 !rounded-2xl !font-bold hover:!bg-cyan-50 hover:!border-cyan-300/60 transition-all duration-200',
    formButtonPrimary:
      '!w-full !bg-orange-500 !text-white !font-extrabold !rounded-[0.875rem] !shadow-[0_4px_14px_rgba(249,115,22,0.28)] hover:!bg-orange-600 !border-0 !normal-case',
    formFieldInput:
      '!rounded-xl !border !border-slate-200 !bg-slate-50 !text-slate-900 placeholder:!text-slate-400 focus:!border-cyan-400 focus:!ring-2 focus:!ring-cyan-200/50',
    formFieldLabel: '!text-slate-500 !font-semibold !text-sm',
    formFieldSuccessText: '!text-emerald-700',
    formFieldErrorText: '!text-red-600 !text-sm',
    footer: '!bg-transparent !border-0 !shadow-none !p-0 !mt-2',
    footerActionLink:
      '!text-cyan-700 !font-bold hover:!text-orange-600 !no-underline hover:!underline',
    dividerRow: '!gap-3',
    dividerLine: '!bg-slate-200 !h-px',
    dividerText: '!text-slate-400 !text-[11px] !font-bold !uppercase !tracking-widest',
    identityPreview: '!rounded-2xl !border !border-slate-200 !bg-slate-50',
    identityPreviewText: '!text-slate-900',
    identityPreviewEditButton: '!text-cyan-700 !font-semibold',
    otpCodeFieldInput: '!rounded-xl !border-slate-200 !bg-slate-50',
    formResendCodeLink: '!text-cyan-700 !font-semibold hover:!text-orange-600',
    alertText: '!text-red-800',
    formFieldHintText: '!text-slate-400',
    alternativeMethodsBlockButton:
      '!rounded-xl !border !border-slate-200 !bg-slate-50 !font-semibold',
  },
} as const;
