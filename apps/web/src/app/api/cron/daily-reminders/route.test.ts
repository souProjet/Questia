import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const runDailyReminders = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ checked: 1, pushSent: 0, emailSent: 0, skipped: 0 }),
);

vi.mock('@/lib/reminders/run-daily-reminders', () => ({
  runDailyReminders,
}));

describe('GET /api/cron/daily-reminders', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    runDailyReminders.mockReset();
    runDailyReminders.mockResolvedValue({ checked: 1, pushSent: 0, emailSent: 0, skipped: 0 });
  });

  it('401 sans secret', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const req = new NextRequest('http://localhost/api/cron/daily-reminders', {
      headers: { authorization: 'Bearer x' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('401 mauvais bearer', async () => {
    vi.stubEnv('CRON_SECRET', 'secret');
    const req = new NextRequest('http://localhost/api/cron/daily-reminders', {
      headers: { authorization: 'Bearer wrong' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('200 avec secret et exécution', async () => {
    vi.stubEnv('CRON_SECRET', 'secret');
    const req = new NextRequest('http://localhost/api/cron/daily-reminders', {
      headers: { authorization: 'Bearer secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('500 si runDailyReminders lance', async () => {
    vi.stubEnv('CRON_SECRET', 'secret');
    runDailyReminders.mockRejectedValueOnce(new Error('boom'));
    const req = new NextRequest('http://localhost/api/cron/daily-reminders', {
      headers: { authorization: 'Bearer secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
