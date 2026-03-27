/** Réponse GET /api/admin/overview (structure partagée console / stats). */
export type OverviewJson = {
  generatedAt: string;
  todayUtc: string;
  adminClerkIdSuffix: string;
  snapshotScope: 'self' | 'target';
  snapshotLabel: string | null;
  snapshotClerkSuffix: string | null;
  snapshot: {
    profileId: string;
    streak: number;
    totalXp: number;
    currentDay: number;
    phase: string;
    congruenceDelta: number;
    xpBonusCharges: number;
    explorerAxis: string;
    riskAxis: string;
    coins: number;
    rerollsDaily: number;
    rerollsBonus: number;
    lastQuestDate: string | null;
    activeThemeId: string;
    activeNarrationPackId: string | null;
    refinementSchemaVersion: number;
    reminderPushEnabled: boolean;
    reminderEmailEnabled: boolean;
    reminderTimeMinutes: number;
    reminderTimezone: string;
    flags: {
      nextAfterReroll: boolean;
      nextInstantOnly: boolean;
      deferredSocialUntil: string | null;
    };
    questToday: { status: string; archetypeId: number; questDate: string; wasRerolled: boolean } | null;
  };
  totalProfiles: number;
  profilesLast7Days: number;
  questLogsForToday: number;
  completedToday: number;
  totalCompletedQuests: number;
  totalCoinsInEconomy: number;
  shopTransactionsCount: number;
  pushDevicesCount: number;
  adminProfilesCount: number;
  questStatusToday: Record<string, number>;
};
