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
  beforeEach(async () => {
    prismaMock.profile.findMany.mockReset();
    prismaMock.profile.update.mockReset();
    prismaMock.questLog.findUnique.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const { sendExpoPushMessages } = await import('@/lib/reminders/expo-push');
    vi.mocked(sendExpoPushMessages).mockClear();
    vi.mocked(sendExpoPushMessages).mockResolvedValue({ ok: true });
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

  it('minutes rappel invalides (<0) → skipped', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: -1,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        pushDevices: [],
      },
    ]);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:00:00.000Z'));
    expect(r.skipped).toBe(1);
    expect(r.checked).toBe(0);
  });

  it('minutes rappel invalides (>1439) → skipped', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 2000,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        pushDevices: [],
      },
    ]);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:00:00.000Z'));
    expect(r.skipped).toBe(1);
  });

  it('quête déjà complétée → skipped après checked', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 720,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        lastReminderPushDate: null,
        pushDevices: [{ expoPushToken: 'ExponentPushToken[x]' }],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue({ status: 'completed' });
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:05:00.000Z'));
    expect(r.checked).toBe(1);
    expect(r.skipped).toBe(1);
  });

  it('push envoyé dans la fenêtre de rappel', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 720,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        lastReminderPushDate: null,
        pushDevices: [{ expoPushToken: 'ExponentPushToken[t]' }],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    prismaMock.profile.update.mockResolvedValue({});
    const { sendExpoPushMessages } = await import('@/lib/reminders/expo-push');
    vi.mocked(sendExpoPushMessages).mockResolvedValue({ ok: true });
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:05:00.000Z'));
    expect(r.checked).toBe(1);
    expect(r.pushSent).toBe(1);
    expect(prismaMock.profile.update).toHaveBeenCalled();
  });

  it("push déjà envoyé aujourd'hui → pas de nouvel envoi", async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 720,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        lastReminderPushDate: '2026-06-01',
        pushDevices: [{ expoPushToken: 'ExponentPushToken[t]' }],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const { sendExpoPushMessages } = await import('@/lib/reminders/expo-push');
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:05:00.000Z'));
    expect(r.checked).toBe(1);
    expect(r.pushSent).toBe(0);
    expect(vi.mocked(sendExpoPushMessages)).not.toHaveBeenCalled();
  });

  it('date de quête = calendrier Paris (pas UTC)', async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'Europe/Paris',
        reminderTimeMinutes: 30,
        reminderPushEnabled: true,
        reminderEmailEnabled: false,
        lastReminderPushDate: null,
        pushDevices: [{ expoPushToken: 'ExponentPushToken[t]' }],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    prismaMock.profile.update.mockResolvedValue({});
    const { runDailyReminders } = await import('./run-daily-reminders');
    await runDailyReminders(new Date('2026-05-31T22:30:00.000Z'));
    expect(prismaMock.questLog.findUnique).toHaveBeenCalledWith({
      where: { profileId_questDate: { profileId: 'p1', questDate: '2026-06-01' } },
    });
  });

  it('email sans RESEND_API_KEY → skipped', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 720,
        reminderPushEnabled: false,
        reminderEmailEnabled: true,
        lastReminderEmailDate: null,
        pushDevices: [],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:05:00.000Z'));
    expect(r.checked).toBe(1);
    expect(r.skipped).toBeGreaterThanOrEqual(1);
  });

  it('email : utilisateur sans adresse → skipped', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const { clerkClient } = await import('@clerk/nextjs/server');
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          primaryEmailAddress: null,
          emailAddresses: [],
        }),
      },
    } as never);
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 720,
        reminderPushEnabled: false,
        reminderEmailEnabled: true,
        lastReminderEmailDate: null,
        pushDevices: [],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:05:00.000Z'));
    expect(r.checked).toBe(1);
    expect(r.skipped).toBeGreaterThanOrEqual(1);
  });

  it('email : erreur Clerk → skipped', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const { clerkClient } = await import('@clerk/nextjs/server');
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockRejectedValue(new Error('clerk')),
      },
    } as never);
    prismaMock.profile.findMany.mockResolvedValue([
      {
        id: 'p1',
        clerkId: 'c1',
        reminderTimezone: 'UTC',
        reminderTimeMinutes: 720,
        reminderPushEnabled: false,
        reminderEmailEnabled: true,
        lastReminderEmailDate: null,
        pushDevices: [],
      },
    ]);
    prismaMock.questLog.findUnique.mockResolvedValue(null);
    const { runDailyReminders } = await import('./run-daily-reminders');
    const r = await runDailyReminders(new Date('2026-06-01T12:05:00.000Z'));
    expect(r.checked).toBe(1);
    expect(r.skipped).toBeGreaterThanOrEqual(1);
  });
});
