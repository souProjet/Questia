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
      title={<>Bon retour, aventurier·e ⚔️</>}
      subtitle="Connecte-toi pour retrouver ta quête du jour et ta série."
      footer={
        <p className="text-center text-sm text-slate-500">
          Pas encore de compte ?{' '}
          <Link
            href="/sign-up"
            className="font-bold text-cyan-700 hover:text-orange-600 underline decoration-cyan-300/50 underline-offset-[0.2em] transition-colors duration-200"
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
