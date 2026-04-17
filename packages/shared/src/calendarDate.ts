/**
 * Date civile YYYY-MM-DD dans un fuseau IANA — alignée sur le journal de quête / liens de partage.
 */
export function calendarDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Fuseau utilisé pour « aujourd'hui » côté API et affichage (questia.fr). */
export const QUEST_CALENDAR_TIMEZONE = 'Europe/Paris';

/** Date civile de la quête du jour pour un instant donné (alignée sur l’API `/api/quest/daily`). */
export function getQuestCalendarDateForInstant(date: Date): string {
  return calendarDateInTimeZone(date, QUEST_CALENDAR_TIMEZONE);
}

export function getQuestCalendarDateNow(): string {
  return getQuestCalendarDateForInstant(new Date());
}

/**
 * Retourne la date civile (YYYY-MM-DD) obtenue en soustrayant `days` jours à
 * une date calendaire donnée, dans le fuseau quête (Europe/Paris). Les calculs
 * naïfs avec `toISOString()` peuvent dériver de ±1 jour au passage de minuit
 * Paris (UTC+1 / +2) — cette helper reste cohérente avec `getQuestCalendarDateNow`.
 */
export function subtractCalendarDays(dateIso: string, days: number): string {
  // Parse YYYY-MM-DD comme une date « midi UTC » pour éviter les décalages de fuseau
  // lors de la soustraction, puis reformatte dans le fuseau quête.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!m) throw new Error(`subtractCalendarDays: invalid date '${dateIso}'`);
  const [, y, mo, d] = m;
  const utcMidday = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 12, 0, 0));
  utcMidday.setUTCDate(utcMidday.getUTCDate() - days);
  return calendarDateInTimeZone(utcMidday, QUEST_CALENDAR_TIMEZONE);
}

/** Alias pratique pour la quête d'hier (utilisé par le calcul de streak). */
export function getPreviousQuestCalendarDate(dateIso: string): string {
  return subtractCalendarDays(dateIso, 1);
}
