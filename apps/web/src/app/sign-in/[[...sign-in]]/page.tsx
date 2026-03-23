import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { AuthQuestShell } from '@/components/AuthQuestShell';
import { clerkAuthAppearance } from '@/lib/clerk-auth-appearance';

export default function SignInPage() {
  return (
    <AuthQuestShell
      badge={
        <>
          <span aria-hidden>🧭</span> Reprendre ta progression
        </>
      }
      title={
        <>
          Bon retour, <span className="text-gradient">aventurier·e</span> ⚔️
        </>
      }
      subtitle="Connecte-toi pour retrouver ta quête du jour et ta série."
      footer={
        <p className="text-center text-sm text-[var(--muted)]">
          Pas encore de compte ?{' '}
          <Link
            href="/sign-up"
            className="font-bold text-cyan-800 hover:text-orange-600 underline decoration-orange-400/30 underline-offset-2 transition-colors"
          >
            Créer un compte gratuitement
          </Link>
        </p>
      }
    >
      <SignIn appearance={clerkAuthAppearance} forceRedirectUrl="/app" />
    </AuthQuestShell>
  );
}
