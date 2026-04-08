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

export function getQuestCalendarDateNow(): string {
  return calendarDateInTimeZone(new Date(), QUEST_CALENDAR_TIMEZONE);
}
