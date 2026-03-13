import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-10"
        style={{ background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm group-hover:bg-violet-500 transition-colors">⚔</div>
            <span className="font-display font-black text-lg tracking-widest text-white/70">DOPAMODE</span>
          </Link>
          <h1 className="font-display text-3xl font-black text-white mb-2">Lance l'aventure.</h1>
          <p className="text-gray-500 text-sm">Première quête générée en 2 minutes.</p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#0d0d16',
              colorText: '#f1f1f9',
              colorTextSecondary: '#6b7280',
              colorInputBackground: '#05050a',
              colorInputText: '#f1f1f9',
              colorDanger: '#ef4444',
              borderRadius: '14px',
              spacingUnit: '18px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            elements: {
              card: {
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 40px rgba(139,92,246,0.1)',
                background: '#0d0d16',
              },
              headerTitle: { display: 'none' },
              headerSubtitle: { display: 'none' },
            },
          }}
        />

        <p className="text-center text-gray-600 text-xs mt-6">
          Déjà un compte ?{' '}
          <Link href="/sign-in" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
