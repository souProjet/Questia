'use client';

import { usePathname } from '@/i18n/navigation';

function isAppOrAdminPath(path: string | null) {
  if (!path) return false;
  return path.startsWith('/app') || path.startsWith('/admin');
}

/**
 * Clé de remontage : évite de garder l’état client entre routes très différentes.
 * Pas d’animation sur ce wrapper : une animation (opacity/transform + fill-mode) sur un parent
 * casse la composition des backdrop-filter → overlay / voile bloqué sur la landing.
 * Pas d’animation non plus dans /app ou /admin (fatigue visuelle).
 */
export default function RootTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inConsole = isAppOrAdminPath(pathname);
  const transitionKey = inConsole ? 'console' : pathname ?? 'root';

  return (
    <div key={transitionKey}>
      {children}
    </div>
  );
}
