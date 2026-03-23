import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { AuthQuestShell } from '@/components/AuthQuestShell';
import { clerkAuthAppearance } from '@/lib/clerk-auth-appearance';

export default function SignUpPage() {
  return (
    <AuthQuestShell
      badge={
        <>
          <span aria-hidden>🚀</span> Débloquer ta première quête
        </>
      }
      title={
        <>
          Lance <span className="text-gradient">l&apos;aventure</span> 🎮
        </>
      }
      subtitle="Inscris-toi — ta première quête personnalisée t’attend de l’autre côté."
      footer={
        <p className="text-center text-sm text-[var(--muted)]">
          Déjà un compte ?{' '}
          <Link
            href="/sign-in"
            className="font-bold text-cyan-800 hover:text-orange-600 underline decoration-orange-400/30 underline-offset-2 transition-colors"
          >
            Se connecter
          </Link>
        </p>
      }
    >
      <SignUp appearance={clerkAuthAppearance} forceRedirectUrl="/app" />
    </AuthQuestShell>
  );
}
