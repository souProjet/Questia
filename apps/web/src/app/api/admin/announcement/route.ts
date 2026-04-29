import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  IN_APP_ANNOUNCEMENT_SETTING_KEY,
  IN_APP_ANNOUNCEMENT_PLATFORMS,
  parseInAppAnnouncementPayload,
  type InAppAnnouncementPayload,
  type InAppAnnouncementPlatform,
} from '@questia/shared';
import { prisma } from '@/lib/db';
import { requireAdminRequest } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

type PostBody = {
  enabled?: boolean;
  title?: string;
  body?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  platforms?: InAppAnnouncementPlatform[] | null;
  /** Si true, nouvel `id` → tous les clients reverront la modale. */
  renewId?: boolean;
};

function normalizePlatforms(raw: unknown): InAppAnnouncementPlatform[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const set = new Set<InAppAnnouncementPlatform>();
  for (const x of raw) {
    if (typeof x === 'string' && (IN_APP_ANNOUNCEMENT_PLATFORMS as readonly string[]).includes(x)) {
      set.add(x as InAppAnnouncementPlatform);
    }
  }
  return set.size ? [...set] : null;
}

/** GET — charge l’annonce brute pour l’éditeur admin. */
export async function GET() {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const row = await prisma.appSetting.findUnique({
    where: { key: IN_APP_ANNOUNCEMENT_SETTING_KEY },
  });
  if (!row?.value) {
    return NextResponse.json({ announcement: null });
  }
  try {
    const json = JSON.parse(row.value) as unknown;
    const parsed = parseInAppAnnouncementPayload(json);
    return NextResponse.json({ announcement: parsed });
  } catch {
    return NextResponse.json({ announcement: null });
  }
}

/** POST — enregistre l’annonce (création / mise à jour). */
export async function POST(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as PostBody;

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) {
    return NextResponse.json({ error: 'Titre requis (1 à 200 caractères).' }, { status: 400 });
  }

  const textBody = typeof body.body === 'string' ? body.body : '';
  if (textBody.length > 20000) {
    return NextResponse.json({ error: 'Corps trop long (max 20 000 caractères).' }, { status: 400 });
  }

  const platforms = normalizePlatforms(body.platforms);

  let startsAt: string | null | undefined;
  if (body.startsAt === null) startsAt = null;
  else if (body.startsAt === undefined) startsAt = undefined;
  else if (typeof body.startsAt === 'string' && !body.startsAt.trim()) {
    startsAt = null;
  } else if (typeof body.startsAt === 'string' && body.startsAt.trim()) {
    const t = Date.parse(body.startsAt);
    if (!Number.isFinite(t)) {
      return NextResponse.json({ error: 'startsAt invalide.' }, { status: 400 });
    }
    startsAt = new Date(t).toISOString();
  } else {
    return NextResponse.json({ error: 'startsAt invalide.' }, { status: 400 });
  }

  let endsAt: string | null | undefined;
  if (body.endsAt === null) endsAt = null;
  else if (body.endsAt === undefined) endsAt = undefined;
  else if (typeof body.endsAt === 'string' && !body.endsAt.trim()) {
    endsAt = null;
  } else if (typeof body.endsAt === 'string' && body.endsAt.trim()) {
    const t = Date.parse(body.endsAt);
    if (!Number.isFinite(t)) {
      return NextResponse.json({ error: 'endsAt invalide.' }, { status: 400 });
    }
    endsAt = new Date(t).toISOString();
  } else {
    return NextResponse.json({ error: 'endsAt invalide.' }, { status: 400 });
  }

  if (
    startsAt &&
    endsAt &&
    Date.parse(startsAt) > Date.parse(endsAt)
  ) {
    return NextResponse.json({ error: 'La date de fin doit être après la date de début.' }, { status: 400 });
  }

  const existingRow = await prisma.appSetting.findUnique({
    where: { key: IN_APP_ANNOUNCEMENT_SETTING_KEY },
  });
  let previousId: string | null = null;
  if (existingRow?.value) {
    try {
      const prev = parseInAppAnnouncementPayload(JSON.parse(existingRow.value) as unknown);
      previousId = prev?.id ?? null;
    } catch {
      previousId = null;
    }
  }

  const renewId = body.renewId === true;
  const id = renewId || !previousId ? randomUUID() : previousId;

  const payload: InAppAnnouncementPayload = {
    id,
    title,
    body: textBody,
    enabled: body.enabled !== false,
    startsAt: startsAt ?? null,
    endsAt: endsAt ?? null,
    platforms,
  };

  await prisma.appSetting.upsert({
    where: { key: IN_APP_ANNOUNCEMENT_SETTING_KEY },
    create: {
      key: IN_APP_ANNOUNCEMENT_SETTING_KEY,
      value: JSON.stringify(payload),
    },
    update: {
      value: JSON.stringify(payload),
    },
  });

  console.log(
    JSON.stringify({
      v: 1,
      service: 'questia-web',
      domain: 'admin',
      operation: 'in_app_announcement_save',
      renewId,
      ts: new Date().toISOString(),
      actorClerkSuffix: gate.userId.slice(-8),
    }),
  );

  return NextResponse.json({ ok: true, announcement: payload });
}
