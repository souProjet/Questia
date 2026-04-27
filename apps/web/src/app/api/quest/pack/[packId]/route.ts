/**
 * Parcours d'un pack de quêtes — `GET` retourne l'état de l'arc pour le user
 * connecté (chapitres / slots / verrous / progression). `POST` complète un
 * slot et applique éventuellement la récompense finale (titre + Quest Coins)
 * si le parcours est intégralement bouclé.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  buildArcState,
  findQuestPackArcSlot,
  getQuestPackArc,
  isArcFullyCompleted,
  parseQuestPackProgress,
} from '@questia/shared';
import { parseStringArray } from '@/lib/shop/parse';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packId: string }>;
}

function notOwned(): NextResponse {
  return NextResponse.json(
    { error: 'Tu ne possèdes pas ce pack. Achète-le dans la boutique.' },
    { status: 403 },
  );
}

function noSuchPack(): NextResponse {
  return NextResponse.json({ error: 'Pack inconnu.' }, { status: 404 });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  const { packId } = await ctx.params;
  const arc = getQuestPackArc(packId);
  if (!arc) return noSuchPack();

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
  }

  const ownedQuestPackIds = parseStringArray(
    (profile as { ownedQuestPackIds?: unknown }).ownedQuestPackIds,
  );
  if (!ownedQuestPackIds.includes(packId)) return notOwned();

  const progress = parseQuestPackProgress(
    (profile as { questPackProgress?: unknown }).questPackProgress,
  );
  const view = buildArcState(arc, progress[packId]);

  return NextResponse.json({ arc, state: view });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  const { packId } = await ctx.params;
  const arc = getQuestPackArc(packId);
  if (!arc) return noSuchPack();

  const body = (await req.json().catch(() => ({}))) as { slotKey?: string };
  const slotKey = typeof body.slotKey === 'string' ? body.slotKey.trim() : '';
  const slotInfo = slotKey ? findQuestPackArcSlot(packId, slotKey) : undefined;
  if (!slotInfo) {
    return NextResponse.json(
      { error: 'Slot inconnu. Vérifie l’identifiant.' },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
  }

  const ownedQuestPackIds = parseStringArray(
    (profile as { ownedQuestPackIds?: unknown }).ownedQuestPackIds,
  );
  if (!ownedQuestPackIds.includes(packId)) return notOwned();

  const progress = parseQuestPackProgress(
    (profile as { questPackProgress?: unknown }).questPackProgress,
  );
  const entry = progress[packId] ?? { completed: [] };
  const alreadyDone = entry.completed.includes(slotKey);

  // Garde-fou : on ne peut compléter que les slots du chapitre courant ou des
  // chapitres précédents non terminés (le UI le filtre déjà, mais on revérifie).
  const [chapterId] = slotKey.split('.');
  const chapterIdx = arc.chapters.findIndex((c) => c.id === chapterId);
  for (let i = 0; i < chapterIdx; i++) {
    const prev = arc.chapters[i];
    const allPrevDone = prev.slots.every((s) =>
      entry.completed.includes(`${prev.id}.${s.slug}`),
    );
    if (!allPrevDone) {
      return NextResponse.json(
        { error: 'Termine d’abord toutes les quêtes du chapitre précédent.' },
        { status: 400 },
      );
    }
  }

  const newCompleted = alreadyDone
    ? entry.completed
    : [...entry.completed, slotKey];

  // Récompense finale (titre + QC) à n'appliquer qu'une fois.
  const fullyDone = isArcFullyCompleted(arc, newCompleted);
  const claimReward = fullyDone && entry.rewardClaimed !== true;

  // XP par slot — sauter si le slot était déjà complété (no-op idempotent).
  const xpEarned = alreadyDone ? 0 : slotInfo.slot.xp;

  const newEntry = {
    completed: newCompleted,
    rewardClaimed: claimReward ? true : entry.rewardClaimed === true,
  };
  const newProgress = { ...progress, [packId]: newEntry };

  // Application : XP, titre éventuel, coins éventuels.
  const titles = parseStringArray(
    (profile as { ownedTitleIds?: unknown }).ownedTitleIds,
  );
  const updatedTitles = claimReward && !titles.includes(arc.rewardTitleId)
    ? [...titles, arc.rewardTitleId]
    : titles;
  const updatedCoinBalance =
    (profile.coinBalance ?? 0) + (claimReward ? arc.rewardCoins : 0);
  const updatedTotalXp = (profile.totalXp ?? 0) + xpEarned;

  const updateData: Prisma.ProfileUpdateInput = {
    questPackProgress: newProgress as unknown as Prisma.InputJsonValue,
    ...(xpEarned > 0 ? { totalXp: updatedTotalXp } : {}),
    ...(claimReward
      ? {
          ownedTitleIds: updatedTitles as unknown as Prisma.InputJsonValue,
          coinBalance: updatedCoinBalance,
        }
      : {}),
  } as unknown as Prisma.ProfileUpdateInput;

  await prisma.profile.update({ where: { id: profile.id }, data: updateData });

  const refreshed = await prisma.profile.findUnique({ where: { id: profile.id } });
  const state = buildArcState(
    arc,
    parseQuestPackProgress(
      (refreshed as { questPackProgress?: unknown } | null)?.questPackProgress,
    )[packId],
  );

  return NextResponse.json({
    arc,
    state,
    xpEarned,
    rewardJustClaimed: claimReward
      ? { titleId: arc.rewardTitleId, coins: arc.rewardCoins }
      : null,
    coinBalance: refreshed?.coinBalance ?? 0,
    totalXp: refreshed?.totalXp ?? 0,
  });
}
