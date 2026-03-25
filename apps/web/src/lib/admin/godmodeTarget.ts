import { NextResponse } from 'next/server';
import type { Profile } from '@prisma/client';
import { prisma } from '@/lib/db';

export type AdminGateOk = { userId: string; profile: Profile };

/**
 * Profil cible pour le god mode : soi par défaut, ou un autre utilisateur (admin uniquement).
 */
export async function resolveGodmodeTarget(
  gate: AdminGateOk,
  targetClerkId: string | undefined,
): Promise<Profile | NextResponse> {
  const trimmed = targetClerkId?.trim();
  if (!trimmed || trimmed === gate.userId) {
    return gate.profile;
  }

  const target = await prisma.profile.findUnique({ where: { clerkId: trimmed } });
  if (!target) {
    return NextResponse.json({ error: 'Profil cible introuvable (clerkId).' }, { status: 404 });
  }

  console.log(
    JSON.stringify({
      v: 1,
      service: 'questia-web',
      domain: 'admin',
      operation: 'godmode_target',
      ts: new Date().toISOString(),
      actorClerkSuffix: gate.userId.slice(-8),
      targetClerkSuffix: trimmed.slice(-8),
    }),
  );

  return target;
}
