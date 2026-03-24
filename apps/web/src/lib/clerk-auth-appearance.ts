/**
 * Thème Clerk aligné sur la DA Questia (panneau quête clair, CTA orange→or, accents cyan).
 * Complété par `.auth-clerk-root` dans globals.css pour les classes internes Clerk.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: '#f97316',
    /* Fond clair partout (y compris footer Clerk / bandeau dev) — transparent laissait retomber le thème sombre par défaut → bloc noir */
    colorBackground: '#fffdf5',
    colorText: '#13212d',
    colorTextSecondary: '#4d7187',
    colorInputBackground: '#ffffff',
    colorInputText: '#13212d',
    colorDanger: '#dc2626',
    borderRadius: '14px',
    spacingUnit: '16px',
    fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.9375rem',
  },
  elements: {
    /* Bloc Clerk centré et aligné sur la largeur du panneau */
    rootBox: '!mx-auto !w-full !max-w-full !flex !flex-col !items-stretch',
    /* Carte Clerk = même crème que le panneau ; pas de double bordure fantôme */
    card: '!mx-auto !w-full !max-w-full !border-0 !bg-transparent !shadow-none',
    main: '!mx-auto !w-full !max-w-full',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsRoot: 'gap-3 relative !overflow-visible pt-1',
    socialButtonsBlockButton:
      '!w-full !justify-center !border-2 !border-orange-200/80 !bg-white/95 !text-[#13212d] !rounded-2xl !font-bold hover:!bg-cyan-50 hover:!border-cyan-300/60 transition-all duration-200',
    formButtonPrimary:
      '!w-full !bg-gradient-to-br !from-orange-500 !to-amber-400 !text-white !font-extrabold !rounded-2xl !shadow-[0_6px_20px_rgba(249,115,22,0.38)] hover:!brightness-[1.05] !border-0 !normal-case',
    formFieldInput:
      '!rounded-xl !border !border-slate-300/80 !bg-white !text-[#13212d] placeholder:!text-slate-400',
    formFieldLabel: '!text-[#4d7187] !font-semibold !text-sm',
    formFieldSuccessText: '!text-emerald-700',
    formFieldErrorText: '!text-red-600 !text-sm',
    /* Lien Clerk « S'inscrire / Se connecter » masqué via globals.css (.cl-footerAction) — lien unique dans AuthQuestShell */
    footer: '!bg-transparent !border-0 !shadow-none !p-0 !mt-2',
    footerActionLink:
      '!text-cyan-700 !font-bold hover:!text-orange-600 !no-underline hover:!underline',
    dividerRow: '!gap-3',
    dividerLine:
      '!bg-gradient-to-r !from-transparent !via-cyan-300/45 !to-transparent !h-px',
    dividerText: '!text-[#4d7187] !text-[11px] !font-bold !uppercase !tracking-widest',
    identityPreview: '!rounded-2xl !border !border-orange-200/60 !bg-white/80',
    identityPreviewText: '!text-[#13212d]',
    identityPreviewEditButton: '!text-cyan-700 !font-semibold',
    otpCodeFieldInput: '!rounded-xl !border-slate-200 !bg-white',
    formResendCodeLink: '!text-cyan-700 !font-semibold hover:!text-orange-600',
    alertText: '!text-red-800',
    formFieldHintText: '!text-[#4d7187]',
    alternativeMethodsBlockButton:
      '!rounded-xl !border !border-orange-200/50 !bg-white/90 !font-semibold',
  },
} as const;
