'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard } from 'lucide-react';

/** Accès console admin (GET /api/profile → role). */
export function AdminNavLink({ variant = 'toolbar' }: { variant?: 'toolbar' | 'drawer' }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { role?: string } | null) => {
        if (!cancelled && d?.role === 'admin') setShow(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show || pathname?.startsWith('/admin')) return null;

  const toolbarClass = variant === 'toolbar' ? 'hidden md:inline-flex' : 'inline-flex w-full min-w-0 justify-center rounded-xl py-3.5 shadow-md';

  return (
    <Link
      href="/admin"
      className={`admin-console-link ${toolbarClass}`}
      title="Console d’administration"
    >
      <span>Console</span>
      <span className="admin-console-link__icon inline-flex" aria-hidden>
        <LayoutDashboard className="h-4 w-4" strokeWidth={2.25} />
      </span>
    </Link>
  );
}
