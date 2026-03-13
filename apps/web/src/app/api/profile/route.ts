import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { QUADRANT_DEFAULTS } from '@dopamode/shared';
import type { ExplorerAxis, RiskAxis } from '@dopamode/shared';

/** GET /api/profile — returns the current user's profile */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
  });

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  return NextResponse.json(profile);
}

/** POST /api/profile — get-or-create the current user's profile */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // Try to find existing profile
  const existing = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (existing) return NextResponse.json(existing);

  // Create new profile from the quadrant passed by the client (from localStorage)
  const body = await request.json().catch(() => ({})) as {
    explorerAxis?: ExplorerAxis;
    riskAxis?: RiskAxis;
  };
  const explorerAxis: ExplorerAxis = body.explorerAxis ?? 'explorer';
  const riskAxis: RiskAxis = body.riskAxis ?? 'risktaker';

  const key = `${explorerAxis}_${riskAxis}` as keyof typeof QUADRANT_DEFAULTS;
  const declaredPersonality = QUADRANT_DEFAULTS[key];

  const profile = await prisma.profile.create({
    data: {
      clerkId: userId,
      explorerAxis,
      riskAxis,
      declaredPersonality: declaredPersonality as unknown as Record<string, number>,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
