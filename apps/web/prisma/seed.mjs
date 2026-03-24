/**
 * Seed dev : simule une progression avancée sur le premier profil (un seul compte).
 * Usage (depuis apps/web) : npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Tous les ids d’insignes (voir packages/shared/src/engine/badges.ts). */
const ALL_BADGE_IDS = [
  'phase_calibration_fin',
  'phase_expansion',
  'phase_rupture',
  'parcours_jour_21',
  'parcours_jour_30',
  'parcours_jour_60',
  'serie_3',
  'serie_7',
  'serie_14',
  'serie_30',
  'serie_60',
  'premiere_quete',
  'cinq_quetes',
  'dix_quetes',
  'quinze_quetes',
  'vingt_cinq_quetes',
  'cinquante_quetes',
  'cent_quetes',
  'premiere_exterieur',
  'exterieur_5',
  'exterieur_10',
  'exterieur_25',
  'exterieur_50',
  'quadrant_audacieux',
  'quadrant_explorer_prudent',
  'quadrant_homebody_prudent',
  'quadrant_homebody_risktaker',
];

function isoDateDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function phaseForJourneyDay(day) {
  if (day <= 3) return 'calibration';
  if (day <= 10) return 'expansion';
  return 'rupture';
}

async function main() {
  const profile = await prisma.profile.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!profile) {
    console.error('Aucun profil en base. Crée un compte + onboarding puis relance.');
    process.exit(1);
  }

  console.log(`Profil cible : ${profile.id} (clerk: ${profile.clerkId.slice(0, 12)}…)`);

  await prisma.questLog.deleteMany({ where: { profileId: profile.id } });

  const PAST_DAYS = 48;
  const outdoorArchetypes = new Set([1, 2, 3, 4, 5, 10, 11]);

  for (let i = 1; i <= PAST_DAYS; i++) {
    const questDate = isoDateDaysAgo(i);
    const journeyDay = Math.max(1, 52 - i);
    const phase = phaseForJourneyDay(journeyDay);
    const archetypeId = (i % 13) + 1;
    const isOutdoor = outdoorArchetypes.has(archetypeId) || i % 4 === 0;
    const wasRerolled = i === 12 || i === 33;
    const wasFallback = i === 7;

    await prisma.questLog.create({
      data: {
        profileId: profile.id,
        questDate,
        archetypeId,
        generatedEmoji: ['⚔️', '🌿', '🧭', '🔥', '✨'][i % 5],
        generatedTitle: `Aventure du ${questDate}`,
        generatedMission: 'Mission simulée (seed dev) — exploration et dépassement.',
        generatedHook: 'Chaque jour compte.',
        generatedDuration: '25 min',
        isOutdoor,
        status: 'completed',
        completedAt: new Date(`${questDate}T18:30:00.000Z`),
        phaseAtAssignment: phase,
        congruenceDeltaAtTime: 0.12 + (i % 10) * 0.02,
        wasRerolled,
        wasFallback,
        xpAwarded: 35 + (i % 40),
        locationCity: 'Paris',
        weatherDescription: 'Nuageux',
        weatherTemp: 16 + (i % 8),
      },
    });
  }

  const now = new Date();
  const badgeBase = new Date(now);
  const badgesEarned = ALL_BADGE_IDS.map((id, idx) => {
    const u = new Date(badgeBase);
    u.setDate(u.getDate() - (ALL_BADGE_IDS.length - idx) * 2 - 1);
    return { id, unlockedAt: u.toISOString() };
  });

  const lastQuestDate = isoDateDaysAgo(1);
  const currentDay = 52;
  const streakCount = 41;
  const totalXp = 5840;

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      currentDay,
      currentPhase: 'rupture',
      streakCount,
      lastQuestDate,
      totalXp,
      badgesEarned,
      congruenceDelta: 0.28,
      rerollsRemaining: 1,
      flagNextQuestAfterReroll: false,
    },
  });

  console.log(
    `OK — ${PAST_DAYS} quêtes complétées (historique), jour ${currentDay}, série ${streakCount}, ${totalXp} XP, ${ALL_BADGE_IDS.length} insignes.`,
  );
  console.log(
    `last_quest_date = ${lastQuestDate} → la prochaine ouverture d’app peut générer la quête d’aujourd’hui.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
