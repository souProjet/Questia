/**
 * Fuseau IANA : vérifie qu’Intl accepte la valeur (sinon date invalide).
 */
export function isValidIanaTimeZone(tz: string): boolean {
  const s = tz.trim();
  if (!s) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s });
    return true;
  } catch {
    return false;
  }
}

/** Minutes depuis minuit dans `timeZone`, pour une Date donnée (instant UTC). */
export function minutesFromMidnightInZone(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/**
 * La quête du jour côté API utilise la date calendaire UTC (voir quest/daily).
 */
export function utcCalendarDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * True si l’instant `date` tombe dans la fenêtre [start, start+window) en fuseau `timeZone`
 * (prise en charge si la fenêtre dépasse minuit).
 */
export function isInReminderWindow(
  date: Date,
  timeZone: string,
  startMinutesFromMidnight: number,
  windowMinutes: number,
): boolean {
  const local = minutesFromMidnightInZone(date, timeZone);
  const start = startMinutesFromMidnight;
  const end = start + windowMinutes;
  if (end <= 24 * 60) {
    return local >= start && local < end;
  }
  const endMod = end % (24 * 60);
  return local >= start || local < endMod;
}
