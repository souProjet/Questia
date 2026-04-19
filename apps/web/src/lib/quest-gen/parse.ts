import type { QuestModel } from '@questia/shared';
import { clampToOneSentence } from './validation';
import { QUEST_ICON_ALLOWLIST, type GeneratedQuest } from './types';

/**
 * Parse + normalise la réponse JSON brute du LLM.
 * Renvoie un GeneratedQuest brut (encore à valider) ou jette si le JSON est totalement HS.
 */
export function parseGeneratedJson(
  raw: string,
  archetypesById: Map<number, QuestModel>,
  computedIsOutdoor: boolean,
): GeneratedQuest {
  const data = JSON.parse(raw) as Record<string, unknown>;

  const archetypeId = toNumber(data.archetypeId);
  if (archetypeId === null) {
    throw new Error('archetypeId missing or not a number');
  }
  const archetype = archetypesById.get(archetypeId);

  const iconRaw = typeof data.icon === 'string' ? data.icon.trim() : '';
  const icon = QUEST_ICON_ALLOWLIST.has(iconRaw) ? iconRaw : 'Target';

  const title = (typeof data.title === 'string' ? data.title : '').trim();
  const missionRaw = (typeof data.mission === 'string' ? data.mission : '').trim();
  const mission = clampToOneSentence(missionRaw);
  const hook = (typeof data.hook === 'string' ? data.hook : '').trim();
  const duration = (typeof data.duration === 'string' ? data.duration : '').trim()
    || (archetype ? `${archetype.minimumDurationMinutes} min` : '30 min');

  const isOutdoorRaw = data.isOutdoor;
  const isOutdoor = computedIsOutdoor && isOutdoorRaw === true;

  const safetyNote = typeof data.safetyNote === 'string' && data.safetyNote.trim()
    ? data.safetyNote.trim()
    : null;

  const destinationLabel = isOutdoor && typeof data.destinationLabel === 'string'
    ? data.destinationLabel.trim() || null
    : null;
  const destinationQuery = isOutdoor && typeof data.destinationQuery === 'string'
    ? data.destinationQuery.trim() || null
    : null;

  const selectionReason = typeof data.selectionReason === 'string' && data.selectionReason.trim()
    ? data.selectionReason.trim()
    : null;
  const selfFitScore = toNumber(data.selfFitScore);

  return {
    archetypeId,
    icon,
    title,
    mission,
    hook,
    duration,
    isOutdoor,
    safetyNote,
    destinationLabel,
    destinationQuery,
    selectionReason,
    selfFitScore: selfFitScore !== null ? Math.max(0, Math.min(100, selfFitScore)) : null,
    wasFallback: false,
  };
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Si la mission n'inclut pas la ville mais devrait, on la suffixe (sauvetage léger). */
export function ensureCityInMission(mission: string, city: string | null): string {
  if (!city || city.length < 3) return mission;
  if (/^ta ville$|^your city$/i.test(city)) return mission;
  if (mission.toLowerCase().includes(city.toLowerCase())) return mission;
  if (!mission) return mission;
  const base = mission.replace(/\s*[.!?]+\s*$/, '').trim();
  return `${base} — à ${city}.`;
}
