import { NextRequest, NextResponse } from 'next/server';
import { runGodmodeAction, type GodmodeBody } from '@/lib/admin/godmodeActions';
import { resolveGodmodeTarget } from '@/lib/admin/godmodeTarget';
import { requireAdminRequest } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/admin/godmode — actions de test sur ton profil ou un `targetClerkId` (support).
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const targetClerkId =
    typeof raw.targetClerkId === 'string' ? raw.targetClerkId : undefined;
  const target = await resolveGodmodeTarget(gate, targetClerkId);
  if (target instanceof NextResponse) return target;

  const body = raw as GodmodeBody;
  if (typeof body.action !== 'string' || !body.action) {
    return NextResponse.json({ error: 'Champ « action » requis.' }, { status: 400 });
  }

  const manualActions = body.action === 'send_manual_push' || body.action === 'send_manual_email';
  if (manualActions) {
    const tid = typeof raw.targetClerkId === 'string' ? raw.targetClerkId.trim() : '';
    if (!tid) {
      return NextResponse.json(
        { error: 'Sélectionne un joueur (prise de compte) pour envoyer un message personnalisé.' },
        { status: 400 },
      );
    }
    if (tid === gate.userId) {
      return NextResponse.json(
        { error: 'Les envois personnalisés concernent uniquement un autre compte que le tien.' },
        { status: 400 },
      );
    }
  }

  return runGodmodeAction(target, body, todayIsoUtc());
}
