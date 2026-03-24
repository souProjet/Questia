import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  profile: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  questLog: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        primaryEmailAddress: { emailAddress: 'u@test.dev' },
        emailAddresses: [],
      }),
    },
  }),
}));

vi.mock('@/lib/reminders/expo-push', () => ({
  sendExpoPushMessages: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/reminders/send-email', () => ({
  sendReminderEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

describe('runDailyReminders', () => {
  beforeEach(() => {
    prismaMock.profile.findMany.mockReset();
    prismaMock.profile.update.mockReset();
    prismaMock.questLog.findUnique.mockReset();
    vi.stubEnv('RESEND_API_KEY', 're_test');
  });

  it('aucun profil', async () => {
    prismaMock.profile.findMany.mockResolvedValue([]);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:00:00.000Z'));
    expect(r).toEqual({ checked: 0, pushSent: 0, emailSent: 0, skipped: 0 });
  });

  it('fuseau invalide → skipped', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'Not/AZone',
        reminderTimeMinutes: 720,
        reminderPushEnabled: false,
        reminderEmailEnabled: false,
        pushDevices: [],
      },
    ]);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:00:00.000Z'));
    expect(r.skipped).toBe(1);
  });

  it('heure rappel hors plage → pas checked', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 600,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        lastReminderPushDate: null,
        pushDevices: [{ expoPushToken: 'ExponentPushToken[x]' }],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:00:00.000Z'));
    expect(r.checked).toBe(0);
  });
});
