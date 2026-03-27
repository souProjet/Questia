import createMiddleware from 'next-intl/middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const isPublicApiRoute = createRouteMatcher([
  '/api/quest(.*)',
  '/api/profile',
  '/api/notifications(.*)',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/api/shop/catalog',
  '/api/shop(.*)',
]);

/** Sans préfixe `/en` pour comparer aux routes « logiques » (as-needed). */
function stripLocale(pathname: string): string {
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return pathname === '/en' ? '/' : pathname.slice(3) || '/';
  }
  return pathname;
}

function isPublicPagePath(pathname: string): boolean {
  const p = stripLocale(pathname);
  if (p === '/') return true;
  if (p.startsWith('/legal')) return true;
  if (p.startsWith('/onboarding')) return true;
  if (p.startsWith('/sign-in')) return true;
  if (p.startsWith('/sign-up')) return true;
  return false;
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  /** Universal Links / App Links : fichiers publics, sans auth ni locale */
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    if (!isPublicApiRoute(req)) {
      await auth.protect();
    }
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(req);

  /** Laisser next-intl appliquer redirections (ex. négociation `Accept-Language` → `/en`). */
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/dashboard/, '/app') || '/app';
    return NextResponse.redirect(url);
  }
  if (pathname === '/en/dashboard' || pathname.startsWith('/en/dashboard/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en\/dashboard/, '/en/app') || '/en/app';
    return NextResponse.redirect(url);
  }

  const { userId } = await auth();

  if (userId && (pathname === '/' || pathname === '/en')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/en' ? '/en/app' : '/app';
    return NextResponse.redirect(url);
  }

  if (!isPublicPagePath(pathname)) {
    await auth.protect();
  }

  return intlResponse;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
