'use server';

import OpenAI from 'openai';
import type { QuestModel } from '@questia/shared';
import { logStructured, logStructuredError } from '../observability';
import { buildSystemPrompt, buildUserPrompt } from './buildPrompt';
import { buildFallbackQuest } from './fallback';
import { ensureCityInMission, parseGeneratedJson } from './parse';
import { validateGenerated } from './validation';
import type { GeneratedQuest, QuestGenInput } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

const DEFAULT_MODEL = 'gpt-5.4';
const MODEL =
  (typeof process.env.OPENAI_DAILY_QUEST_MODEL === 'string'
    ? process.env.OPENAI_DAILY_QUEST_MODEL.trim()
    : '') || DEFAULT_MODEL;

const MAX_ATTEMPTS = 2;
const MAX_TOKENS = 700;

function modelIgnoresSampling(model: string): boolean {
  return /^gpt-5/i.test(model.trim());
}

/**
 * Pipeline LLM-first : un seul appel OpenAI qui CHOISIT l'archétype et RÉDIGE la quête.
 * Le moteur algorithmique a déjà fourni un dossier de candidats ; le LLM tranche et écrit.
 *
 * En cas d'échec (JSON invalide, validation refusée), on retry une fois avec l'erreur en hint,
 * puis on tombe sur le fallback (taxonomie + hook déterministe).
 */
export async function generateDailyQuest(input: QuestGenInput): Promise<GeneratedQuest> {
  if (input.candidates.length === 0) {
    throw new Error('quest-gen: no candidates provided');
  }

  const { locale, context } = input;
  const candidateIds = input.candidates.map((c) => c.archetype.id);
  const archetypesById = new Map<number, QuestModel>(
    input.candidates.map((c) => [c.archetype.id, c.archetype]),
  );
  const computedIsOutdoor = context.hasUserLocation && context.isOutdoorFriendly;

  const system = buildSystemPrompt(locale);
  let repairHint: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const user = buildUserPrompt(input, repairHint);
    const t0 = performance.now();
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: MAX_TOKENS,
        ...(modelIgnoresSampling(MODEL)
          ? {}
          : { temperature: attempt === 0 ? 0.85 : 0.6, top_p: 0.94 }),
      });

      const durationMs = Math.round(performance.now() - t0);
      const raw = completion.choices[0]?.message?.content;
      const u = completion.usage;

      if (!raw) {
        logStructured({
          domain: 'ai',
          operation: 'quest-gen.call',
          level: 'warn',
          outcome: 'miss',
          durationMs,
          meta: { model: MODEL, attempt: attempt + 1, reason: 'empty-choices' },
        });
        repairHint = locale === 'en' ? 'response was empty; respond with full JSON' : 'réponse vide ; réponds avec le JSON complet';
        continue;
      }

      let parsed: GeneratedQuest;
      try {
        parsed = parseGeneratedJson(raw, archetypesById, computedIsOutdoor);
      } catch (err) {
        repairHint = err instanceof Error ? err.message : 'invalid JSON';
        logStructured({
          domain: 'ai',
          operation: 'quest-gen.parse',
          level: 'warn',
          outcome: 'miss',
          durationMs,
          meta: { model: MODEL, attempt: attempt + 1, repairHint },
        });
        continue;
      }

      // Sauvetage doux : ville absente → on l'ajoute (avant validation)
      if (context.hasUserLocation && context.city) {
        parsed.mission = ensureCityInMission(parsed.mission, context.city);
      }

      const archetype = archetypesById.get(parsed.archetypeId) ?? null;
      const validation = validateGenerated(
        parsed,
        candidateIds,
        archetype,
        locale,
        context.hasUserLocation ? context.city : null,
        computedIsOutdoor,
      );
      if (!validation.ok) {
        repairHint = validation.reason;
        logStructured({
          domain: 'ai',
          operation: 'quest-gen.validate',
          level: 'warn',
          outcome: 'miss',
          durationMs,
          meta: {
            model: MODEL,
            attempt: attempt + 1,
            archetypeId: parsed.archetypeId,
            repairHint,
          },
        });
        continue;
      }

      logStructured({
        domain: 'ai',
        operation: 'quest-gen.call',
        level: 'info',
        outcome: 'ok',
        durationMs,
        meta: {
          model: MODEL,
          attempt: attempt + 1,
          archetypeId: parsed.archetypeId,
          isOutdoor: parsed.isOutdoor,
          selfFitScore: parsed.selfFitScore,
          promptTokens: u?.prompt_tokens,
          completionTokens: u?.completion_tokens,
          totalTokens: u?.total_tokens,
        },
      });

      return parsed;
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      logStructuredError('ai', 'quest-gen.call', err, {
        durationMs,
        outcome: 'degraded',
        meta: { model: MODEL, attempt: attempt + 1 },
      });
      repairHint = locale === 'en' ? 'transient API error; respond with full JSON' : 'erreur transitoire ; réponds avec le JSON complet';
    }
  }

  // Fallback : top candidate + texte canon + hook déterministe
  const top = input.candidates[0];
  logStructured({
    domain: 'ai',
    operation: 'quest-gen.call',
    level: 'warn',
    outcome: 'fallback',
    meta: {
      model: MODEL,
      attempts: MAX_ATTEMPTS,
      archetypeId: top.archetype.id,
      lastRepairHint: repairHint ?? undefined,
    },
  });
  return buildFallbackQuest(top, locale, context);
}
