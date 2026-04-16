import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ACCEPTED_CONFIRM_PHRASES = ['SUPPRIMER', 'DELETE'];

/**
 * DELETE /api/user/account — suppression du compte et des données associées (droit à l'effacement, art. 17 RGPD).
 * Le corps doit contenir { "confirmation": "SUPPRIMER" }.
 */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { confirmation?: string };
  if (!body.confirmation || !ACCEPTED_CONFIRM_PHRASES.includes(body.confirmation)) {
    return NextResponse.json(
      {
        error: 'Confirmation invalide',
        hint: `Envoie { "confirmation": "SUPPRIMER" } ou { "confirmation": "DELETE" } dans le corps JSON.`,
      },
      { status: 400 },
    );
  }

  // Delete auth account first — if this fails the user can retry
  // with their data still intact. The reverse (DB deleted, Clerk alive)
  // would leave an orphaned auth account that cannot be cleaned up.
  const client = await clerkClient();
  try {
    await client.users.deleteUser(userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json(
      {
        error: "La suppression du compte d'authentification a échoué. Aucune donnée n'a été supprimée, veuillez réessayer.",
        detail: msg,
      },
      { status: 502 },
    );
  }

  await prisma.profile.deleteMany({ where: { clerkId: userId } });

  return NextResponse.json({ ok: true, message: 'Compte et données supprimés.' });
}
