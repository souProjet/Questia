/**
 * Textes de chargement pour l’écran d’accueil quête (web + mobile).
 * Déterministes par date ISO + contexte (première ouverture calendaire du jour vs reprise).
 */

/** Clé partagée web (localStorage) et mobile (AsyncStorage) pour savoir si l’app a déjà été ouverte aujourd’hui. */
export const QUEST_LOADER_DAY_STORAGE_KEY = 'questia_loader_day_opened';

export type QuestLoaderSession = 'first-today' | 'returning-today';

const PRIMARY_FIRST_TODAY = [
  'Nous préparons ta quête du jour',
  'Ta première ouverture du jour — on compose ta carte…',
  'Bienvenue sur ta session du jour — un instant…',
  'On assemble ta mission sur mesure pour aujourd’hui…',
  'Ta carte du jour prend forme…',
  'Un instant : on calque tout sur ton profil',
  'Presque prêt — on choisit le bon rythme pour toi',
] as const;

const SECONDARY_FIRST_TODAY = [
  'Météo, lieux, ton style — tout s’aligne.',
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
  'Encore un instant — comme tout à l’heure, en plus fluide.',
  'Synchronisation…',
  'On met à jour ta mission du jour…',
  'Presque là — ta session reprend.',
  'Un dernier coup de polish…',
] as const;

const SECONDARY_RETURNING = [
  'Tu as déjà ouvert l’app aujourd’hui — souvent plus rapide.',
  'Le cache est chaud : ça peut aller vite.',
  'Si tu viens de recharger la page, c’est normal.',
  'Même jour, même énergie — on finalise.',
  'Quelques secondes suffisent souvent.',
  'Rien à refaire de ton côté.',
  'On garde le même rythme pour ta journée.',
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
 */
export function getDailyQuestLoadingLines(
  isoDate?: string,
  session: QuestLoaderSession = 'first-today',
): { primary: string; secondary: string } {
  const day =
    typeof isoDate === 'string' && isIsoDate(isoDate) ? isoDate : new Date().toISOString().slice(0, 10);
  const seed = daySeed(day);
  const first = session === 'first-today';
  const primaries = first ? PRIMARY_FIRST_TODAY : PRIMARY_RETURNING;
  const secondaries = first ? SECONDARY_FIRST_TODAY : SECONDARY_RETURNING;
  const pi = ((seed % primaries.length) + primaries.length) % primaries.length;
  const si = ((seed * 7 + 13) % secondaries.length + secondaries.length) % secondaries.length;
  return {
    primary: primaries[pi],
    secondary: secondaries[si],
  };
}
