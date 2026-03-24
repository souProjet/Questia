import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('sendReminderEmail', () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.unstubAllEnvs();
  });

  it('échoue sans RESEND_API_KEY', async () => {
    const { sendReminderEmail } = await import('./send-email');
    const r = await sendReminderEmail('a@b.com', 's', '<p>x</p>');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/RESEND/);
  });

  it('réussit quand Resend ne renvoie pas d’erreur', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    sendMock.mockResolvedValue({ error: null });
    const { sendReminderEmail } = await import('./send-email');
    const r = await sendReminderEmail('a@b.com', 's', '<p>x</p>');
    expect(r.ok).toBe(true);
    expect(sendMock).toHaveBeenCalled();
  });

  it('propage l’erreur Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    sendMock.mockResolvedValue({ error: { message: 'boom' } });
    const { sendReminderEmail } = await import('./send-email');
    const r = await sendReminderEmail('a@b.com', 's', '<p>x</p>');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('boom');
  });
});
