import type { AppLocale } from '@questia/shared';
import { QUEST_SYSTEM_GUARDRAILS, QUEST_SYSTEM_GUARDRAILS_EN, QUEST_SYSTEM_LANG_FR } from '../ai/promptGuardrails';
import { buildCandidatesBrief } from './buildCandidatesBrief';
import { buildHistoryBrief } from './buildHistoryBrief';
import { buildProfileBrief } from './buildProfileBrief';
import { QUEST_ICON_ALLOWLIST, type QuestGenInput } from './types';

/**
 * Message système : court, ancré sur la voix et les garde-fous.
 * Pas de gymnastique sur 50 lignes — on laisse le user prompt porter la richesse.
 */
export function buildSystemPrompt(locale: AppLocale): string {
  if (locale === 'en') {
    return `You are Questia's quest narrator-creator. Your job: pick the best matching archetype from a candidate list and write today's quest for this user.

Voice: warm, grounded, second-person ("you"). One small scene in the title and hook (image, sense, micro-cinema). The mission is ONE flowing sentence with ONE clear actionable verb — never a riddle, never a paragraph, never a meta self-help puzzle.

Tailoring: read the profile, the history, and the engine reasons. Choose the candidate that fits THIS person on THIS day, not the most "creative" or "edgy" one. If a family has been completed and loved recently, you may stay in it — variety should never override genuine fit.

Never use clinical jargon ("traits", "Big Five", "extraversion"). Never invent a future-self alter ego ("the you of next year"). Never ask the user to do absurd stacked tasks in one breath.

${QUEST_SYSTEM_GUARDRAILS_EN}

Output: strict JSON only. No prose around it.`;
  }
  return `Tu es le narrateur-créateur de quêtes Questia. Ton rôle : choisir le meilleur archétype dans la liste candidate et rédiger la quête du jour pour cet·te utilisateur·rice.

Voix : chaleureuse, ancrée, à la 2ᵉ personne (tu). Une petite scène dans le titre et le hook (image, sens, micro-cinéma). La mission est UNE phrase fluide avec UN verbe d'action clair — jamais une énigme, jamais un paragraphe, jamais un casse-tête méta de développement personnel.

Ajustement : lis le profil, l'historique, les raisons du moteur. Choisis le candidat qui colle à CETTE personne CE jour, pas le plus « créatif » ou le plus « edgy ». Si une famille a été complétée et appréciée récemment, tu peux y rester — la variété ne doit JAMAIS écraser la pertinence réelle.

Pas de jargon clinique (« traits », « Big Five », « extraversion »). Pas d'« autre toi » imaginaire (« le toi de l'année prochaine »). Pas d'empilement absurde de consignes dans une même phrase.

${QUEST_SYSTEM_GUARDRAILS}

${QUEST_SYSTEM_LANG_FR}

Sortie : JSON strict uniquement. Aucun texte autour.`;
}

/**
 * Message utilisateur : tout le contexte structuré.
 */
export function buildUserPrompt(input: QuestGenInput, repairHint: string | null = null): string {
  const { profile, context, candidates, history, locale, generationSeed } = input;
  const profileBrief = buildProfileBrief(profile, locale);
  const historyBrief = buildHistoryBrief(history, locale);
  const candidatesBrief = buildCandidatesBrief(candidates, locale);

  const candidateIds = candidates.map((c) => c.archetype.id).join(', ');

  const cityLine = context.hasUserLocation
    ? locale === 'en'
      ? `City: ${context.city}, ${context.country} (you may name it)`
      : `Ville : ${context.city}, ${context.country} (tu peux la citer)`
    : locale === 'en'
      ? `City: not shared — DO NOT name a city or address; use generic phrasing.`
      : `Ville : non partagée — NE CITE PAS de ville ou d'adresse, formule de manière générique.`;

  const weatherLine = locale === 'en'
    ? `Weather: ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C — outdoor ${context.isOutdoorFriendly ? 'OK' : 'NOT recommended'}.`
    : `Météo : ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C — extérieur ${context.isOutdoorFriendly ? 'OK' : 'DÉCONSEILLÉ'}.`;

  const rerollLine = input.isReroll
    ? locale === 'en'
      ? '\nMODE: REROLL — the user already saw a quest today and asked for a different one. Pick a DIFFERENT angle (and ideally a different family if scores are close).\n'
      : '\nMODE : RELANCE — l\'utilisateur·rice a déjà vu une quête aujourd\'hui et en demande une autre. Prends un angle DIFFÉRENT (idéalement une autre famille si les scores sont proches).\n'
    : '';

  const deferLine = input.substitutedInstantAfterDefer
    ? locale === 'en'
      ? '\nMODE: AFTER DEFER — the user pushed a heavy quest. Pick a quick win that is 100% doable today, no scheduling.\n'
      : '\nMODE : APRÈS REPORT — l\'utilisateur·rice a repoussé une quête lourde. Choisis une victoire rapide, 100% faisable aujourd\'hui, sans calendrier.\n'
    : '';

  const repairBlock = repairHint
    ? locale === 'en'
      ? `\n⚠ REPAIR REQUESTED — your previous JSON was invalid: ${repairHint}\nFix and respond again with full JSON.\n`
      : `\n⚠ CORRECTION DEMANDÉE — ton JSON précédent était invalide : ${repairHint}\nCorrige et réponds avec le JSON complet.\n`
    : '';

  if (locale === 'en') {
    return `Generate today's quest.

DATE: ${context.questDateIso}
SEED: ${generationSeed}
${cityLine}
${weatherLine}
${rerollLine}${deferLine}${repairBlock}

${profileBrief}

${historyBrief}

${candidatesBrief}

YOUR JOB:
1. Pick exactly ONE archetypeId from {${candidateIds}}.
2. Write a quest tailored to THIS person and THIS day.
3. Output strict JSON only.

OUTPUT SCHEMA:
{
  "archetypeId": <one of ${candidateIds}>,
  "icon": <one of: ${[...QUEST_ICON_ALLOWLIST].join(', ')}>,
  "title": "evocative title, 4-9 words, like a chapter heading",
  "mission": "ONE single sentence, max 300 chars, max 48 words, starts with an action verb. Concrete (object, place, duration, gesture). May open with a tiny beat (time, sensation) in the same sentence. ${context.hasUserLocation && context.city ? `Naturally mention ${context.city}.` : 'No city/place names (no GPS).'}",
  "hook": "1 line, max 24 words, narrative beat — not a slogan",
  "duration": "human readable (e.g. 30 min, 1h)",
  "isOutdoor": true | false,
  "safetyNote": short string OR null,
  "destinationLabel": "real place name (e.g. Covered market) OR null if indoor",
  "destinationQuery": "geocodable text OR null if indoor",
  "selectionReason": "1 short sentence explaining WHY this archetype today",
  "selfFitScore": integer 0-100 (your honest estimate of fit)
}

ABSOLUTE RULES:
- Output JSON only.
- archetypeId MUST be in {${candidateIds}}.
- mission = ONE sentence (one period max), no semicolons between two orders, no list, no second paragraph.
- isOutdoor=true requires destinationLabel + destinationQuery (and is only allowed when weather is OK and GPS is shared).
- Match the social/outdoor flags of the chosen archetype. If chosen archetype requires social interaction, mission must explicitly include it.
- Never invent a future-self ("the you of tomorrow"), never moralize, never give medical/therapy advice.
- Stay in the user's language (English).`;
  }

  return `Génère la quête du jour.

DATE : ${context.questDateIso}
SEED : ${generationSeed}
${cityLine}
${weatherLine}
${rerollLine}${deferLine}${repairBlock}

${profileBrief}

${historyBrief}

${candidatesBrief}

TON TRAVAIL :
1. Choisis exactement UN archetypeId parmi {${candidateIds}}.
2. Rédige une quête sur mesure pour CETTE personne CE jour.
3. Réponds en JSON strict uniquement.

SCHÉMA DE SORTIE :
{
  "archetypeId": <un de ${candidateIds}>,
  "icon": <un de : ${[...QUEST_ICON_ALLOWLIST].join(', ')}>,
  "title": "titre évocateur, 4 à 9 mots, comme un titre de chapitre",
  "mission": "UNE seule phrase, max 300 caractères, max 48 mots, commence par un verbe d'action. Concrète (objet, lieu, durée, geste). Tu peux ouvrir par une courte incipit (horaire, sensation) dans la même phrase. ${context.hasUserLocation && context.city ? `Mention naturelle de ${context.city}.` : 'Pas de nom de ville/lieu (pas de GPS partagé).'}",
  "hook": "1 ligne, max 24 mots, souffle narratif — pas un slogan",
  "duration": "lisible (ex. 30 min, 1h)",
  "isOutdoor": true | false,
  "safetyNote": string court OU null,
  "destinationLabel": "nom réel du lieu (ex. Marché couvert) OU null si intérieur",
  "destinationQuery": "texte géocodable OU null si intérieur",
  "selectionReason": "1 phrase courte expliquant POURQUOI cet archétype aujourd'hui",
  "selfFitScore": entier 0-100 (ton estimation honnête de la pertinence)
}

RÈGLES ABSOLUES :
- JSON uniquement.
- archetypeId DOIT être dans {${candidateIds}}.
- mission = UNE phrase (un point max), pas de point-virgule entre deux ordres, pas de liste, pas de second paragraphe.
- isOutdoor=true exige destinationLabel + destinationQuery (et n'est autorisé que si la météo est OK et le GPS partagé).
- Respecte les flags social/extérieur de l'archétype choisi. Si l'archétype implique une interaction sociale, la mission doit l'évoquer explicitement.
- Pas d'« autre toi » du futur, pas de moralisation, pas de conseil médical ou thérapeutique.
- Reste dans la langue de l'utilisateur (français).`;
}
