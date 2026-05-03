import type { AppLocale } from '@questia/shared';
import { QUEST_SYSTEM_GUARDRAILS, QUEST_SYSTEM_GUARDRAILS_EN, QUEST_SYSTEM_LANG_FR } from '../ai/promptGuardrails';
import { buildCreativeConstraints } from './buildCreativeConstraints';
import { buildHistoryBrief } from './buildHistoryBrief';
import { buildProfileBrief } from './buildProfileBrief';
import { QUEST_ICON_ALLOWLIST, type QuestGenInput } from './types';

/**
 * Message système : voix créative sans liste d'archétypes imposée.
 */
export function buildSystemPrompt(locale: AppLocale): string {
  if (locale === 'en') {
    return `You are Questia's quest narrator-creator. Your job: invent an ORIGINAL quest from scratch for this user today, guided ONLY by the engine brief (family, intensity, duration, weather, profile, history).

Voice: warm, grounded, second-person ("you"). One small scene in the title and hook (image, sense, micro-cinema). The mission is ONE flowing sentence with ONE clear actionable verb — never a riddle, never a paragraph, never a meta self-help puzzle.

Constraints: follow the psychological family and intensity in the ENGINE BRIEF. Do NOT reuse taxonomy titles/phrases verbatim — they are sparks only. Stay concrete and doable today.

Never use clinical jargon ("traits", "Big Five", "extraversion"). Never invent a future-self alter ego ("the you of next year"). Never ask the user to do absurd stacked tasks in one breath.

${QUEST_SYSTEM_GUARDRAILS_EN}

Output: strict JSON only. No prose around it.`;
  }
  return `Tu es le narrateur-créateur de quêtes Questia. Ton rôle : inventer une quête ORIGINALE de toutes pièces pour ce jour, en suivant UNIQUEMENT la consigne moteur (famille, intensité, durée, météo, profil, historique).

Voix : chaleureuse, ancrée, à la 2ᵉ personne (tu). Une petite scène dans le titre et le hook (image, sens, micro-cinéma). La mission est UNE phrase fluide avec UN verbe d'action clair — jamais une énigme, jamais un paragraphe, jamais un casse-tête méta de développement personnel.

Contraintes : respecte la famille psychologique et l'intensité du BRIEF MOTEUR. Ne recopie PAS les titres/phrases de la taxonomie — ce ne sont que des étincelles. Reste concrèt·e et faisable aujourd'hui.

Pas de jargon clinique (« traits », « Big Five », « extraversion »). Pas d'« autre toi » imaginaire (« le toi de l'année prochaine »). Pas d'empilement absurde de consignes dans une même phrase.

${QUEST_SYSTEM_GUARDRAILS}

${QUEST_SYSTEM_LANG_FR}

Sortie : JSON strict uniquement. Aucun texte autour.`;
}

/**
 * Message utilisateur : tout le contexte structuré.
 */
export function buildUserPrompt(input: QuestGenInput, repairHint: string | null = null): string {
  const { profile, context, questParameters, history, locale, generationSeed } = input;
  const profileBrief = buildProfileBrief(profile, locale);
  const historyBrief = buildHistoryBrief(history, locale);
  const creativeBrief = buildCreativeConstraints(questParameters, locale, context.questDateIso);

  const expectedCategory = questParameters.primaryCategory;

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
      ? '\nMODE: REROLL — the user already saw a quest today and asked for a different one. Invent a clearly DIFFERENT angle while staying in the same psychological family unless impossible.\n'
      : '\nMODE : RELANCE — l\'utilisateur·rice a déjà vu une quête aujourd\'hui et en demande une autre. Invente un angle CLAIREMENT différent tout en restant dans la même famille psychologique sauf impossibilité.\n'
    : '';

  const deferLine = input.substitutedInstantAfterDefer
    ? locale === 'en'
      ? '\nMODE: AFTER DEFER — the user pushed a heavy quest. Invent a quick win that is 100% doable today, no scheduling.\n'
      : '\nMODE : APRÈS REPORT — l\'utilisateur·rice a repoussé une quête lourde. Invente une victoire rapide, 100% faisable aujourd\'hui, sans calendrier.\n'
    : '';

  const repairBlock = repairHint
    ? locale === 'en'
      ? `\n⚠ REPAIR REQUESTED — your previous JSON was invalid: ${repairHint}\nFix and respond again with full JSON.\n`
      : `\n⚠ CORRECTION DEMANDÉE — ton JSON précédent était invalide : ${repairHint}\nCorrige et réponds avec le JSON complet.\n`
    : '';

  const { questDurationMinMinutes: dMin, questDurationMaxMinutes: dMax } = context;
  const durationPrefs =
    locale === 'en'
      ? `\nQUEST DURATION: the "duration" field must describe a real-world time between ${dMin} and ${dMax} minutes (target ~${questParameters.idealDurationMinutes} min). Stay inside this range.\n`
      : `\nDURÉE DE QUÊTE : le champ "duration" doit correspondre à une durée réelle entre ${dMin} et ${dMax} minutes (cible ~${questParameters.idealDurationMinutes} min). Reste dans cette plage.\n`;

  if (locale === 'en') {
    return `Create today's quest from scratch (full creative generation).

DATE: ${context.questDateIso}
SEED: ${generationSeed}
${cityLine}
${weatherLine}
${durationPrefs}${rerollLine}${deferLine}${repairBlock}

${profileBrief}

${historyBrief}

${creativeBrief}

YOUR JOB:
1. Invent a completely NEW quest (do not pick from a candidate list — there is none).
2. Set "psychologicalCategory" EXACTLY to "${expectedCategory}" (required).
3. Set "requiresSocial" to true only if the mission needs real interaction with a person today.
4. Output strict JSON only.

OUTPUT SCHEMA:
{
  "psychologicalCategory": "${expectedCategory}",
  "requiresSocial": true | false,
  "icon": <one of: ${[...QUEST_ICON_ALLOWLIST].join(', ')}>,
  "title": "evocative title, 4-9 words, like a chapter heading",
  "mission": "ONE single sentence, max 300 chars, max 48 words, starts with an action verb. Concrete (object, place, duration, gesture). May open with a tiny beat (time, sensation) in the same sentence. ${context.hasUserLocation && context.city ? `Naturally mention ${context.city}.` : 'No city/place names (no GPS).'}",
  "hook": "1 line, max 24 words, narrative beat — not a slogan",
  "duration": "human readable (e.g. 30 min, 1h)",
  "isOutdoor": true | false,
  "safetyNote": short string OR null,
  "destinationLabel": "real place name (e.g. Covered market) OR null if indoor",
  "destinationQuery": "geocodable text OR null if indoor",
  "selectionReason": "1 short sentence explaining your creative angle today",
  "selfFitScore": integer 0-100 (your honest estimate of fit)
}

ABSOLUTE RULES:
- Output JSON only.
- psychologicalCategory MUST be exactly "${expectedCategory}".
- mission = ONE sentence (one period max), no semicolons between two orders, no list, no second paragraph.
- isOutdoor=true requires destinationLabel + destinationQuery (and is only allowed when weather is OK and GPS is shared).
- If requiresSocial=true, the mission must explicitly involve talking / meeting / messaging someone real.
- Never invent a future-self ("the you of tomorrow"), never moralize, never give medical/therapy advice.
- Stay in the user's language (English).`;
  }

  return `Crée la quête du jour de toutes pièces (génération libre intégrale).

DATE : ${context.questDateIso}
SEED : ${generationSeed}
${cityLine}
${weatherLine}
${durationPrefs}${rerollLine}${deferLine}${repairBlock}

${profileBrief}

${historyBrief}

${creativeBrief}

TON TRAVAIL :
1. Invente une quête ENTIÈREMENT nouvelle (aucune liste de candidats — il n'y en a pas).
2. Fixe "psychologicalCategory" EXACTEMENT à "${expectedCategory}" (obligatoire).
3. Mets "requiresSocial" à true seulement si la mission exige une vraie interaction avec une personne aujourd'hui.
4. Réponds en JSON strict uniquement.

SCHÉMA DE SORTIE :
{
  "psychologicalCategory": "${expectedCategory}",
  "requiresSocial": true | false,
  "icon": <un de : ${[...QUEST_ICON_ALLOWLIST].join(', ')}>,
  "title": "titre évocateur, 4 à 9 mots, comme un titre de chapitre",
  "mission": "UNE seule phrase, max 300 caractères, max 48 mots, commence par un verbe d'action. Concrète (objet, lieu, durée, geste). Tu peux ouvrir par une courte incipit (horaire, sensation) dans la même phrase. ${context.hasUserLocation && context.city ? `Mention naturelle de ${context.city}.` : 'Pas de nom de ville/lieu (pas de GPS partagé).'}",
  "hook": "1 ligne, max 24 mots, souffle narratif — pas un slogan",
  "duration": "lisible (ex. 30 min, 1h)",
  "isOutdoor": true | false,
  "safetyNote": string court OU null,
  "destinationLabel": "nom réel du lieu (ex. Marché couvert) OU null si intérieur",
  "destinationQuery": "texte géocodable OU null si intérieur",
  "selectionReason": "1 phrase courte expliquant ton angle créatif du jour",
  "selfFitScore": entier 0-100 (ton estimation honnête de la pertinence)
}

RÈGLES ABSOLUES :
- JSON uniquement.
- psychologicalCategory DOIT être exactement "${expectedCategory}".
- mission = UNE phrase (un point max), pas de point-virgule entre deux ordres, pas de liste, pas de second paragraphe.
- isOutdoor=true exige destinationLabel + destinationQuery (et n'est autorisé que si la météo est OK et le GPS partagé).
- Si requiresSocial=true, la mission doit évoquer explicitement parole / rencontre / message à quelqu'un de réel.
- Pas d'« autre toi » du futur, pas de moralisation, pas de conseil médical ou thérapeutique.
- Reste dans la langue de l'utilisateur (français).`;
}
