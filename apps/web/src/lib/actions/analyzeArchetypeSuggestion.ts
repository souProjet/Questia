import OpenAI from 'openai';
import type { ComfortLevel, PsychologicalCategory } from '@questia/shared';
import { archetypeQuestPace } from '@questia/shared';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

const CATEGORY_LIST: PsychologicalCategory[] = [
  'spatial_adventure',
  'public_introspection',
  'sensory_deprivation',
  'exploratory_sociability',
  'physical_existential',
  'async_discipline',
  'dopamine_detox',
  'active_empathy',
  'temporal_projection',
  'hostile_immersion',
  'spontaneous_altruism',
  'relational_vulnerability',
  'unconditional_service',
];

export type ArchetypeAiSuggestion = {
  category: PsychologicalCategory;
  targetTraits: Record<string, number>;
  comfortLevel: ComfortLevel;
  requiresOutdoor: boolean;
  requiresSocial: boolean;
  minimumDurationMinutes: number;
  titleEn: string;
  descriptionEn: string;
};

/** Analyse complète à partir d’un texte libre (titre + consignes peuvent être mélangés). */
export type FreeformArchetypeAnalysis = ArchetypeAiSuggestion & {
  titleFr: string;
  descriptionFr: string;
};

function clamp01(n: unknown): number {
  const x = typeof n === 'number' ? n : parseFloat(String(n));
  if (Number.isNaN(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

function normalizeSuggestion(raw: Record<string, unknown>): ArchetypeAiSuggestion {
  const cat = String(raw.category ?? '');
  const category = (CATEGORY_LIST.includes(cat as PsychologicalCategory)
    ? cat
    : 'exploratory_sociability') as PsychologicalCategory;

  const tt = raw.targetTraits && typeof raw.targetTraits === 'object' ? (raw.targetTraits as Record<string, unknown>) : {};
  const targetTraits: Record<string, number> = {};
  for (const k of ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'emotionalStability', 'thrillSeeking', 'boredomSusceptibility']) {
    if (tt[k] !== undefined) targetTraits[k] = clamp01(tt[k]);
  }
  if (Object.keys(targetTraits).length === 0) {
    targetTraits.openness = 0.55;
    targetTraits.extraversion = 0.45;
  }

  const cl = String(raw.comfortLevel ?? 'moderate');
  const comfortLevel = (['low', 'moderate', 'high', 'extreme'].includes(cl) ? cl : 'moderate') as ComfortLevel;

  return {
    category,
    targetTraits,
    comfortLevel,
    requiresOutdoor: Boolean(raw.requiresOutdoor),
    requiresSocial: Boolean(raw.requiresSocial),
    minimumDurationMinutes: Math.max(5, Math.min(24 * 60, Math.round(Number(raw.minimumDurationMinutes) || 45))),
    titleEn: String(raw.titleEn ?? '').slice(0, 200) || 'Untitled quest',
    descriptionEn: String(raw.descriptionEn ?? '').slice(0, 4000) || 'Description pending.',
  };
}

const SOCIAL_APPROACH_HINT =
  /compliment|éloge|éloges|inconnu|inconnus|inconnue|stranger|parler à|talk to|personne|personnes|people|trois |three |quelqu|someone|approach|approcher|discute|discuter|positiv|sourire|smile|remerci|thank|grateful/i;

/**
 * Si la quête exige d’initier le contact (compliments, parler à des gens…) mais le modèle met une extraversion trop basse, on rehausse — le moteur de congruence s’appuie sur ce signal.
 */
export function bumpExtraversionForSocialApproachQuests(
  a: ArchetypeAiSuggestion,
  supplementaryLocaleText?: string,
): ArchetypeAiSuggestion {
  if (!a.requiresSocial) return a;
  const parts = [supplementaryLocaleText ?? '', a.titleEn, a.descriptionEn];
  if ('titleFr' in a && typeof (a as FreeformArchetypeAnalysis).titleFr === 'string') {
    const ff = a as FreeformArchetypeAnalysis;
    parts.unshift(ff.titleFr, ff.descriptionFr);
  }
  const blob = parts.filter(Boolean).join('\n').toLowerCase();
  if (!SOCIAL_APPROACH_HINT.test(blob)) return a;
  const ex = a.targetTraits.extraversion ?? 0.5;
  if (ex >= 0.62) return a;
  return {
    ...a,
    targetTraits: { ...a.targetTraits, extraversion: Math.max(ex, 0.76) },
  };
}

function detectLangHeuristic(text: string): 'fr' | 'en' {
  const t = text.toLowerCase();
  const frHits = (t.match(/\b(le|la|les|un|une|des|pour|avec|sans|très|dans|sur|être|vous|ton|ta|tes)\b/g) ?? []).length;
  const enHits = (t.match(/\b(the|and|with|without|your|walk|minutes|take|write|note)\b/g) ?? []).length;
  return frHits > enHits ? 'fr' : 'en';
}

function normalizeFreeformArchetype(raw: Record<string, unknown>, fallbackContent: string): FreeformArchetypeAnalysis {
  const base = normalizeSuggestion(raw);
  const trimmed = fallbackContent.trim();
  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? '';
  const titleFr = String(raw.titleFr ?? '').trim().slice(0, 200) || firstLine.slice(0, 200) || 'Quête';
  let descriptionFr = String(raw.descriptionFr ?? '').trim().slice(0, 4000);
  if (!descriptionFr) {
    descriptionFr =
      trimmed.includes('\n') && trimmed.length > firstLine.length
        ? trimmed.slice(firstLine.length).trim()
        : trimmed;
  }
  return {
    ...base,
    titleFr,
    descriptionFr: descriptionFr || trimmed,
  };
}

const PLACEHOLDER_EN_DESC = 'description pending.';

function needsEnRepair(titleEn: string, descriptionEn: string): boolean {
  const d = descriptionEn.trim().toLowerCase();
  return (
    !titleEn.trim() ||
    !descriptionEn.trim() ||
    d === PLACEHOLDER_EN_DESC ||
    d === 'description pending' ||
    d.startsWith('description pending')
  );
}

function needsFrRepair(titleFr: string, descriptionFr: string): boolean {
  return !titleFr.trim() || !descriptionFr.trim();
}

/**
 * Traduction dédiée quand le premier appel n’a pas rempli une locale.
 */
async function translateQuestTitleDescription(
  title: string,
  description: string,
  direction: 'fr_to_en' | 'en_to_fr',
): Promise<{ title: string; description: string }> {
  const model =
    (typeof process.env.OPENAI_MODEL === 'string' ? process.env.OPENAI_MODEL.trim() : '') || 'gpt-4o-mini';

  const outKeys = direction === 'fr_to_en' ? 'titleEn and descriptionEn' : 'titleFr and descriptionFr';
  const system = `You translate quest copy for a self-improvement app. Output a single JSON object with keys ${outKeys}. Preserve imperative tone and line breaks where appropriate. Natural, idiomatic target language. No extra keys.`;

  const label = direction === 'fr_to_en' ? 'French' : 'English';
  const user = `${label} title:\n${title.trim()}\n\n${label} description:\n${description.trim()}`;

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim() ?? '{}';
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (direction === 'fr_to_en') {
    return {
      title: String(raw.titleEn ?? '').trim().slice(0, 200) || title.slice(0, 200),
      description: String(raw.descriptionEn ?? '').trim().slice(0, 4000) || description.slice(0, 4000),
    };
  }
  return {
    title: String(raw.titleFr ?? '').trim().slice(0, 200) || title.slice(0, 200),
    description: String(raw.descriptionFr ?? '').trim().slice(0, 4000) || description.slice(0, 4000),
  };
}

/**
 * Proposition de paramètres moteur à partir d’un titre + description (FR) saisis par l’admin.
 */
export async function analyzeQuestArchetypeSuggestion(input: {
  titleFr: string;
  descriptionFr: string;
}): Promise<ArchetypeAiSuggestion> {
  const model =
    (typeof process.env.OPENAI_MODEL === 'string' ? process.env.OPENAI_MODEL.trim() : '') || 'gpt-4o-mini';

  const system = `You are a careful assistant for a self-improvement app. Given a quest archetype title and description in French, output a single JSON object with keys:
category (one of: ${CATEGORY_LIST.join(', ')}),
targetTraits (object with 0-1 floats for any of: openness, conscientiousness, extraversion, agreeableness, emotionalStability, thrillSeeking, boredomSusceptibility),
comfortLevel (one of: low, moderate, high, extreme),
requiresOutdoor (boolean),
requiresSocial (boolean),
minimumDurationMinutes (integer, 5-1440),
titleEn (short English title),
descriptionEn (English description, same meaning as the French).

targetTraits: If the quest requires initiating contact with other people (compliments, speaking to strangers, approaching someone, thanking people in person), set extraversion to at least 0.65 — typically 0.75–0.9. Reserve low extraversion (e.g. under 0.45) only for truly solitary or internal quests with no real social approach.
Be conservative on safety: no illegal or medical instructions.`;

  const user = `French title: ${input.titleFr.trim()}\nFrench description:\n${input.descriptionFr.trim()}`;

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim() ?? '{}';
  const raw = JSON.parse(text) as Record<string, unknown>;
  let result = normalizeSuggestion(raw);
  result = bumpExtraversionForSocialApproachQuests(
    result,
    `${input.titleFr}\n${input.descriptionFr}`,
  );
  if (needsEnRepair(result.titleEn, result.descriptionEn)) {
    const en = await translateQuestTitleDescription(input.titleFr, input.descriptionFr, 'fr_to_en');
    result = { ...result, titleEn: en.title, descriptionEn: en.description };
  }
  return result;
}

/**
 * Déduit titre, descriptions FR+EN, taxonomie et traductions à partir d’un seul bloc (admin — FR ou EN).
 */
export async function analyzeQuestArchetypeFromFreeform(freeformContent: string): Promise<FreeformArchetypeAnalysis> {
  const model =
    (typeof process.env.OPENAI_MODEL === 'string' ? process.env.OPENAI_MODEL.trim() : '') || 'gpt-4o-mini';

  const system = `You are a careful assistant for a self-improvement app. The admin pastes free-form text in FRENCH OR ENGLISH (title only, title + body, or instructions only).

1) Detect the primary language of the pasted text. Set inputLanguage to "fr" or "en".
2) If the text is French: craft titleFr and descriptionFr from it (clear, actionable quest copy). titleEn and descriptionEn MUST be fluent English translations (same meaning and tone, not literal word salad).
3) If the text is English: craft titleEn and descriptionEn from it. titleFr and descriptionFr MUST be fluent French translations.
4) All four fields titleFr, descriptionFr, titleEn, descriptionEn are required and must be in the correct language for each key. Never put French text in titleEn/descriptionEn or English in titleFr/descriptionFr.

Output a single JSON object with keys:
inputLanguage ("fr" or "en"),
titleFr, descriptionFr, titleEn, descriptionEn,
category (one of: ${CATEGORY_LIST.join(', ')}),
targetTraits (object with 0-1 floats for any of: openness, conscientiousness, extraversion, agreeableness, emotionalStability, thrillSeeking, boredomSusceptibility),
comfortLevel (one of: low, moderate, high, extreme),
requiresOutdoor (boolean),
requiresSocial (boolean),
minimumDurationMinutes (integer, 5-1440).

targetTraits: If the quest requires initiating contact with other people (compliments, speaking to strangers, approaching someone), set extraversion to at least 0.65 — typically 0.75–0.9. Use low extraversion only for solitary or introspective quests with no real social approach.
Be conservative on safety: no illegal or medical instructions.`;

  const user = `Quest content (French or English, free-form):\n${freeformContent.trim()}`;

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim() ?? '{}';
  const raw = JSON.parse(text) as Record<string, unknown>;
  let analysis = normalizeFreeformArchetype(raw, freeformContent);
  analysis = await ensureBilingualArchetypeTexts(analysis, freeformContent);
  analysis = bumpExtraversionForSocialApproachQuests(analysis) as FreeformArchetypeAnalysis;
  return analysis;
}

async function ensureBilingualArchetypeTexts(
  analysis: FreeformArchetypeAnalysis,
  freeformContent: string,
): Promise<FreeformArchetypeAnalysis> {
  const frOk = !needsFrRepair(analysis.titleFr, analysis.descriptionFr);
  const enOk = !needsEnRepair(analysis.titleEn, analysis.descriptionEn);
  if (frOk && enOk) return analysis;

  if (frOk && !enOk) {
    const en = await translateQuestTitleDescription(analysis.titleFr, analysis.descriptionFr, 'fr_to_en');
    return { ...analysis, titleEn: en.title, descriptionEn: en.description };
  }
  if (!frOk && enOk) {
    const fr = await translateQuestTitleDescription(analysis.titleEn, analysis.descriptionEn, 'en_to_fr');
    return { ...analysis, titleFr: fr.title, descriptionFr: fr.description };
  }

  const trimmed = freeformContent.trim();
  const lines = trimmed.split(/\n/);
  const titleGuess = (lines[0] ?? trimmed).slice(0, 200);
  const descGuess = lines.length > 1 ? lines.slice(1).join('\n').trim() : trimmed;
  if (detectLangHeuristic(trimmed) === 'fr') {
    const en = await translateQuestTitleDescription(titleGuess, descGuess, 'fr_to_en');
    return {
      ...analysis,
      titleFr: titleGuess,
      descriptionFr: descGuess,
      titleEn: en.title,
      descriptionEn: en.description,
    };
  }
  const fr = await translateQuestTitleDescription(titleGuess, descGuess, 'en_to_fr');
  return {
    ...analysis,
    titleEn: titleGuess,
    descriptionEn: descGuess,
    titleFr: fr.title,
    descriptionFr: fr.description,
  };
}

export function deriveQuestPaceFromFlags(input: {
  requiresSocial: boolean;
  minimumDurationMinutes: number;
}): 'instant' | 'planned' {
  return archetypeQuestPace(input);
}
