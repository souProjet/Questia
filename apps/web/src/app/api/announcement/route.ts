import { NextRequest, NextResponse } from 'next/server';
import {
  IN_APP_ANNOUNCEMENT_SETTING_KEY,
  parseInAppAnnouncementPayload,
  type InAppAnnouncementPlatform,
} from '@questia/shared';
import { prisma } from '@/lib/db';
import { resolveActiveInAppAnnouncement } from '@/lib/in-app-announcement';

export const dynamic = 'force-dynamic';

function parsePlatform(request: NextRequest): InAppAnnouncementPlatform {
  const q = request.nextUrl.searchParams.get('platform')?.trim().toLowerCase();
  if (q === 'ios' || q === 'android' || q === 'web') return q;
  return 'web';
}

/** GET — annonce active pour affichage in-app (pas d’auth). */
export async function GET(request: NextRequest) {
  const platform = parsePlatform(request);
  const row = await prisma.appSetting.findUnique({
    where: { key: IN_APP_ANNOUNCEMENT_SETTING_KEY },
  });
  if (!row?.value) {
    return NextResponse.json({ announcement: null });
  }
  let json: unknown;
  try {
    json = JSON.parse(row.value) as unknown;
  } catch {
    return NextResponse.json({ announcement: null });
  }
  const parsed = parseInAppAnnouncementPayload(json);
  const active = resolveActiveInAppAnnouncement(parsed, new Date(), platform);
  return NextResponse.json({ announcement: active });
}
