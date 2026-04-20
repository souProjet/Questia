/**
 * Rollover : que faire des quêtes « laissées en chemin » quand l'user revient ?
 *
 * Règles (cf. design #carry-over conditionnel) :
 *
 * | Status à minuit | Pace      | Action                                           | Streak   |
 * |-----------------|-----------|--------------------------------------------------|----------|
 * | pending         | n'importe | auto-rejected (silencieux)                       | inchangé |
 * | accepted        | instant   | auto-abandoned                                   | reset 0  |
 * | accepted        | planned   | grâce de 36 h posée, carry-over actif aujourd'hui | inchangé |
 * | accepted+grace  | planned   | grâce expirée → forced abandoned                  | reset 0  |
 *
 * Implémentation : une fonction pure `classifyStaleLog` (facilement testable),
 * et un wrapper `rolloverStaleLogs` qui applique les mutations Prisma.
 *
 * Invariants :
 *  - On ne touche jamais aux logs dont `questDate === today` (c'est la quête active du jour).
 *  - `completed`/`abandoned`/`rejected`/`replaced` sont terminaux → jamais modifiés.
 *  - Un carry-over actif (`planned-carryover`) empêche la génération d'une nouvelle quête.
 */

import type { Prisma, PrismaClient, QuestLog as PrismaQuestLog } from '@prisma/client';
import type { QuestModel } from '@questia/shared';
import { findArchetypeById } from '@/lib/quest-taxonomy/map-prisma';

/** Durée de grâce offerte à une quête `planned` acceptée qui traverse minuit. */
export const CARRYOVER_GRACE_MS = 36 * 60 * 60 * 1000;

export type StaleLogDecision =
  | { kind: 'keep' } // terminal ou même jour que `today`, on ne touche pas
  | { kind: 'pending-rejected' } // pas engagé → silent reject
  | { kind: 'instant-abandoned' } // accepté mais pas fait → abandon + streak reset
  | {
      kind: 'planned-carryover-start'; // première grâce : on pose graceDeadline
      graceDeadline: Date;
    }
  | { kind: 'planned-carryover-active' } // grâce toujours valable
  | { kind: 'planned-expired' }; // grâce dépassée → forced abandon + streak reset

export interface ClassifyInput {
  log: Pick<
    PrismaQuestLog,
    'status' | 'questDate' | 'archetypeId' | 'graceDeadline'
  >;
  today: string;
  archetype: QuestModel | null;
  now: Date;
}

/**
 * Pure fonction : décide quoi faire d'un log donné.
 *
 * Ne fait AUCUN side-effect — idéal pour les tests unitaires.
 */
export function classifyStaleLog(input: ClassifyInput): StaleLogDecision {
  const { log, today, archetype, now } = input;

  if (log.questDate === today) return { kind: 'keep' };
  if (
    log.status === 'completed' ||
    log.status === 'abandoned' ||
    log.status === 'rejected' ||
    log.status === 'replaced'
  ) {
    return { kind: 'keep' };
  }

  if (log.status === 'pending') {
    return { kind: 'pending-rejected' };
  }

  // status === 'accepted'
  const pace = archetype?.questPace ?? 'instant';

  if (pace === 'instant') {
    return { kind: 'instant-abandoned' };
  }

  // pace === 'planned'
  if (log.graceDeadline == null) {
    // Première grâce offerte.
    return {
      kind: 'planned-carryover-start',
      graceDeadline: new Date(now.getTime() + CARRYOVER_GRACE_MS),
    };
  }
  if (log.graceDeadline.getTime() > now.getTime()) {
    return { kind: 'planned-carryover-active' };
  }
  return { kind: 'planned-expired' };
}

export interface RolloverResult {
  /** Log actif conservé pour l'user (carry-over). `null` = génération normale attendue. */
  carryoverLog: PrismaQuestLog | null;
  /** Indique si la streak a été remise à 0 par ce rollover. */
  streakReset: boolean;
  /** Logs traités (pour logging / observabilité). */
  decisions: Array<{ logId: string; decision: StaleLogDecision['kind'] }>;
}

export interface RolloverInput {
  profileId: string;
  today: string;
  taxonomy: QuestModel[];
  now: Date;
  prisma: PrismaClient;
}

/**
 * Applique le rollover sur tous les logs « stale » du profil (status pending/accepted
 * avec questDate < today).
 *
 * Appelé au début de GET /quest/daily, AVANT toute logique de cache/génération.
 *
 * Si plusieurs logs planned en carry-over actif existent simultanément (rare : absence longue),
 * on conserve le plus récent — les autres sont expirés.
 */
export async function rolloverStaleLogs(input: RolloverInput): Promise<RolloverResult> {
  const { profileId, today, taxonomy, now, prisma } = input;

  const staleLogs = await prisma.questLog.findMany({
    where: {
      profileId,
      status: { in: ['pending', 'accepted'] },
      questDate: { lt: today },
    },
    orderBy: { questDate: 'desc' },
  });

  if (staleLogs.length === 0) {
    return { carryoverLog: null, streakReset: false, decisions: [] };
  }

  const decisions: RolloverResult['decisions'] = [];
  let carryoverLog: PrismaQuestLog | null = null;
  let streakReset = false;

  // On traite du plus récent au plus ancien. Dès qu'un carry-over actif est trouvé,
  // on le conserve ; les autres logs stale sont soit terminés (pas de carry-over multiple),
  // soit de toute façon déjà gérés par leur propre règle (pending/instant).
  const profileStatusUpdates: Array<() => Promise<void>> = [];

  for (const log of staleLogs) {
    const archetype = findArchetypeById(taxonomy, log.archetypeId) ?? null;
    const decision = classifyStaleLog({ log, today, archetype, now });
    decisions.push({ logId: log.id, decision: decision.kind });

    switch (decision.kind) {
      case 'keep':
        break;

      case 'pending-rejected':
        profileStatusUpdates.push(async () => {
          await prisma.questLog.update({
            where: { id: log.id },
            data: { status: 'rejected' },
          });
        });
        break;

      case 'instant-abandoned':
      case 'planned-expired':
        streakReset = true;
        profileStatusUpdates.push(async () => {
          await prisma.questLog.update({
            where: { id: log.id },
            data: { status: 'abandoned' },
          });
        });
        break;

      case 'planned-carryover-start': {
        const graceDeadline = decision.graceDeadline;
        profileStatusUpdates.push(async () => {
          await prisma.questLog.update({
            where: { id: log.id },
            data: { graceDeadline },
          });
        });
        if (!carryoverLog) {
          carryoverLog = { ...log, graceDeadline };
        }
        break;
      }

      case 'planned-carryover-active':
        if (!carryoverLog) {
          carryoverLog = log;
        }
        break;
    }
  }

  await Promise.all(profileStatusUpdates.map((fn) => fn()));

  if (streakReset) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { streakCount: 0 } as Prisma.ProfileUpdateInput,
    });
  }

  return { carryoverLog, streakReset, decisions };
}
