import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { Profile } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Accès admin : uniquement `profiles.role === 'admin'` (Prisma Studio, SQL, migration, etc.).
 * Aucune variable d’environnement : une seule source de vérité en base.
 */

export async function isAdminClerkId(clerkId: string): Promise<boolean> {
  const p = await prisma.profile.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return p?.role === 'admin';
}

/** Route handlers API : 401 / 403 ou profil admin. */
export async function requireAdminRequest(): Promise<
  | { ok: true; userId: string; profile: Profile }
  | { ok: false; response: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }
  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile || profile.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 }),
    };
  }
  return { ok: true, userId, profile };
}
