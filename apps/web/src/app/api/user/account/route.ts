import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CONFIRM_PHRASE = 'SUPPRIMER';

/**
 * DELETE /api/user/account — suppression du compte et des données associées (droit à l'effacement, art. 17 RGPD).
 * Le corps doit contenir { "confirmation": "SUPPRIMER" }.
 */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { confirmation?: string };
  if (body.confirmation !== CONFIRM_PHRASE) {
    return NextResponse.json(
      {
        error: 'Confirmation invalide',
        hint: `Envoie { "confirmation": "${CONFIRM_PHRASE}" } dans le corps JSON.`,
      },
      { status: 400 },
    );
  }

  await prisma.profile.deleteMany({ where: { clerkId: userId } });

  const client = await clerkClient();
  try {
    await client.users.deleteUser(userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json(
      {
        error: "Les données applicatives ont été effacées, mais la suppression du compte d'authentification a échoué.",
        detail: msg,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: 'Compte et données supprimés.' });
}
