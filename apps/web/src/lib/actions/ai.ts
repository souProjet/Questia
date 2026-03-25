'use server';

import OpenAI from 'openai';
import type {
  QuestModel,
  EscalationPhase,
  ExplorerAxis,
  RiskAxis,
  PersonalityVector,
  QuestNarrationRequest,
  QuestNarrationResponse,
} from '@questia/shared';
import {
  archetypeCategoryLabelFr,
  buildPersonalityPromptBlock,
  describeArchetypeTargetTraits,
} from './questGenerationPrompt';
import { logStructured, logStructuredError } from '../observability';
import { QUEST_SYSTEM_GUARDRAILS, truncateForPrompt } from '../ai/promptGuardrails';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

/** Modèle OpenAI (`chat.completions`). Surchargeable sans redéploiement de code via `OPENAI_MODEL`. */
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_MODEL =
  (typeof process.env.OPENAI_MODEL === 'string' ? process.env.OPENAI_MODEL.trim() : '') ||
  DEFAULT_OPENAI_MODEL;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestContext {
  city: string;
  country: string;
  weatherDescription: string;
  weatherIcon: string; // Lucide icon name: Sun, CloudRain, Cloud, etc.
  temp: number;
  isOutdoorFriendly: boolean;
}

export interface GeneratedDailyQuest {
  icon: string; // Lucide icon name
  title: string;
  mission: string; // 2-3 sentences, concrete actions
  hook: string; // short motivational punch line
  duration: string; // human readable
  isOutdoor: boolean;
  safetyNote: string | null;
  archetype: string; // archetype name for display
  /** Lieu public pour carte / itinéraire (null si intérieur) */
  destinationLabel: string | null;
  /** Recherche type Google Maps : lieu + ville + pays */
  destinationQuery: string | null;
}

/** Entrées pour personnaliser au maximum la génération (aligné moteur + profil). */
export interface DailyQuestProfileInput {
  /** Phase utilisée pour le choix d’archétype (peut différer du champ profil BDD). */
  phase: EscalationPhase;
  day: number;
  /** Delta de congruence calculé (déclaré vs comportement observé). */
  congruenceDelta: number;
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  /** YYYY-MM-DD — varie le hook */
  questDateIso: string;
  /** Big Five (+ autres clés) déclaré à l’onboarding */
  declaredPersonality: PersonalityVector;
  /** Personnalité inférée depuis l’historique de quêtes */
  exhibitedPersonality: PersonalityVector;
  /** Directive optionnelle (pack narration acheté) */
  narrationDirective?: string;
  /** Relance du jour : exiger une formulation nettement différente */
  isRerollGeneration?: boolean;
  /** Après « Reporter » : quête de remplacement 100 % instantanée (message + contraintes) */
  substitutedInstantAfterDefer?: boolean;
  /** Préférences issues du questionnaire de raffinement (optionnel) */
  refinementContext?: string | null;
}

// ── Phase → human label ───────────────────────────────────────────────────────

const PHASE_LABEL: Record<EscalationPhase, string> = {
  calibration: 'débutant (zone de confort proche)',
  expansion: 'en progression (léger inconfort accepté)',
  rupture: 'en rupture (challenge significatif recherché)',
};

const PROFILE_LABEL = (e: ExplorerAxis, r: RiskAxis) => {
  const explorer = e === 'explorer' ? 'aime explorer et découvrir' : 'préfère le confort du foyer';
  const risk = r === 'risktaker' ? 'prend des risques spontanément' : 'préfère planifier et sécuriser';
  return `${explorer}, ${risk}`;
};

const ICON_ALLOWLIST = new Set([
  'Swords',
  'Camera',
  'Coffee',
  'Mic',
  'Compass',
  'Sparkles',
  'TreePine',
  'MapPin',
  'Target',
  'BookOpen',
  'UtensilsCrossed',
  'Drama',
  'Leaf',
  'Navigation',
  'Flower',
]);

const VAGUE_MISSION_SNIPPETS = [
  'réfléchis à ta vie',
  'médite sur',
  'prends le temps de réfléchir',
  'pense à ton passé',
];

/** Phrases de secours : une par jour (et variante selon archétype) si l’API échoue — pas une seule phrase figée. */
const FALLBACK_HOOKS: string[] = [
  'Aujourd’hui, un petit pas suffit à ouvrir une porte.',
  'Ce que tu évites hier peut devenir ton jeu aujourd’hui.',
  'La curiosité est un muscle : fais une série.',
  'Personne ne voit ton courage intérieur — montre-le par un geste.',
  'Le brouillard se lève quand tu avances d’un mètre.',
  'Ta zone de confort t’attend… de l’autre côté de la porte.',
  'Un sourire à un inconnu, c’est déjà une victoire.',
  'Le monde est un terrain de jeu — choisis un coin et explore.',
  'Pas besoin d’être prêt·e : commence, puis ajuste.',
  'L’ennui est un signal : réponds avec une action minuscule.',
  'Chaque sortie est un vote pour la version de toi qui ose.',
  'Les grandes histoires commencent par un « et si j’essayais ? »',
  'Ton corps sait marcher — laisse ton esprit suivre.',
  'Aujourd’hui, privilégie le réel au scroll.',
  'La météo dans ta tête n’est pas une fatalité.',
  'Un rituel nouveau suffit à casser l’autopilot.',
  'Tu n’as pas à impressionner — seulement à te sentir vivant·e.',
  'Le hasard aime ceux qui bougent les pieds.',
  'Remplace « plus tard » par « dix minutes ».',
  'Ce que tu remarques en chemin compte autant que l’arrivée.',
  'L’aventure, c’est parfois juste sortir du cadre habituel.',
  'Ton futur toi remercie le geste d’aujourd’hui.',
  'Pas de spectacle : une intention honnête suffit.',
  'La ville te tend des mains invisibles — tends la tienne.',
  'Le silence du doute se coupe avec une action.',
  'Tu mérites une journée qui ne soit pas une copie d’hier.',
  'Un détail changé, et toute la journée penche différemment.',
  'Le confort, c’est bien ; l’élan, c’est mieux.',
  'Aujourd’hui, sois l’auteur d’une scène, pas le spectateur.',
  'L’énergie vient souvent après le premier pas, pas avant.',
  'Ton intuition a parfois raison avant ton cerveau.',
  'Fais une chose que ton « par défaut » éviterait.',
  'Le monde extérieur est un miroir — approche-toi.',
  'Petit effort, grand signal à toi-même.',
  'La lumière change quand tu changes d’angle.',
  'Tu n’es pas en retard : tu es au bon jour pour commencer.',
  'Choisis l’inconfort léger plutôt que la rumination.',
  'Une rencontre, un lieu, un geste — pick one.',
  'Aujourd’hui, écris une ligne nouvelle dans ton histoire.',
];

function pickFallbackHook(questDateIso: string, archetypeId: number): string {
  let h = 0;
  for (let i = 0; i < questDateIso.length; i++) {
    h = (Math.imul(31, h) + questDateIso.charCodeAt(i)) | 0;
  }
  h = (h + archetypeId * 17) | 0;
  const idx = Math.abs(h) % FALLBACK_HOOKS.length;
  return FALLBACK_HOOKS[idx]!;
}

function normalizeIcon(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (ICON_ALLOWLIST.has(s)) return s;
  return 'Target';
}

function cityMustAppearInMission(city: string): boolean {
  const c = city.trim().toLowerCase();
  return c.length > 2 && c !== 'ta ville';
}

function validateGeneratedPayload(
  parsed: {
    title: string;
    mission: string;
    hook: string;
    destinationLabel: string | null;
    destinationQuery: string | null;
  },
  context: QuestContext,
  archetype: QuestModel,
  computedIsOutdoor: boolean,
): { ok: true } | { ok: false; reason: string } {
  const title = parsed.title.trim();
  const mission = parsed.mission.trim();
  const hook = parsed.hook.trim();

  if (title.length < 3 || title.length > 90) {
    return { ok: false, reason: 'titre trop court ou trop long' };
  }
  if (mission.length < 38) {
    return { ok: false, reason: 'mission pas assez concrète (trop courte)' };
  }
  if (hook.length < 6 || hook.split(/\s+/).length > 22) {
    return { ok: false, reason: 'hook invalide (longueur ou nombre de mots)' };
  }
  const m = mission.toLowerCase();
  for (const bad of VAGUE_MISSION_SNIPPETS) {
    if (m.includes(bad)) {
      return { ok: false, reason: 'mission trop vague (évite la pure introspection sans action)' };
    }
  }
  if (cityMustAppearInMission(context.city) && !m.includes(context.city.trim().toLowerCase())) {
    return { ok: false, reason: `la mission doit mentionner naturellement la ville ${context.city}` };
  }
  if (computedIsOutdoor) {
    const label = (parsed.destinationLabel ?? '').trim();
    const query = (parsed.destinationQuery ?? '').trim();
    if (label.length < 2 || query.length < 6) {
      return { ok: false, reason: 'lieu extérieur : destinationLabel et destinationQuery requis' };
    }
  }
  if (archetype.requiresSocial) {
    const socialHints =
      /inconnu|quelqu'un|une personne|un proche|appelle|parle|discute|rencontre|écris|message|voisin|sms|texto|invite|compliment|serveur|commerçant|collègue|ami|famille|conversation|discuter avec|parler à/i;
    if (!socialHints.test(mission)) {
      return { ok: false, reason: "l'archétype implique du social : la mission doit l'évoquer clairement" };
    }
  }
  return { ok: true };
}

function applyComputedOutdoor(parsed: GeneratedDailyQuest, computedIsOutdoor: boolean): GeneratedDailyQuest {
  if (!computedIsOutdoor) {
    return {
      ...parsed,
      isOutdoor: false,
      destinationLabel: null,
      destinationQuery: null,
      safetyNote: null,
    };
  }
  return {
    ...parsed,
    isOutdoor: true,
    destinationLabel: parsed.destinationLabel?.trim() || null,
    destinationQuery: parsed.destinationQuery?.trim() || null,
  };
}

function buildUserPrompt(
  profile: DailyQuestProfileInput,
  archetype: QuestModel,
  context: QuestContext,
  computedIsOutdoor: boolean,
  personalityBlock: string,
  categoryFr: string,
  targetTraitsLine: string,
  repairHint: string | null,
): string {
  const rerollBlock = profile.isRerollGeneration
    ? `\nIMPORTANT : c’est une RELANCE — la formulation (titre, mission, hook) doit être NETTEMENT différente d’une première proposition, tout en restant dans le même archétype.\n`
    : '';

  const deferInstantBlock = profile.substitutedInstantAfterDefer
    ? `\nCONTEXTE : l’utilisateur a utilisé une relance pour « reporter » une quête trop lourde ou mal calée. Cette mission doit être 100 % réalisable aujourd’hui, sans multi-jours ni grosse synchro sociale — une victoire rapide et honnête.\n`
    : '';

  const paceBlock =
    profile.substitutedInstantAfterDefer
      ? ''
      : archetype.questPace === 'planned'
        ? `\nRythme « planifié » : l’intention peut être ambitieuse — propose une première étape CONCRÈTE faisable aujourd’hui (idéalement 15–45 min) et, si utile, une phrase courte sur comment poursuivre plus tard (sans culpabiliser).\n`
        : `\nRythme « instantané » : mission tenable dans la journée, sans calendrier lourd.\n`;

  const repairBlock = repairHint
    ? `\nCORRECTION DEMANDÉE (la proposition précédente était invalide) :\n${repairHint}\nRéécris entièrement title, mission, hook${computedIsOutdoor ? ', destinationLabel, destinationQuery' : ''}.\n`
    : '';

  const variationSalt = `${profile.questDateIso}|${archetype.id}|${profile.congruenceDelta.toFixed(3)}|${profile.day}|${repairHint ? 'r1' : 'r0'}`;

  return `Génère une quête quotidienne unique pour aujourd'hui.

VARIATION (évite la copie) : ${variationSalt}
${rerollBlock}${deferInstantBlock}${paceBlock}${repairBlock}
DATE DU JOUR : ${profile.questDateIso}
- Le champ "hook" : phrase courte (max 15 mots), DIFFÉRENTE d'un jour à l'autre.
- Évite les formules creuses (« Sois toi-même », « Crois en tes rêves »).

CONTEXTE DU JOUR :
- Ville : ${context.city}, ${context.country}
- Météo : ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C
- Sortie en extérieur : ${context.isOutdoorFriendly ? 'Oui, météo favorable' : 'Déconseillé (mauvais temps)'}

PROFIL OPÉRATIONNEL :
- Jour n°${profile.day}
- Niveau (phase effective pour cette quête) : ${PHASE_LABEL[profile.phase]}
- Tendance explorateur / risque : ${PROFILE_LABEL(profile.explorerAxis, profile.riskAxis)}

${personalityBlock}

FAMILLE DE QUÊTE (respecte l’intention ; ne la cite pas comme étiquette) :
- ${categoryFr}
- Axes visés par l’archétype : ${targetTraitsLine}

${profile.narrationDirective ? `DIRECTIVE DE STYLE (respecte-la sans la citer mot pour mot) :\n${profile.narrationDirective}\n` : ''}
${profile.refinementContext ? `PRÉFÉRENCES UTILISATEUR (adapter la mission, sans citer la source) :\n${profile.refinementContext}\n` : ''}

ARCHÉTYPE (titre canon) : "${archetype.title}"
Concept : ${archetype.description}
Durée minimale : ${archetype.minimumDurationMinutes} minutes

RÈGLES ABSOLUES :
1. La mission doit être CONCRÈTE (actions précises, objets, lieux, durée) — pas seulement « réfléchir ».
2. Elle doit être faisable AUJOURD'HUI${cityMustAppearInMission(context.city) ? ` à ${context.city}` : ''}.
3. ${context.isOutdoorFriendly ? 'Peut se passer en extérieur si isOutdoor est true.' : 'Doit se passer en intérieur ou sous abri.'}
4. Adapte la durée à la météo.
5. Zéro jargon psychologique ou clinique (pas de Big Five, pas de « traits »).
6. Commence la mission par un verbe d’action à l’impératif ou « Va », « Prends », « Écris », etc.
7. isOutdoor doit être EXACTEMENT : ${computedIsOutdoor}
8. ${computedIsOutdoor ? `Si isOutdoor true : UN lieu public réel à ${context.city} ; destinationQuery = "Lieu, ${context.city}, ${context.country}"` : 'Si isOutdoor false : destinationLabel et destinationQuery à null.'}
${archetype.requiresSocial ? '9. Cette famille implique une interaction sociale réelle (inconnu, proche, message, appel…) — intègre-la dans la mission.\n' : ''}
10. Respecte les garde-fous de sécurité : pas de danger physique, pas de conseils médicaux ou thérapeutiques, pas d’incitation à l’illégalité ou à la haine.

Réponds en JSON strict. Pour "icon" choisis UN SEUL nom dans cette liste : ${[...ICON_ALLOWLIST].join(', ')}.
{
  "icon": "...",
  "title": "titre court (4-6 mots max), intrigant",
  "mission": "2-3 phrases précises${cityMustAppearInMission(context.city) ? `, mention naturelle de ${context.city}` : ''}",
  "hook": "max 15 mots",
  "duration": "ex: 45 min, 1h30",
  "isOutdoor": ${computedIsOutdoor},
  "safetyNote": ${computedIsOutdoor ? 'string court ou null' : 'null'},
  "destinationLabel": ${computedIsOutdoor ? `"nom court du lieu"` : 'null'},
  "destinationQuery": ${computedIsOutdoor ? `"Lieu, ${context.city}, ${context.country}"` : 'null'}
}`;
}

async function callModel(user: string, system: string, temperature: number): Promise<string> {
  const t0 = performance.now();
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature,
      max_tokens: 600,
    });
    const durationMs = Math.round(performance.now() - t0);
    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      logStructured({
        domain: 'ai',
        operation: 'chat.completions.dailyQuest',
        level: 'error',
        outcome: 'miss',
        durationMs,
        meta: { model: OPENAI_MODEL, emptyChoices: true, temperature },
      });
      throw new Error('Empty response');
    }
    const u = completion.usage;
    logStructured({
      domain: 'ai',
      operation: 'chat.completions.dailyQuest',
      level: 'info',
      outcome: 'ok',
      durationMs,
      meta: {
        model: OPENAI_MODEL,
        temperature,
        promptTokens: u?.prompt_tokens,
        completionTokens: u?.completion_tokens,
        totalTokens: u?.total_tokens,
      },
    });
    return raw;
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    if (err instanceof Error && err.message === 'Empty response') throw err;
    logStructuredError('ai', 'chat.completions.dailyQuest', err, {
      durationMs,
      outcome: 'degraded',
      meta: { model: OPENAI_MODEL, temperature },
    });
    throw err;
  }
}

// ── Main: generate a full unique daily quest ──────────────────────────────────

export async function generateDailyQuest(
  profile: DailyQuestProfileInput,
  archetype: QuestModel,
  context: QuestContext,
): Promise<GeneratedDailyQuest> {
  const safeProfile: DailyQuestProfileInput = {
    ...profile,
    refinementContext:
      truncateForPrompt(profile.refinementContext ?? undefined, 1500) ??
      profile.refinementContext ??
      null,
    narrationDirective: truncateForPrompt(profile.narrationDirective, 2500),
  };

  const system = `Tu es le créateur de quêtes de Questia. Tu génères des aventures quotidiennes uniques, concrètes et réalisables. Tu tutoies avec chaleur et direct. Jamais de jargon psychologique ni de mention des "traits" ou du Big Five. Chaque quête doit être faisable sans prérequis. Tu adaptes le ton et le niveau d’exposition sociale au profil décrit dans le message utilisateur, sans nommer des scores.

${QUEST_SYSTEM_GUARDRAILS}`;

  const computedIsOutdoor = context.isOutdoorFriendly && archetype.requiresOutdoor;
  const personalityBlock = buildPersonalityPromptBlock(
    profile.declaredPersonality,
    profile.exhibitedPersonality,
    profile.congruenceDelta,
  );
  const categoryFr = archetypeCategoryLabelFr(archetype.category);
  const targetTraitsLine = describeArchetypeTargetTraits(archetype);

  let repairHint: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const user = buildUserPrompt(
        safeProfile,
        archetype,
        context,
        computedIsOutdoor,
        personalityBlock,
        categoryFr,
        targetTraitsLine,
        repairHint,
      );
      const temperature = attempt === 0 ? 0.78 : 0.62;
      const raw = await callModel(user, system, temperature);
      const parsedRaw = JSON.parse(raw) as Record<string, unknown>;

      const parsed = {
        ...parsedRaw,
        icon: normalizeIcon(parsedRaw.icon ?? parsedRaw.emoji),
        title: typeof parsedRaw.title === 'string' ? parsedRaw.title.trim() : '',
        mission: typeof parsedRaw.mission === 'string' ? parsedRaw.mission.trim() : '',
        hook: typeof parsedRaw.hook === 'string' ? parsedRaw.hook.trim() : '',
        duration: typeof parsedRaw.duration === 'string' ? parsedRaw.duration.trim() : `${archetype.minimumDurationMinutes} min`,
        isOutdoor: computedIsOutdoor,
        safetyNote:
          typeof parsedRaw.safetyNote === 'string' && parsedRaw.safetyNote.trim()
            ? parsedRaw.safetyNote.trim()
            : null,
        archetype: archetype.title,
        destinationLabel:
          typeof parsedRaw.destinationLabel === 'string' ? parsedRaw.destinationLabel.trim() : '',
        destinationQuery:
          typeof parsedRaw.destinationQuery === 'string' ? parsedRaw.destinationQuery.trim() : '',
      } as GeneratedDailyQuest;

      const normalized = applyComputedOutdoor(parsed, computedIsOutdoor);
      const v = validateGeneratedPayload(
        {
          title: normalized.title,
          mission: normalized.mission,
          hook: normalized.hook,
          destinationLabel: normalized.destinationLabel,
          destinationQuery: normalized.destinationQuery,
        },
        context,
        archetype,
        computedIsOutdoor,
      );
      if (v.ok) {
        const note = normalized.safetyNote;
        logStructured({
          domain: 'ai',
          operation: 'generateDailyQuest',
          level: 'info',
          outcome: 'ok',
          meta: {
            archetypeId: archetype.id,
            attempt: attempt + 1,
            isOutdoor: computedIsOutdoor,
          },
        });
        return {
          ...normalized,
          safetyNote:
            computedIsOutdoor && archetype.requiresOutdoor && !note
              ? 'Reste dans des zones sûres et éclairées.'
              : note,
        };
      }
      repairHint = v.reason;
    } catch {
      repairHint = repairHint ?? 'JSON incomplet ou invalide — réessaie avec tous les champs requis.';
    }
  }

  logStructured({
    domain: 'ai',
    operation: 'generateDailyQuest',
    level: 'warn',
    outcome: 'fallback',
    meta: { archetypeId: archetype.id, attempts: 2, isOutdoor: computedIsOutdoor },
  });

  return {
    icon: 'Swords',
    title: archetype.title,
    mission: archetype.description,
    hook: pickFallbackHook(profile.questDateIso, archetype.id),
    duration: `${archetype.minimumDurationMinutes} min`,
    isOutdoor: computedIsOutdoor,
    safetyNote: computedIsOutdoor ? 'Reste dans des zones sûres et éclairées.' : null,
    archetype: archetype.title,
    destinationLabel: null,
    destinationQuery: null,
  } as GeneratedDailyQuest;
}

// ── Legacy: kept for /api/quest/accept backward compat ───────────────────────

export async function generateQuestNarration(
  request: QuestNarrationRequest,
): Promise<QuestNarrationResponse> {
  const { anonymizedProfile, questModel } = request;
  const t0 = performance.now();
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Tu produis des textes courts pour une app de quêtes ludiques. Pas de conseils médicaux ni psychothérapeutiques. ${QUEST_SYSTEM_GUARDRAILS}`,
        },
        {
          role: 'user',
          content: `Génère une narration courte et motivante pour cette quête.
Quête: "${questModel.title}" - ${questModel.description}
Jour ${anonymizedProfile.dayNumber}, phase ${anonymizedProfile.phase}, écart identité-actions (indicateur) ${anonymizedProfile.congruenceDelta.toFixed(2)}.
JSON: { "title": "...", "narrative": "...", "motivationalHook": "...", "estimatedDuration": "...", "safetyReminders": [] }`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('empty');
    const durationMs = Math.round(performance.now() - t0);
    const u = completion.usage;
    logStructured({
      domain: 'ai',
      operation: 'chat.completions.narration',
      level: 'info',
      outcome: 'ok',
      durationMs,
      meta: {
        model: OPENAI_MODEL,
        questId: questModel.id,
        promptTokens: u?.prompt_tokens,
        completionTokens: u?.completion_tokens,
        totalTokens: u?.total_tokens,
      },
    });
    return JSON.parse(raw) as QuestNarrationResponse;
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    if (err instanceof Error && err.message === 'empty') {
      logStructured({
        domain: 'ai',
        operation: 'chat.completions.narration',
        level: 'warn',
        outcome: 'fallback',
        durationMs,
        meta: { model: OPENAI_MODEL, questId: questModel.id, reason: 'empty_choices' },
      });
    } else {
      logStructuredError('ai', 'chat.completions.narration', err, {
        durationMs,
        outcome: 'fallback',
        meta: { model: OPENAI_MODEL, questId: questModel.id },
      });
    }
    return {
      title: questModel.title,
      narrative: questModel.description,
      motivationalHook: pickFallbackHook(
        new Date().toISOString().slice(0, 10),
        questModel.id ?? 0,
      ),
      estimatedDuration: `${questModel.minimumDurationMinutes} min`,
      safetyReminders: [],
    };
  }
}
