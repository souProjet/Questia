import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { sendExpoPushMessages, type ExpoPushMessage } from '@/lib/reminders/expo-push';
import { sendReminderEmail } from '@/lib/reminders/send-email';

const EXPO_CHUNK = 80;
const CLERK_CHUNK = 25;

function escapeHtmlForBroadcast(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type BroadcastPushResult = {
  ok: true;
  kind: 'push';
  devices: number;
  batches: number;
  errors?: string[];
};

export type BroadcastEmailResult = {
  ok: true;
  kind: 'email';
  recipients: number;
  sent: number;
  failed: number;
  lastError?: string;
};

export async function runBroadcastPush(title: string, body: string): Promise<BroadcastPushResult> {
  const rows = await prisma.pushDevice.findMany({ select: { expoPushToken: true } });
  const unique = [...new Set(rows.map((r) => r.expoPushToken).filter(Boolean))];
  const messages: ExpoPushMessage[] = unique.map((to) => ({
    to,
    title,
    body,
    sound: 'default' as const,
  }));
  const errors: string[] = [];
  let batches = 0;
  for (let i = 0; i < messages.length; i += EXPO_CHUNK) {
    batches++;
    const chunk = messages.slice(i, i + EXPO_CHUNK);
    const r = await sendExpoPushMessages(chunk);
    if (!r.ok && r.errors?.length) errors.push(...r.errors);
  }
  return {
    ok: true,
    kind: 'push',
    devices: unique.length,
    batches,
    errors: errors.length ? errors : undefined,
  };
}

export async function runBroadcastEmail(subject: string, innerHtml: string): Promise<BroadcastEmailResult> {
  const profiles = await prisma.profile.findMany({ select: { clerkId: true } });
  const client = await clerkClient();
  const emails = new Set<string>();

  for (let i = 0; i < profiles.length; i += CLERK_CHUNK) {
    const slice = profiles.slice(i, i + CLERK_CHUNK);
    const resolved = await Promise.all(
      slice.map(async (p) => {
        try {
          const u = await client.users.getUser(p.clerkId);
          const em =
            u.primaryEmailAddress?.emailAddress ?? u.emailAddresses?.[0]?.emailAddress ?? null;
          return em ? em.trim().toLowerCase() : null;
        } catch {
          return null;
        }
      }),
    );
    for (const em of resolved) {
      if (em) emails.add(em);
    }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://questia.fr').replace(/\/$/, '');
  const html = `${innerHtml}<p style="color:#64748b;font-size:12px;margin-top:24px">Message d’information envoyé à tous les comptes Questia. — <a href="${siteUrl}/app">Ouvrir Questia</a></p>`;

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;
  for (const to of emails) {
    const r = await sendReminderEmail(to, subject, html);
    if (r.ok) sent++;
    else {
      failed++;
      lastError = r.error;
    }
  }

  return {
    ok: true,
    kind: 'email',
    recipients: emails.size,
    sent,
    failed,
    lastError,
  };
}

export function buildBroadcastEmailInner(rawHtml: string, rawText: string): { ok: true; html: string } | { ok: false; error: string } {
  const html = rawHtml.trim();
  const text = rawText.trim();
  if (html) {
    if (html.length > 40_000) return { ok: false, error: 'Corps HTML trop long (max 40 000 caractères).' };
    return { ok: true, html };
  }
  if (text) {
    if (text.length > 20_000) return { ok: false, error: 'Corps texte trop long (max 20 000 caractères).' };
    return { ok: true, html: `<p>${escapeHtmlForBroadcast(text).replace(/\r\n|\n|\r/g, '<br/>')}</p>` };
  }
  return { ok: false, error: 'Fournis emailHtml ou emailText.' };
}
