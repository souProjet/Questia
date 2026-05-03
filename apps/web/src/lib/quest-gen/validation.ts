import type { AppLocale, PsychologicalCategory, QuestModel } from '@questia/shared';
import {
  HOOK_MAX_WORDS,
  HOOK_MIN_CHARS,
  MISSION_MAX_CHARS,
  MISSION_MAX_WORDS,
  QUEST_ICON_ALLOWLIST,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
  type ParsedGenerationBody,
} from './types';

/**
 * Garde-fous de validation : strict mais ciblé sur ce qui rend les quêtes mauvaises.
 *
 * Différence majeure vs ancien système : on ne valide PAS l'absence de "future self"
 * ou "réfléchis à ta vie" — ces patterns sont gérés en amont par le prompt système clair.
 * Si le LLM les produit, on retry une fois ; sinon on accepte (mieux qu'un fallback fade).
 */
export type ValidationResult = { ok: true } | { ok: false; reason: string };

const VAGUE_FR = ['réfléchis à ta vie', 'médite sur ta vie', 'prends le temps de réfléchir à ta vie'];
const VAGUE_EN = ['reflect on your life', 'meditate on your life', 'take time to think about your life'];
const META_FR = ['ton toi de demain', 'le toi du futur', "le toi d'après", 'ton autre toi'];
const META_EN = ['your future self', 'your tomorrow self', 'the you of next year'];

/** Indice d'une mission qui impose un achat (à rejeter côté validation). */
function hasMandatoryPurchaseWording(text: string, locale: AppLocale): boolean {
  const t = text.toLowerCase();
  if (locale === 'en') {
    return (
      /\bmandatory\s+purchase\b/i.test(t) ||
      /\brequired\s+purchase\b/i.test(t) ||
      /\bminimum\s+spend\s+(?:required|mandatory)\b/i.test(t) ||
      /\byou\s+must\s+(?:buy|purchase)\s+(?:at least|something|an item|goods)\b/i.test(t) ||
      /\bmust\s+buy\s+(?:something|at least|goods|an item)\b/i.test(t)
    );
  }
  return (
    /achat\s+obligatoire/i.test(t) ||
    /obligation\s+d['']?acheter/i.test(t) ||
    /tu\s+dois\s+forcément\s+acheter/i.test(t) ||
    /vous\s+devez\s+obligatoirement\s+acheter/i.test(t) ||
    /dépense\s+obligatoire/i.test(t) ||
    /minimum\s+(?:d['']?)?achat/i.test(t)
  );
}

/**
 * Vérifie que l'archétype résolu pour la BDD appartient bien à la taxonomie et à la famille attendue.
 */
export function validateResolvedArchetype(
  archetype: QuestModel,
  expectedCategory: PsychologicalCategory,
  taxonomyIds: Set<number>,
  locale: AppLocale,
): ValidationResult {
  const en = locale === 'en';
  if (!taxonomyIds.has(archetype.id)) {
    return {
      ok: false,
      reason: en
        ? 'resolved archetype id is not in the current taxonomy'
        : "l'identifiant d'archétype résolu n'appartient pas à la taxonomie courante",
    };
  }
  if (archetype.category !== expectedCategory) {
    return {
      ok: false,
      reason: en
        ? `resolved archetype category "${archetype.category}" does not match engine family "${expectedCategory}"`
        : `catégorie de l'archétype résolu "${archetype.category}" ≠ famille moteur "${expectedCategory}"`,
    };
  }
  return { ok: true };
}

export function validateGenerated(
  parsed: ParsedGenerationBody,
  enginePrimaryCategory: PsychologicalCategory,
  locale: AppLocale,
  contextCity: string | null,
  computedIsOutdoor: boolean,
): ValidationResult {
  const en = locale === 'en';

  if (parsed.psychologicalCategory !== enginePrimaryCategory) {
    return {
      ok: false,
      reason: en
        ? `psychologicalCategory must be "${enginePrimaryCategory}" (engine brief)`
        : `psychologicalCategory doit être "${enginePrimaryCategory}" (consigne moteur)`,
    };
  }

  if (!QUEST_ICON_ALLOWLIST.has(parsed.icon)) {
    return {
      ok: false,
      reason: en ? `icon "${parsed.icon}" not in allowlist` : `icon "${parsed.icon}" hors liste`,
    };
  }

  const title = parsed.title.trim();
  if (title.length < TITLE_MIN_CHARS || title.length > TITLE_MAX_CHARS) {
    return {
      ok: false,
      reason: en ? 'title length out of bounds' : 'longueur de titre invalide',
    };
  }

  const mission = parsed.mission.trim();
  if (!mission) {
    return { ok: false, reason: en ? 'mission empty' : 'mission vide' };
  }
  if (/\r|\n/.test(mission)) {
    return {
      ok: false,
      reason: en ? 'mission must be one line' : 'mission : une seule ligne',
    };
  }
  if (countSentences(mission) > 1) {
    return {
      ok: false,
      reason: en ? 'mission must be a single sentence' : 'mission : une seule phrase',
    };
  }
  if (/\s;\s/.test(mission)) {
    return {
      ok: false,
      reason: en ? 'mission: no semicolon between two orders' : 'mission : pas de point-virgule entre deux ordres',
    };
  }
  if (mission.length > MISSION_MAX_CHARS) {
    return {
      ok: false,
      reason: en ? `mission too long (>${MISSION_MAX_CHARS} chars)` : `mission trop longue (>${MISSION_MAX_CHARS} caractères)`,
    };
  }
  if (mission.split(/\s+/).filter(Boolean).length > MISSION_MAX_WORDS) {
    return {
      ok: false,
      reason: en ? `mission too long (>${MISSION_MAX_WORDS} words)` : `mission trop longue (>${MISSION_MAX_WORDS} mots)`,
    };
  }

  const lowerMission = mission.toLowerCase();
  const vague = en ? VAGUE_EN : VAGUE_FR;
  for (const v of vague) {
    if (lowerMission.includes(v)) {
      return {
        ok: false,
        reason: en
          ? 'mission too vague (avoid pure life-reflection)'
          : 'mission trop vague (évite la pure introspection sur "ta vie")',
      };
    }
  }
  const meta = en ? META_EN : META_FR;
  for (const m of meta) {
    if (lowerMission.includes(m)) {
      return {
        ok: false,
        reason: en
          ? 'no "future self" alter-ego framing'
          : 'pas de framing "autre toi" / "futur toi"',
      };
    }
  }

  const combinedEconomyCheck = `${parsed.title}\n${parsed.mission}\n${parsed.hook}`;
  if (hasMandatoryPurchaseWording(combinedEconomyCheck, locale)) {
    return {
      ok: false,
      reason: en
        ? 'mission must not require spending money (no mandatory purchase)'
        : 'mission sans achat obligatoire ni dépense minimale imposée',
    };
  }

  const hook = parsed.hook.trim();
  if (hook.length < HOOK_MIN_CHARS) {
    return { ok: false, reason: en ? 'hook too short' : 'hook trop court' };
  }
  if (hook.split(/\s+/).filter(Boolean).length > HOOK_MAX_WORDS) {
    return {
      ok: false,
      reason: en ? `hook too long (>${HOOK_MAX_WORDS} words)` : `hook trop long (>${HOOK_MAX_WORDS} mots)`,
    };
  }

  // Outdoor consistency
  if (computedIsOutdoor && parsed.isOutdoor) {
    const label = (parsed.destinationLabel ?? '').trim();
    const query = (parsed.destinationQuery ?? '').trim();
    if (label.length < 2 || query.length < 6) {
      return {
        ok: false,
        reason: en
          ? 'outdoor quest needs destinationLabel and destinationQuery'
          : 'quête extérieure : destinationLabel et destinationQuery requis',
      };
    }
    if (/^null$|^undefined$|^place name$|^lieu$|^nom du lieu$|^lieu de la quête$/i.test(label)) {
      return {
        ok: false,
        reason: en
          ? 'destinationLabel must be a real place name, not a placeholder'
          : 'destinationLabel doit être le nom réel du lieu, pas un placeholder',
      };
    }
  }

  // Social consistency — flag explicite LLM
  if (parsed.requiresSocial) {
    const socialHints =
      /inconnu|quelqu'un|une personne|un proche|appelle|parle|discute|rencontre|écris|message|voisin|sms|texto|invite|compliment|serveur|commerçant|collègue|ami|famille|conversation|discuter avec|parler à|stranger|someone|call |talk |chat |meet |write |message|neighbor|neighbour|text |invite|compliment|server|shopkeeper|colleague|friend|family|conversation|speak with|talk to/i;
    if (!socialHints.test(mission)) {
      return {
        ok: false,
        reason: en
          ? 'requiresSocial=true needs explicit social interaction in the mission'
          : 'requiresSocial=true : la mission doit évoquer une interaction sociale réelle',
      };
    }
  }

  // City mention if location available and city looks real
  if (contextCity && contextCity.length > 2 && !/^ta ville$|^your city$/i.test(contextCity)) {
    if (!lowerMission.includes(contextCity.toLowerCase())) {
      return {
        ok: false,
        reason: en
          ? `mention the city ${contextCity} naturally in the mission`
          : `mentionne naturellement ${contextCity} dans la mission`,
      };
    }
  }

  return { ok: true };
}

function countSentences(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/(?<=[.!?])\s+/).filter((p) => p.length > 0).length;
}

/**
 * Forme une seule phrase à partir d'une mission éventuellement multi-phrases.
 * Utilisé en post-process pour récupérer une réponse "presque bonne".
 */
export function clampToOneSentence(mission: string): string {
  let s = mission.trim();
  if (!s) return s;
  const parts = s.split(/(?<=[.!?])\s+/).filter((p) => p.length > 0);
  if (parts.length > 0) s = parts[0].trim();
  if (/\s;\s/.test(s)) s = s.split(/\s*;\s*/)[0].trim();
  if (s.length > MISSION_MAX_CHARS) s = s.slice(0, MISSION_MAX_CHARS).trim();
  return s;
}
