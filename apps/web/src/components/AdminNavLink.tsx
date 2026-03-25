'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Accès console admin (GET /api/profile → role). */
export function AdminNavLink() {
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

  return (
    <Link
      href="/admin"
      className="admin-console-link hidden sm:inline-flex"
      title="Console d’administration"
    >
      <span className="admin-console-link__icon" aria-hidden>
        ✦
      </span>
      <span>Console</span>
    </Link>
  );
}
