import { getQuestCalendarDateForInstant } from '@questia/shared';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  isInReminderWindow,
  isValidIanaTimeZone,
  minutesFromMidnightInZone,
} from '@/lib/reminders/time';
import { sendExpoPushMessages } from '@/lib/reminders/expo-push';
import { sendReminderEmail } from '@/lib/reminders/send-email';

/** Fenêtre « serrée » autour de l’heure de rappel (défaut 45 min). Surcronter avec REMINDER_WINDOW_MINUTES (5–180). */
const DEFAULT_REMINDER_WINDOW_MINUTES = 45;

function resolveReminderWindowMinutes(): number {
  const raw = process.env.REMINDER_WINDOW_MINUTES;
  if (raw === undefined || raw === '') return DEFAULT_REMINDER_WINDOW_MINUTES;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_REMINDER_WINDOW_MINUTES;
  return Math.min(180, Math.max(5, n));
}

/**
 * Si REMINDER_LOOSE_AFTER_START=1 : tout instant le jour local (fuseau profil) après l’heure de rappel
 * est éligible (une seule notif / jour grâce à lastReminder*Date). Utile si le cron ne passe qu’une fois par jour (ex. Vercel Hobby).
 */
function isReminderEligible(
  now: Date,
  timeZone: string,
  startMinutesFromMidnight: number,
  windowMinutes: number,
): boolean {
  const loose =
    process.env.REMINDER_LOOSE_AFTER_START === '1' || process.env.REMINDER_LOOSE_AFTER_START === 'true';
  if (loose) {
    return minutesFromMidnightInZone(now, timeZone) >= startMinutesFromMidnight;
  }
  return isInReminderWindow(now, timeZone, startMinutesFromMidnight, windowMinutes);
}

const TITLE = 'Quête du jour';
const PUSH_BODY = "Ta quête t'attend sur Questia — ouvre l'app pour la découvrir.";

function buildEmailHtml(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `
  <p>Bonjour,</p>
  <p>C'est le moment de découvrir ta <strong>quête du jour</strong> sur Questia.</p>
  <p><a href="${base}/app">Ouvrir Questia</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">Tu reçois ce message car les rappels par e-mail sont activés dans ton profil. Tu peux les désactiver dans les paramètres.</p>
`;
}

export async function runDailyReminders(now: Date): Promise<{
  checked: number;
  pushSent: number;
  emailSent: number;
  skipped: number;
}> {
  const questCalendarDay = getQuestCalendarDateForInstant(now);
  const windowMinutes = resolveReminderWindowMinutes();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://questia.fr';

  const profiles = await prisma.profile.findMany({
    where: {
      OR: [{ reminderPushEnabled: true }, { reminderEmailEnabled: true }],
    },
    include: { pushDevices: true },
  });

  let checked = 0;
  let pushSent = 0;
  let emailSent = 0;
  let skipped = 0;

  const client = await clerkClient();

  for (const profile of profiles) {
    const tz = profile.reminderTimezone?.trim() || 'Europe/Paris';
    if (!isValidIanaTimeZone(tz)) {
      skipped++;
      continue;
    }

    const start = profile.reminderTimeMinutes ?? 540;
    if (start < 0 || start > 1439) {
      skipped++;
      continue;
    }

    if (!isReminderEligible(now, tz, start, windowMinutes)) {
      continue;
    }

    checked++;

    const log = await prisma.questLog.findUnique({
      where: { profileId_questDate: { profileId: profile.id, questDate: questCalendarDay } },
    });
    if (log?.status === 'completed') {
      skipped++;
      continue;
    }

    if (profile.reminderPushEnabled && profile.pushDevices.length > 0) {
      if (profile.lastReminderPushDate === questCalendarDay) {
        /* déjà envoyé */
      } else {
        const messages = profile.pushDevices.map((d) => ({
          to: d.expoPushToken,
          title: TITLE,
          body: PUSH_BODY,
          sound: 'default' as const,
        }));
        const result = await sendExpoPushMessages(messages);
        if (result.ok) {
          await prisma.profile.update({
            where: { id: profile.id },
            data: { lastReminderPushDate: questCalendarDay },
          });
          pushSent++;
        }
      }
    }

    if (profile.reminderEmailEnabled) {
      if (profile.lastReminderEmailDate === questCalendarDay) {
        /* déjà envoyé */
      } else {
        if (!process.env.RESEND_API_KEY) {
          skipped++;
        } else {
          try {
            const user = await client.users.getUser(profile.clerkId);
            const email =
              user.primaryEmailAddress?.emailAddress ??
              user.emailAddresses?.[0]?.emailAddress;
            if (!email) {
              skipped++;
            } else {
              const r = await sendReminderEmail(
                email,
                'Ta quête du jour sur Questia',
                buildEmailHtml(siteUrl),
              );
              if (r.ok) {
                await prisma.profile.update({
                  where: { id: profile.id },
                  data: { lastReminderEmailDate: questCalendarDay },
                });
                emailSent++;
              }
            }
          } catch {
            skipped++;
          }
        }
      }
    }
  }

  return { checked, pushSent, emailSent, skipped };
}
