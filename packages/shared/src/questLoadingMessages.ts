/**
 * Textes de chargement pour l'écran d'accueil quête (web + mobile).
 * Déterministes par date ISO + contexte (première ouverture calendaire du jour vs reprise).
 */

import type { AppLocale } from './types';

/** Clé partagée web (localStorage) et mobile (AsyncStorage) pour savoir si l'app a déjà été ouverte aujourd'hui. */
export const QUEST_LOADER_DAY_STORAGE_KEY = 'questia_loader_day_opened';

export type QuestLoaderSession = 'first-today' | 'returning-today';

const PRIMARY_FIRST_TODAY = [
  'Nous préparons ta quête du jour',
  'Ta première ouverture du jour — on compose ta carte…',
  'Bienvenue sur ta session du jour — un instant…',
  "On assemble ta mission sur mesure pour aujourd'hui…",
  'Ta carte du jour prend forme…',
  'Un instant : on calque tout sur ton profil',
  'Presque prêt — on choisit le bon rythme pour toi',
] as const;

const SECONDARY_FIRST_TODAY = [
  "Météo, lieux, ton style — tout s'aligne.",
  'Ton parcours et tes préférences guident la carte.',
  'Au premier chargement de la journée, ça peut prendre un peu plus de temps.',
  'Chaque jour, une carte différente.',
  'On évite les quêtes déconnectées de ta réalité.',
  'Encore un instant…',
  'On évite la monotonie, pas la simplicité.',
] as const;

const PRIMARY_RETURNING = [
  'On recharge ta quête du jour…',
  'Retour sur ta carte — presque prêt.',
  "Encore un instant — comme tout à l'heure, en plus fluide.",
  'Synchronisation…',
  'On met à jour ta mission du jour…',
  'Presque là — ta session reprend.',
  'Un dernier coup de polish…',
] as const;

const SECONDARY_RETURNING = [
  "Tu as déjà ouvert l'app aujourd'hui — souvent plus rapide.",
  'Le cache est chaud : ça peut aller vite.',
  "Si tu viens de recharger la page, c'est normal.",
  'Même jour, même énergie — on finalise.',
  'Quelques secondes suffisent souvent.',
  'Rien à refaire de ton côté.',
  'On garde le même rythme pour ta journée.',
] as const;

const PRIMARY_FIRST_TODAY_EN = [
  'Preparing your quest for today',
  'First open of the day — building your card…',
  "Welcome to today's session — one moment…",
  'Assembling your tailored mission for today…',
  'Your daily card is taking shape…',
  "One moment: we're aligning everything to your profile",
  'Almost ready — picking the right pace for you',
] as const;

const SECONDARY_FIRST_TODAY_EN = [
  'Weather, places, your style — all lining up.',
  'Your journey and preferences guide the card.',
  'First load of the day can take a bit longer.',
  'Every day, a different card.',
  'We keep quests grounded in your reality.',
  'Just a moment…',
  'We avoid monotony, not simplicity.',
] as const;

const PRIMARY_RETURNING_EN = [
  'Reloading your quest for today…',
  'Back to your card — almost there.',
  'One more moment — smoother than earlier.',
  'Syncing…',
  "Updating today's mission…",
  'Almost there — your session continues.',
  'One last polish…',
] as const;

const SECONDARY_RETURNING_EN = [
  'You already opened the app today — often quicker.',
  'Warm cache: it can be fast.',
  "If you just refreshed the page, that's normal.",
  'Same day, same energy — finishing up.',
  'A few seconds is often enough.',
  'Nothing to redo on your side.',
  'Keeping the same rhythm for your day.',
] as const;

function daySeed(isoDay: string): number {
  const parts = isoDay.split('-').map(Number);
  if (parts.length !== 3) return 0;
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
  return y * 372 + m * 31 + d;
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Déduit le contexte à partir de la dernière date enregistrée (jour calendaire client).
 */
export function resolveQuestLoaderSession(
  lastOpenedDay: string | null | undefined,
  todayIso: string,
): QuestLoaderSession {
  return lastOpenedDay === todayIso ? 'returning-today' : 'first-today';
}

/**
 * @param isoDate - Date ISO `YYYY-MM-DD` pour la rotation des variantes (optionnel)
 * @param session - Première ouverture du jour calendaire vs reprise (défaut : `first-today`)
 * @param locale - Langue d'affichage (défaut : `fr`)
 */
export function getDailyQuestLoadingLines(
  isoDate?: string,
  session: QuestLoaderSession = 'first-today',
  locale: AppLocale = 'fr',
): { primary: string; secondary: string } {
  const day =
    typeof isoDate === 'string' && isIsoDate(isoDate) ? isoDate : new Date().toISOString().slice(0, 10);
  const seed = daySeed(day);
  const first = session === 'first-today';
  const en = locale === 'en';
  const primaries = first
    ? en
      ? PRIMARY_FIRST_TODAY_EN
      : PRIMARY_FIRST_TODAY
    : en
      ? PRIMARY_RETURNING_EN
      : PRIMARY_RETURNING;
  const secondaries = first
    ? en
      ? SECONDARY_FIRST_TODAY_EN
      : SECONDARY_FIRST_TODAY
    : en
      ? SECONDARY_RETURNING_EN
      : SECONDARY_RETURNING;
  const pi = ((seed % primaries.length) + primaries.length) % primaries.length;
  const si = ((seed * 7 + 13) % secondaries.length + secondaries.length) % secondaries.length;
  return {
    primary: primaries[pi],
    secondary: secondaries[si],
  };
}
