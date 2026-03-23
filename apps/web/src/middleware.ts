import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/onboarding(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/quest(.*)',
  '/api/profile',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  const pathname = req.nextUrl.pathname;
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/dashboard/, '/app') || '/app';
    return NextResponse.redirect(url);
  }

  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/app', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
