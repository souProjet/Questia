import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXPORT_VERSION = 1;

/**
 * GET /api/user/data-export — export JSON des données associées au compte (droit à la portabilité, art. 20 RGPD).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
    include: {
      questLogs: { orderBy: { questDate: 'desc' } },
      shopTransactions: { orderBy: { createdAt: 'desc' } },
      pushDevices: true,
    },
  });

  const client = await clerkClient();
  let clerkUser: {
    id: string;
    createdAt: number;
    primaryEmailAddress: string | null;
    emailAddresses: { emailAddress: string; id: string }[];
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null = null;
  try {
    const u = await client.users.getUser(userId);
    clerkUser = {
      id: u.id,
      createdAt: u.createdAt,
      primaryEmailAddress: u.primaryEmailAddress?.emailAddress ?? null,
      emailAddresses: u.emailAddresses.map((e) => ({ emailAddress: e.emailAddress, id: e.id })),
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      username: u.username ?? null,
    };
  } catch {
    clerkUser = null;
  }

  const payload = {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    notice:
      'Export généré par Questia. Les textes de quêtes générés par IA sont indiqués dans les champs generated_* de chaque entrée de questLogs. Compte hébergé chez Clerk ; données de jeu en base PostgreSQL.',
    clerkAccount: clerkUser,
    profile,
  };

  const body = JSON.stringify(payload, null, 2);
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'export';
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="questia-donnees-${safe}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
