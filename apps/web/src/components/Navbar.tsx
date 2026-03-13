'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <nav
        className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl"
        style={{ background: 'linear-gradient(to bottom, rgba(5,5,10,0.96), rgba(5,5,10,0.8))', backdropFilter: 'blur(20px)' }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-black shadow-glow-violet-sm group-hover:bg-violet-500 transition-colors">
            ⚔
          </div>
          <span className="font-display font-black text-lg tracking-tight">DOPAMODE</span>
        </Link>

        {/* Nav links */}
        {!isDashboard && (
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#how" className="hover:text-white transition-colors">Comment ça marche</a>
            <a href="#quests" className="hover:text-white transition-colors">Quêtes</a>
          </div>
        )}

        {/* Auth */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              {!isDashboard && (
                <Link href="/dashboard" className="btn-primary text-sm py-2 px-5">
                  Mon Dashboard
                </Link>
              )}
              <UserButton
                appearance={{
                  variables: { colorPrimary: '#8b5cf6' },
                  elements: { avatarBox: 'w-8 h-8' },
                }}
              />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
                Connexion
              </Link>
              <Link href="/sign-up" className="btn-primary text-sm py-2 px-5">
                Commencer
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
