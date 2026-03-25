'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabClass = (active: boolean) =>
  `rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition sm:px-5 ${
    active
      ? 'border-cyan-400/90 bg-gradient-to-br from-cyan-50 to-white text-[var(--on-cream)] shadow-[0_4px_16px_-4px_rgba(34,211,238,0.35)]'
      : 'border-transparent bg-white/60 text-[var(--muted)] hover:border-cyan-200/80 hover:bg-white/95'
  }`;

export function AdminSubnav() {
  const pathname = usePathname();
  const isIntervention = pathname === '/admin';
  const isStats = pathname === '/admin/stats';

  return (
    <nav className="mb-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3" aria-label="Sections console">
      <Link href="/admin" className={tabClass(isIntervention)} prefetch>
        Intervention &amp; prise de compte
      </Link>
      <Link href="/admin/stats" className={tabClass(isStats)} prefetch>
        Statistiques globales
      </Link>
    </nav>
  );
}
