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
  return normalizeSuggestion(raw);
}

export function deriveQuestPaceFromFlags(input: {
  requiresSocial: boolean;
  minimumDurationMinutes: number;
}): 'instant' | 'planned' {
  return archetypeQuestPace(input);
}
