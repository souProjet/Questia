/**
 * Deep links et URLs de partage cohérents entre web (Next `/app`) et mobile (scheme + universal links).
 */

/** Clés de query reconnues par l’API `/api/quest/daily` et les pages app. */
export const QUEST_DATE_QUERY_KEYS = ['questDate', 'date'] as const;

export function isValidQuestDateIso(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const t = new Date(y, mo - 1, d);
  return t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === d;
}

/**
 * URL web canonique pour ouvrir l’app sur une quête (jour donné ou aujourd’hui sans query).
 * @param baseUrl Origine sans slash final (ex. https://questia.fr)
 */
export function buildWebAppQuestUrl(baseUrl: string, questDate?: string | null): string {
  const base = baseUrl.replace(/\/$/, '');
  if (!questDate || !isValidQuestDateIso(questDate)) return `${base}/app`;
  return `${base}/app?questDate=${encodeURIComponent(questDate)}`;
}

/**
 * Lien custom scheme (Expo) vers la route `app` avec paramètres — ouvert par l’app native.
 * @param scheme Sans « :// » (ex. questia)
 */
export function buildNativeAppQuestUrl(scheme: string, questDate?: string | null): string {
  const s = scheme.replace(/:?$/, '').replace(/\/$/, '');
  if (!questDate || !isValidQuestDateIso(questDate)) return `${s}://app`;
  return `${s}://app?questDate=${encodeURIComponent(questDate)}`;
}

/** Texte de partage court + URL (messageries, presse-papiers). */
export function buildQuestShareMessage(opts: {
  title: string;
  webUrl: string;
}): string {
  return `${opts.title}\n${opts.webUrl}`;
}
