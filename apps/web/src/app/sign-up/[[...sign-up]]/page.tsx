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
      title={<>Lance l&apos;aventure 🎮</>}
      subtitle="Inscris-toi — ta première quête personnalisée t'attend de l'autre côté."
      footer={
        <p className="text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link
            href="/sign-in"
            className="font-bold text-cyan-700 hover:text-orange-600 underline decoration-cyan-300/50 underline-offset-[0.2em] transition-colors duration-200"
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
