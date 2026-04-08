import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** POST — enregistre un jeton Expo Push pour l'utilisateur courant */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    token?: string;
    platform?: string;
  };
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return NextResponse.json({ error: 'Jeton Expo invalide' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  await prisma.pushDevice.deleteMany({ where: { expoPushToken: token } });
  await prisma.pushDevice.create({
    data: {
      profileId: profile.id,
      expoPushToken: token,
      platform: body.platform?.slice(0, 32) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — retire un jeton (déconnexion / désactivation des notifications) */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { token?: string };
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'token requis' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  await prisma.pushDevice.deleteMany({
    where: { profileId: profile.id, expoPushToken: token },
  });

  return NextResponse.json({ ok: true });
}
