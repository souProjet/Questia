import { NextRequest, NextResponse } from 'next/server';
import { buildBroadcastEmailInner, runBroadcastEmail, runBroadcastPush } from '@/lib/admin/runBroadcast';
import { requireAdminRequest } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type BroadcastJson = {
  kind?: string;
  confirm?: boolean;
  pushTitle?: string;
  pushBody?: string;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
};

/**
 * POST /api/admin/broadcast — push ou e-mail à tous les utilisateurs (profils + appareils en base).
 * Réservé admin ; `confirm: true` obligatoire.
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as BroadcastJson;

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'Diffuse seulement avec confirm: true (case à cocher dans la console).' },
      { status: 400 },
    );
  }

  const kind = body.kind === 'email' ? 'email' : body.kind === 'push' ? 'push' : null;
  if (!kind) {
    return NextResponse.json({ error: 'kind attendu : « push » ou « email ».' }, { status: 400 });
  }

  console.log(
    JSON.stringify({
      v: 1,
      service: 'questia-web',
      domain: 'admin',
      operation: 'broadcast',
      kind,
      ts: new Date().toISOString(),
      actorClerkSuffix: gate.userId.slice(-8),
    }),
  );

  try {
    if (kind === 'push') {
      const title = typeof body.pushTitle === 'string' ? body.pushTitle.trim() : '';
      const text = typeof body.pushBody === 'string' ? body.pushBody.trim() : '';
      if (!title || title.length > 100) {
        return NextResponse.json({ error: 'Titre push requis (1 à 100 caractères).' }, { status: 400 });
      }
      if (!text || text.length > 280) {
        return NextResponse.json({ error: 'Corps push requis (1 à 280 caractères).' }, { status: 400 });
      }
      const result = await runBroadcastPush(title, text);
      return NextResponse.json(result);
    }

    const subject = typeof body.emailSubject === 'string' ? body.emailSubject.trim() : '';
    if (!subject || subject.length > 200) {
      return NextResponse.json({ error: 'Objet requis (1 à 200 caractères).' }, { status: 400 });
    }
    const rawHtml = typeof body.emailHtml === 'string' ? body.emailHtml : '';
    const rawText = typeof body.emailText === 'string' ? body.emailText : '';
    const built = buildBroadcastEmailInner(rawHtml, rawText);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }
    const result = await runBroadcastEmail(subject, built.html);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
