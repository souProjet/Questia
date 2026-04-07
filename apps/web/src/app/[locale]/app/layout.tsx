import type { Metadata } from 'next';

/** Espace connecté : pas d’indexation (déjà exclu par robots.txt, renforcé ici). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
