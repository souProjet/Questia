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
