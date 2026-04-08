/**
 * Deep links et URLs de partage cohérents entre web (Next `/app`) et mobile (scheme + universal links).
 */

import { getTitleDefinition } from './shop/titles';

/** Clés de query reconnues par l'API `/api/quest/daily` et les pages app. */
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
 * URL web canonique pour ouvrir l'app sur une quête (jour donné ou aujourd'hui sans query).
 * @param baseUrl Origine sans slash final (ex. https://questia.fr)
 */
export function buildWebAppQuestUrl(baseUrl: string, questDate?: string | null): string {
  const base = baseUrl.replace(/\/$/, '');
  if (!questDate || !isValidQuestDateIso(questDate)) return `${base}/app`;
  return `${base}/app?questDate=${encodeURIComponent(questDate)}`;
}

/**
 * URL web publique d'une carte partagée (id public non prédictible).
 * @param baseUrl Origine sans slash final (ex. https://questia.fr)
 */
export function buildWebSharedQuestUrl(baseUrl: string, shareId: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const id = shareId.trim();
  return `${base}/q/${encodeURIComponent(id)}`;
}

/**
 * Lien custom scheme (Expo) vers la route `app` avec paramètres — ouvert par l'app native.
 * @param scheme Sans « :// » (ex. questia)
 */
export function buildNativeAppQuestUrl(scheme: string, questDate?: string | null): string {
  const s = scheme.replace(/:?$/, '').replace(/\/$/, '');
  if (!questDate || !isValidQuestDateIso(questDate)) return `${s}://app`;
  return `${s}://app?questDate=${encodeURIComponent(questDate)}`;
}

/** Ligne « titre boutique » pour carte / texte de partage (null si pas équipé ou inconnu). */
export function formatQuestShareEquippedTitleLine(
  equippedTitleId: string | null | undefined,
): string | null {
  if (!equippedTitleId) return null;
  const d = getTitleDefinition(equippedTitleId);
  if (!d) return null;
  return `${d.emoji} ${d.label}`;
}

/** Ligne niveau + XP totaux pour carte / texte de partage. */
export function formatQuestShareProgressionLine(
  p: { level: number; totalXp: number },
  locale: 'fr' | 'en' = 'fr',
): string {
  const nLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
  const num = p.totalXp.toLocaleString(nLocale);
  if (locale === 'en') return `Lv. ${p.level} · ${num} XP`;
  return `Nv. ${p.level} · ${num} XP`;
}

/** Texte de partage court + URL (messageries, presse-papiers). */
export function buildQuestShareMessage(opts: {
  title: string;
  webUrl: string;
  equippedTitleLine?: string | null;
  progressionLine?: string | null;
}): string {
  const lines: string[] = [opts.title];
  if (opts.equippedTitleLine?.trim()) lines.push(opts.equippedTitleLine.trim());
  if (opts.progressionLine?.trim()) lines.push(opts.progressionLine.trim());
  lines.push(opts.webUrl);
  return lines.join('\n');
}
