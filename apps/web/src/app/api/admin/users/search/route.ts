import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { requireAdminRequest } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/search?q= — recherche Clerk (prénom, nom, @pseudo, email, id…).
 * Enrichi avec la présence d’un profil Questia.
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdminRequest();
  if (!gate.ok) return gate.response;

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ error: 'Au moins 2 caractères.' }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({
      query: q,
      limit: 25,
    });

    const results = await Promise.all(
      users.map(async (u) => {
        const profile = await prisma.profile.findUnique({
          where: { clerkId: u.id },
          select: { id: true, role: true },
        });
        const firstName = u.firstName ?? '';
        const lastName = u.lastName ?? '';
        const full = `${firstName} ${lastName}`.trim();
        const username = u.username ?? null;
        const label =
          full ||
          (username ? `@${username}` : '') ||
          `Compte …${u.id.slice(-8)}`;

        return {
          clerkId: u.id,
          label,
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          username,
          profileId: profile?.id ?? null,
          hasQuestiaProfile: Boolean(profile),
          role: profile?.role ?? null,
        };
      }),
    );

    results.sort((a, b) => {
      if (a.hasQuestiaProfile !== b.hasQuestiaProfile) return a.hasQuestiaProfile ? -1 : 1;
      return a.label.localeCompare(b.label, 'fr');
    });

    return NextResponse.json({ query: q, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Clerk';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
