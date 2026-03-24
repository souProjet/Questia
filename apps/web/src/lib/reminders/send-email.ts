import { Resend } from 'resend';

export async function sendReminderEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: 'RESEND_API_KEY manquant' };
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'Questia <onboarding@resend.dev>';
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
