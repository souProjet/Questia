'use client';

import { usePathname } from '@/i18n/navigation';

function isAppOrAdminPath(path: string | null) {
  if (!path) return false;
  return path.startsWith('/app') || path.startsWith('/admin');
}

/**
 * Transition légère entre les routes (landing, onboarding, auth…).
 * Pas d'animation sur chaque navigation dans /app ou /admin pour éviter la fatigue visuelle.
 */
export default function RootTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inConsole = isAppOrAdminPath(pathname);
  const transitionKey = inConsole ? 'console' : pathname ?? 'root';

  return (
    <div
      key={transitionKey}
      className={
        inConsole
          ? undefined
          : 'motion-safe:animate-page-enter motion-reduce:animate-none'
      }
    >
      {children}
    </div>
  );
}
