'use server';

import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import type {
  AppLocale,
  QuestModel,
  EscalationPhase,
  ExplorerAxis,
  RiskAxis,
  PersonalityVector,
  QuestNarrationRequest,
  QuestNarrationResponse,
} from '@questia/shared';
import { promptSeedIndex, questLocalizedText } from '@questia/shared';
import {
  archetypeCategoryLabel,
  buildNarrativeVoiceBlock,
  buildPersonalityMissionHints,
  buildPersonalityPromptBlock,
  describeArchetypeTargetTraits,
} from './questGenerationPrompt';
import { logStructured, logStructuredError } from '../observability';
import {
  QUEST_CLARITY_EN,
  QUEST_SYSTEM_GUARDRAILS,
  QUEST_SYSTEM_GUARDRAILS_EN,
  QUEST_SYSTEM_LANG_FR,
  truncateForPrompt,
} from '../ai/promptGuardrails';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

/** Modèle OpenAI (`chat.completions`) — narration et usages généraux. */
const DEFAULT_OPENAI_MODEL = 'gpt-5.4';
const OPENAI_MODEL =
  (typeof process.env.OPENAI_MODEL === 'string' ? process.env.OPENAI_MODEL.trim() : '') ||
  DEFAULT_OPENAI_MODEL;

/**
 * Quête quotidienne : modèle avec échantillonnage réel (temperature / top_p).
 * Les variantes gpt-5.* ignorent souvent temperature → sorties quasi identiques d’un jour à l’autre.
 */
const DEFAULT_DAILY_QUEST_MODEL = 'gpt-4o';
const DAILY_QUEST_OPENAI_MODEL =
  (typeof process.env.OPENAI_DAILY_QUEST_MODEL === 'string' ? process.env.OPENAI_DAILY_QUEST_MODEL.trim() : '') ||
  DEFAULT_DAILY_QUEST_MODEL;

function dailyQuestModelIgnoresSampling(model: string): boolean {
  return /^gpt-5/i.test(model.trim());
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestContext {
  city: string;
  country: string;
  weatherDescription: string;
  weatherIcon: string; // Lucide icon name: Sun, CloudRain, Cloud, etc.
  temp: number;
  isOutdoorFriendly: boolean;
  /** Coordonnées GPS valides fournies par le client (permission + position) — sinon pas de lieu nommé / carte */
  hasUserLocation: boolean;
}

export interface GeneratedDailyQuest {
  icon: string; // Lucide icon name
  title: string;
  mission: string; // une phrase courte, concrète (limite côté validation)
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
  /** Phase utilisée pour le choix d'archétype (peut différer du champ profil BDD). */
  phase: EscalationPhase;
  day: number;
  /** Delta de congruence calculé (déclaré vs comportement observé). */
  congruenceDelta: number;
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  /** YYYY-MM-DD — varie le hook */
  questDateIso: string;
  /** Big Five (+ autres clés) déclaré à l'onboarding */
  declaredPersonality: PersonalityVector;
  /** Personnalité inférée depuis l'historique de quêtes */
  exhibitedPersonality: PersonalityVector;
  /** Relance du jour : exiger une formulation nettement différente */
  isRerollGeneration?: boolean;
  /** Après « Reporter » : quête de remplacement 100 % instantanée (message + contraintes) */
  substitutedInstantAfterDefer?: boolean;
  /** Préférences issues du questionnaire de raffinement (optionnel) */
  refinementContext?: string | null;
  /** Langue affichage / génération (taxonomie + prompts). Défaut : fr. */
  locale?: AppLocale;
  /** Graine stable (ex. `userId:date:phase`) pour varier les angles créatifs sans dépendre du seul archétype. */
  generationSeed?: string;
  /** Dernières missions réelles (snippet) — éviter les ressorts / gimmicks répétés à l’écriture. */
  recentMissionsAntiRepeat?: string | null;
}

// ── Phase → human label ───────────────────────────────────────────────────────

const PHASE_LABEL: Record<EscalationPhase, string> = {
  calibration: 'débutant (zone de confort proche)',
  expansion: 'en progression (léger inconfort accepté)',
  rupture: 'en rupture (challenge significatif recherché)',
};

const PHASE_LABEL_EN: Record<EscalationPhase, string> = {
  calibration: 'beginner (near comfort zone)',
  expansion: 'stretching (light discomfort OK)',
  rupture: 'breakthrough (seeking a meaningful challenge)',
};

/** Intensité perçue / stimulation : complète INTÉRÊT en ancrant l'ambition sur la phase effective. */
function phaseStimulationGuidance(locale: AppLocale, phase: EscalationPhase): string {
  if (locale === 'en') {
    switch (phase) {
      case 'calibration':
        return `PHASE FEEL (calibration): still **doable today**, but avoid generic output — one crisp novelty (object, timing, sensory detail) so the quest is not interchangeable with "any day".`;
      case 'expansion':
        return `PHASE FEEL (expansion): add a **light push** versus habit — a measurable mini-challenge, slightly bolder angle, or concrete novelty — no hollow spectacle.`;
      case 'rupture':
        return `PHASE FEEL (rupture): aim for a **memorable edge** — constructive tension or legitimate stretch within guardrails; it must not feel like yesterday's interchangeable homework.`;
    }
  }
  switch (phase) {
    case 'calibration':
      return `RESSENTI PHASE (calibration) : reste **faisable aujourd'hui**, mais évite le générique : une nouveauté nette (objet, horaire, détail sensoriel) pour que ce ne soit pas interchangeable avec « n'importe quel jour ».`;
    case 'expansion':
      return `RESSENTI PHASE (expansion) : ajoute un **léger décalage** par rapport à l'habitude — mini-défi mesurable, angle un peu plus vif, ou nouveauté concrète — sans mise en scène creuse.`;
    case 'rupture':
      return `RESSENTI PHASE (rupture) : vise un **cran mémorable** — tension constructive ou sortie de zone légitime dans les garde-fous ; ce ne doit pas ressembler à un devoir interchangeable avec hier.`;
  }
}

const PROFILE_LABEL = (e: ExplorerAxis, r: RiskAxis) => {
  const explorer = e === 'explorer' ? 'aime explorer et découvrir' : 'préfère le confort du foyer';
  const risk = r === 'risktaker' ? 'prend des risques spontanément' : 'préfère planifier et sécuriser';
  return `${explorer}, ${risk}`;
};

const PROFILE_LABEL_EN = (e: ExplorerAxis, r: RiskAxis) => {
  const explorer = e === 'explorer' ? 'likes to explore and discover' : 'prefers the comfort of home';
  const risk = r === 'risktaker' ? 'takes spontaneous risks' : 'prefers to plan and stay safe';
  return `${explorer} — ${risk}`;
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

const VAGUE_MISSION_SNIPPETS_EN = [
  'reflect on your life',
  'meditate on',
  'take time to think',
  'think about your past',
];

/** Uniquement les tournures « autre toi » / listes absurdes — pas les critères de temps légitimes. */
const ABSTRACT_META_MISSION_SNIPPETS_FR = [
  'ton toi ',
  'toi des prochains',
  'toi de demain',
  'toi du futur',
  "toi d'après",
  'le toi des',
  'jamais réunis dans une',
];

const ABSTRACT_META_MISSION_SNIPPETS_EN = [
  'future self',
  'future you',
  'never combined in a',
];

/** Phrases de secours : une par jour (et variante selon archétype) si l'API échoue — pas une seule phrase figée. */
const FALLBACK_HOOKS: string[] = [
  "Aujourd'hui, un petit pas suffit à ouvrir une porte.",
  "Ce que tu évites hier peut devenir ton jeu aujourd'hui.",
  'La curiosité est un muscle : fais une série.',
  'Personne ne voit ton courage intérieur — montre-le par un geste.',
  "Le brouillard se lève quand tu avances d'un mètre.",
  "Ta zone de confort t'attend… de l'autre côté de la porte.",
  "Un sourire à un inconnu, c'est déjà une victoire.",
  'Le monde est un terrain de jeu — choisis un coin et explore.',
  "Pas besoin d'être prêt·e : commence, puis ajuste.",
  "L'ennui est un signal : réponds avec une action minuscule.",
  'Chaque sortie est un vote pour la version de toi qui ose.',
  "Les grandes histoires commencent par un « et si j'essayais ? »",
  'Ton corps sait marcher — laisse ton esprit suivre.',
  "Aujourd'hui, privilégie le monde réel au fil d'écran.",
  "La météo dans ta tête n'est pas une fatalité.",
  'Un rituel nouveau suffit à casser le pilote automatique.',
  "Tu n'as pas à impressionner — seulement à te sentir vivant·e.",
  'Le hasard aime ceux qui bougent les pieds.',
  'Remplace « plus tard » par « dix minutes ».',
  "Ce que tu remarques en chemin compte autant que l'arrivée.",
  "L'aventure, c'est parfois juste sortir du cadre habituel.",
  "Ton futur toi remercie le geste d'aujourd'hui.",
  'Pas de spectacle : une intention honnête suffit.',
  'La ville te tend des mains invisibles — tends la tienne.',
  'Le silence du doute se coupe avec une action.',
  "Tu mérites une journée qui ne soit pas une copie d'hier.",
  'Un détail changé, et toute la journée penche différemment.',
  "Le confort, c'est bien ; l'élan, c'est mieux.",
  "Aujourd'hui, sois l'auteur d'une scène, pas le spectateur.",
  "L'énergie vient souvent après le premier pas, pas avant.",
  'Ton intuition a parfois raison avant ton cerveau.',
  'Fais une chose que ton « par défaut » éviterait.',
  'Le monde extérieur est un miroir — approche-toi.',
  'Petit effort, grand signal à toi-même.',
  "La lumière change quand tu changes d'angle.",
  "Tu n'es pas en retard : tu es au bon jour pour commencer.",
  "Choisis l'inconfort léger plutôt que la rumination.",
  "Une rencontre, un lieu, un geste — choisis l'un des trois.",
  "Aujourd'hui, écris une ligne nouvelle dans ton histoire.",
];

const FALLBACK_HOOKS_EN: string[] = [
  'Today, one small step is enough to open a door.',
  'What you avoided yesterday can become your game today.',
  'Curiosity is a muscle — do a set.',
  'No one sees your inner courage — show it with one gesture.',
  'Fog lifts when you move one meter.',
  'Your comfort zone waits… on the other side of the door.',
  'A smile at a stranger is already a win.',
  'The world is a playground — pick a corner and explore.',
  "You don't need to be ready: start, then adjust.",
  'Boredom is a signal — answer with a tiny action.',
  'Every outing is a vote for the version of you who dares.',
  'Big stories start with “what if I tried?”',
  'Your body knows how to walk — let your mind follow.',
  'Today, choose the real world over the scroll.',
  "The weather in your head isn't fate.",
  'One new ritual is enough to break autopilot.',
  "You don't have to impress — only feel alive.",
  'Luck likes people who move their feet.',
  'Swap “later” for “ten minutes.”',
  'What you notice along the way matters as much as the finish.',
  'Adventure is sometimes just stepping outside the usual frame.',
  "Your future self thanks today's gesture.",
  'No performance: honest intent is enough.',
  'The city offers invisible hands — offer yours.',
  "Doubt's silence is cut with one action.",
  "You deserve a day that isn't a copy of yesterday.",
  'Change one detail, and the whole day tilts.',
  'Comfort is fine; momentum is better.',
  'Today, be the author of a scene, not the audience.',
  'Energy often comes after the first step, not before.',
  'Your gut is sometimes right before your brain.',
  'Do one thing your “default” self would avoid.',
  'The outside world is a mirror — step closer.',
  'Small effort, big signal to yourself.',
  'Light shifts when you change the angle.',
  "You're not late — you're on the right day to start.",
  'Choose light discomfort over rumination.',
  'A meetup, a place, a gesture — pick one.',
  'Today, write a new line in your story.',
];

function pickFallbackHook(
  questDateIso: string,
  archetypeId: number,
  locale: AppLocale,
  salt?: string,
): string {
  let h = 0;
  const source = `${questDateIso}|${salt ?? ''}`;
  for (let i = 0; i < source.length; i++) {
    h = (Math.imul(31, h) + source.charCodeAt(i)) | 0;
  }
  h = (h + archetypeId * 17) | 0;
  const hooks = locale === 'en' ? FALLBACK_HOOKS_EN : FALLBACK_HOOKS;
  const idx = Math.abs(h) % hooks.length;
  return hooks[idx]!;
}

const CREATIVE_ANGLES_FR: readonly string[] = [
  "Angle du jour : partir d'un objet physique concret (papier, photo, plante, clef…) — pas seulement d'une intention abstraite.",
  'Angle du jour : ancrer la mission dans un moment précis (réveil, trajet, pause, soir) avec une durée max claire.',
  'Angle du jour : une contrainte ludique courte (3 min, 3 photos, 3 lignes écrites, 1 détail nouveau).',
  "Angle du jour : explorer un sens (ouïe, odorat, toucher) plutôt qu'une longue introspection.",
  'Angle du jour : bousculer un ordre habituel (itinéraire, ordre des tâches, fenêtre) — geste léger.',
  "Angle du jour : un clin d'œil narratif dans la même phrase que l'ordre — pas de second paragraphe.",
  'Angle du jour : interaction humaine minimale et réaliste — pas de « grand défi social ».',
  'Angle du jour : calme — une seule action, posée, bien sentie.',
  "Angle du jour : au besoin une seule ligne notée à la main, puis une action simple dans le monde réel (pas de personnage ou « autre toi »).",
  'Angle du jour : lieux génériques ou quartier sans enseigne (si pas de GPS) — éviter le cliché.',
  "Angle du jour : privilégier un fait, un déplacement, un message précis plutôt qu'un ton « motivation ».",
  "Angle du jour : varier vocabulaire et type d'action par rapport au scénario habituel de cette famille.",
  'Angle du jour : cuisine ou goût — un geste simple (ingrédient, odeur, plat imparfait accepté).',
  'Angle du jour : rue ou architecture — un détail à repérer, compter ou photographier (sans danger).',
  'Angle du jour : son, musique ou silence — une écoute ou un partage audio court.',
  'Angle du jour : message écrit bref à un proche ou collègue réel (merci, blague, nouvelle).',
  'Angle du jour : corps — escaliers, étirements, rythme cardiaque léger, avec un objectif minuscule et mesurable.',
  'Angle du jour : fenêtre sur le monde — ciel, oiseau, météo, plante ; un constat précis.',
  'Angle du jour : petite générosité ou entraide (café offert, porte tenue, truc rendu) — réaliste.',
  'Angle du jour : curiosité « pourquoi pas » — ton complice, pas moqueur ; un mini-défi qui fait sourire.',
  'Angle du jour : rangement, bricolage ou « une chose visible de réglée » — satisfaction immédiate.',
];

const CREATIVE_ANGLES_EN: readonly string[] = [
  "Today's angle: start from a physical object (paper, photo, plant, key…) — not only abstract intent.",
  "Today's angle: anchor the mission in a specific moment (wake, commute, break, evening) with a clear max duration.",
  "Today's angle: a short playful constraint (3 min, 3 photos, 3 written lines, 1 new detail).",
  "Today's angle: explore a sense (hearing, smell, touch) instead of long introspection.",
  "Today's angle: gently break a usual order (route, task order, seat, window) — light disruption.",
  "Today's angle: one narrative beat in the same sentence as the instruction — no second paragraph.",
  "Today's angle: minimal realistic human interaction — not a “big social challenge”.",
  "Today's angle: calm — one action, done with attention.",
  "Today's angle: if needed one line on paper, then one simple real-world action (no alter ego or future-self fiction).",
  "Today's angle: generic places or neighborhood without brand names (if no GPS) — avoid clichés.",
  "Today's angle: prefer a fact, a move, a precise message over generic “motivation”.",
  "Today's angle: vary wording and action type vs. the usual template for this family.",
  "Today's angle: food or taste — a simple gesture (ingredient, smell, imperfect dish OK).",
  "Today's angle: street or architecture — one detail to spot, count, or photo (safely).",
  "Today's angle: sound, music, or silence — a short listening or sharing moment.",
  "Today's angle: a brief written message to a real person (thanks, joke, news).",
  "Today's angle: body — stairs, stretch, light movement with a tiny measurable goal.",
  "Today's angle: world outside the window — sky, bird, weather, plant; one precise observation.",
  "Today's angle: small kindness (hold door, return something, buy a coffee) — realistic.",
  "Today's angle: playful “why not” — warm witty tone, not mean; a mini-challenge that sparks joy.",
  "Today's angle: tidy, fix, or finish one visible thing — immediate satisfaction.",
];

function pickCreativeAngle(locale: AppLocale, seed: string): string {
  const list = locale === 'en' ? CREATIVE_ANGLES_EN : CREATIVE_ANGLES_FR;
  return list[promptSeedIndex(seed, 'creative', list.length)]!;
}

/** Pivot créatif (tirage déterministe depuis la graine + nonce) pour éviter les quêtes « catalogue ». */
const MISSION_PIVOTS_FR: readonly string[] = [
  'Ancre la mission sur un objet déjà présent chez toi (câble, tasse, plante, clef) puis enchaîne avec une micro-action dehors ou dans l’espace partagé.',
  'Choisis un moment précis (avant le premier café, en sortant du travail, après le dîner) et une durée plafond de 12 minutes.',
  'Ajoute une contrainte ludique chiffrée : 2 photos, 4 pas de plus que d’habitude, ou 1 phrase écrite puis jetée/recyclée.',
  'Pars d’un détail sensoriel (odeur, texture, bruit de fond) qui change ta trajectoire habituelle sans en faire une introspection.',
  'Inverse un ordre routinier (autre escalier, autre file, autre chaise) comme prétexte à l’action principale.',
  'Écris une seule ligne au stylo puis exécute l’action dans les 10 minutes — pas de liste, pas de second document.',
  'Cible une interaction minimale : une phrase prononcée ou un message court à une personne réelle, sans « grand défi social ».',
  'Formule la mission comme une chasse au détail (couleur, matériau, typo sur une affiche) dans un lieu public banal.',
  'Lie l’action à un geste de soin concret (eau, lumière, rangement d’une surface visible) avant ou après un mini-déplacement.',
  'Utilise un repère météo ou lumineux du jour (ombre, reflet, goutte) comme excuse pour changer d’itinéraire.',
  'Mélange deux registres courts : corps (20 pas) + curiosité (1 question posée à quelqu’un ou notée pour toi seul·e).',
  'Impose un « lieu interdit habituel » inverse : si tu restes souvent dedans, sors 7 minutes ; si tu fuis dehors, ancre 7 minutes près d’une fenêtre ouverte.',
  'Choisis un verbe rare du quotidien (tâter, épeler, aligner, graver au doigt) et fais-en le cœur de la mission.',
  'Termine par un petit rituel de clôture (respiration, verrouillage téléphone 15 min, rangement d’un objet) explicite dans la phrase.',
  'Évite les lieux iconiques : quartier secondaire, rue parallèle, entrée de service, couloir ouvert au public.',
  'Si social : précise le canal (vocal, SMS, présentiel) et le ton (merci, blague, nouvelle factuelle) en une goutte d’humour ou de chaleur.',
  'Si créatif : une contrainte « une seule couleur visible » ou « un seul mot répété 3 fois à voix basse » intégrée à l’action.',
  'Si déplacement : nomme un repère intermédiaire (banc, passage piéton, vitrine) à toucher ou longer, pas seulement « va au parc ».',
  'Si intérieur : branche l’action sur une corvée en cours (lessive, vaisselle, courrier) transformée en micro-aventure.',
  'Si extérieur : météo comme contrainte positive (parapluie = rythme lent ; soleil = ombre à trouver 2 minutes).',
];

const MISSION_PIVOTS_EN: readonly string[] = [
  'Anchor the mission on a household object (cable, mug, plant, key) then chain one tiny outdoor or shared-space action.',
  'Pick a specific moment (before first coffee, after work, after dinner) and cap the whole thing at 12 minutes.',
  'Add a playful numeric constraint: 2 photos, 4 extra steps vs usual, or 1 handwritten line then recycle the paper.',
  'Start from a sensory detail (smell, texture, background noise) that nudges you off autopilot — not introspection.',
  'Reverse a routine order (different stairs, queue, seat) as the pretext for the main action.',
  'Write one pen line, then do the action within 10 minutes — no lists, no second document.',
  'Target minimal interaction: one real sentence or short message to a real person, not a “big social challenge”.',
  'Frame it as a detail hunt (color, material, typo on a poster) in an ordinary public place.',
  'Tie the action to concrete care (water, light, tidy one visible surface) before or after a micro-move.',
  'Use today’s weather or light cue (shadow, reflection, raindrop) as the excuse to reroute briefly.',
  'Blend two short registers: body (20 steps) + curiosity (one question to someone or a private note).',
  'Flip your usual bias: if you stay in, step out 7 minutes; if you avoid outside, spend 7 minutes by an open window.',
  'Pick an uncommon everyday verb (trace, align, skim, tap out) and make it the core of the mission.',
  'End with a tiny closing ritual (breath, phone away 15 min, pocket one object) stated in the same sentence.',
  'Avoid iconic landmarks: side street, parallel road, public corridor, back entrance vibe.',
  'If social: name the channel (voice, text, in person) and tone (thanks, joke, factual news) with a spark of warmth.',
  'If creative: one-color-only constraint or whisper one word three times woven into the action.',
  'If movement: name an intermediate landmark (bench, crosswalk, shop window) to touch or follow, not just “go to the park”.',
  'If indoors: hook to an in-flight chore (dishes, mail, laundry) turned into a micro-adventure.',
  'If outdoors: weather as a positive constraint (umbrella = slow pace; sun = find shade for 2 minutes).',
];

function pickMissionPivot(locale: AppLocale, seed: string): string {
  const list = locale === 'en' ? MISSION_PIVOTS_EN : MISSION_PIVOTS_FR;
  return list[promptSeedIndex(seed, 'pivot', list.length)]!;
}

function truncateArchetypeDescription(text: string, max = 320): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function normalizeIcon(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (ICON_ALLOWLIST.has(s)) return s;
  return 'Target';
}

function cityMustAppearInMission(city: string): boolean {
  const c = city.trim().toLowerCase();
  return c.length > 2 && c !== 'ta ville' && c !== 'your city';
}

/** Si la ville doit être présente mais que le modèle l'a omise, on complète sans rejeter toute la réponse. */
function ensureCityInMission(mission: string, city: string): string {
  const c = city.trim();
  if (!cityMustAppearInMission(city)) return mission.trim();
  const m = mission.trim();
  if (!m) return m;
  if (m.toLowerCase().includes(c.toLowerCase())) return m;
  const base = m.replace(/\s*[.!?]+\s*$/, '').trim();
  return `${base} — à ${c}.`;
}

/** Réponse de secours : texte canon de l'archétype (taxonomie), pas une variante IA. */
function buildFallbackDailyQuest(
  archetype: QuestModel,
  profile: DailyQuestProfileInput,
  computedIsOutdoor: boolean,
): GeneratedDailyQuest {
  const locale = profile.locale ?? 'fr';
  const { title, description } = questLocalizedText(archetype, locale);
  const outdoorNote =
    locale === 'en'
      ? 'Prefer busy, well-lit public places.'
      : 'Privilégie les lieux fréquentés et bien éclairés.';
  const hookSalt = `${profile.explorerAxis}_${profile.riskAxis}_${profile.day}_${Math.round(profile.congruenceDelta * 1000)}`;
  const baseHook = pickFallbackHook(profile.questDateIso, archetype.id, locale, hookSalt);
  return {
    icon: 'Swords',
    title,
    mission: clampMissionToOneSentence(description),
    hook: baseHook,
    duration: `${archetype.minimumDurationMinutes} min`,
    isOutdoor: computedIsOutdoor,
    safetyNote: computedIsOutdoor ? outdoorNote : null,
    archetype: title,
    destinationLabel: null,
    destinationQuery: null,
  };
}

const DAILY_QUEST_MAX_ATTEMPTS = 3;

/** Limite stricte : une seule phrase (marge pour le suffixe éventuel « — à Ville »). */
const MISSION_MAX_CHARS = 300;
const MISSION_MAX_WORDS = 48;

function missionWordCount(mission: string): number {
  return mission.trim().split(/\s+/).filter(Boolean).length;
}

/** Phrases séparées par [.!?] puis espace — le modèle doit n'en produire qu'une. */
function missionSentenceCount(mission: string): number {
  const t = mission.trim();
  if (!t) return 0;
  return t.split(/(?<=[.!?])\s+/).filter((p) => p.length > 0).length;
}

/** Garde-fou serveur : une seule phrase stockée (1er segment [.!?], puis avant `;` si besoin). */
function clampMissionToOneSentence(mission: string): string {
  let s = mission.trim();
  if (!s) return s;
  const parts = s.split(/(?<=[.!?])\s+/).filter((p) => p.length > 0);
  if (parts.length > 0) s = parts[0].trim();
  if (/\s*;\s/.test(s)) {
    s = s.split(/\s*;\s*/)[0].trim();
  }
  if (s.length > MISSION_MAX_CHARS) s = s.slice(0, MISSION_MAX_CHARS).trim();
  return s;
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
  locale: AppLocale,
): { ok: true } | { ok: false; reason: string } {
  const en = locale === 'en';
  const title = parsed.title.trim();
  const mission = parsed.mission.trim();
  const hook = parsed.hook.trim();

  if (title.length < 3 || title.length > 90) {
    return {
      ok: false,
      reason: en ? 'title too short or too long' : 'titre trop court ou trop long',
    };
  }
  if (mission.length < 28) {
    return {
      ok: false,
      reason: en
        ? 'mission not concrete enough (too short)'
        : 'mission pas assez concrète (trop courte)',
    };
  }
  if (/\r|\n/.test(mission)) {
    return {
      ok: false,
      reason: en
        ? 'mission must be a single line (one sentence)'
        : 'mission : une seule ligne, une phrase',
    };
  }
  if (missionSentenceCount(mission) > 1) {
    return {
      ok: false,
      reason: en
        ? 'mission must be a single sentence (one period max)'
        : 'mission : une seule phrase (pas de 2e phrase après un point)',
    };
  }
  if (/\s;\s/.test(mission)) {
    return {
      ok: false,
      reason: en
        ? 'mission: do not use semicolon between two clauses — one flowing sentence only'
        : 'mission : pas de point-virgule entre deux instructions — une seule phrase fluide',
    };
  }
  if (mission.length > MISSION_MAX_CHARS || missionWordCount(mission) > MISSION_MAX_WORDS) {
    return {
      ok: false,
      reason: en
        ? 'mission too long (one short sentence, max ~300 characters)'
        : 'mission trop longue (une phrase courte, environ 300 caractères max)',
    };
  }
  if (hook.length < 6 || hook.split(/\s+/).length > 24) {
    return {
      ok: false,
      reason: en ? 'invalid hook (length or word count)' : 'hook invalide (longueur ou nombre de mots)',
    };
  }
  const m = mission.toLowerCase();
  const vagueSnips = en ? VAGUE_MISSION_SNIPPETS_EN : VAGUE_MISSION_SNIPPETS;
  for (const bad of vagueSnips) {
    if (m.includes(bad)) {
      return {
        ok: false,
        reason: en
          ? 'mission too vague (avoid pure introspection without action)'
          : 'mission trop vague (évite la pure introspection sans action)',
      };
    }
  }
  const metaSnips = en ? ABSTRACT_META_MISSION_SNIPPETS_EN : ABSTRACT_META_MISSION_SNIPPETS_FR;
  for (const bad of metaSnips) {
    if (m.includes(bad)) {
      return {
        ok: false,
        reason: en
          ? 'mission too abstract or meta (one clear real-world action; no future-self / stacked rules)'
          : 'mission trop abstraite ou méta (une action concrète ; pas de double « toi » ni de critères empilés)',
      };
    }
  }
  if (cityMustAppearInMission(context.city) && !m.includes(context.city.trim().toLowerCase())) {
    return {
      ok: false,
      reason: en
        ? `the mission must naturally mention the city ${context.city}`
        : `la mission doit mentionner naturellement la ville ${context.city}`,
    };
  }
  if (computedIsOutdoor) {
    const label = (parsed.destinationLabel ?? '').trim();
    const query = (parsed.destinationQuery ?? '').trim();
    if (label.length < 2 || query.length < 6) {
      return {
        ok: false,
        reason: en
          ? 'outdoor quest: destinationLabel and destinationQuery required'
          : 'lieu extérieur : destinationLabel et destinationQuery requis',
      };
    }
    const badLabel =
      /^null$/i.test(label) ||
      /^undefined$/i.test(label) ||
      /^lieu de la quête$/i.test(label) ||
      /^nom (court )?du lieu$/i.test(label) ||
      /^lieu$/i.test(label) ||
      /^un lieu/i.test(label) ||
      /^quest location$/i.test(label) ||
      /^short place name$/i.test(label) ||
      /^place$/i.test(label);
    if (badLabel) {
      return {
        ok: false,
        reason: en
          ? 'destinationLabel must be a real place name (e.g. covered market, town square), not a generic placeholder'
          : 'destinationLabel doit être le nom réel du lieu (ex. marché couvert, place du village), pas un texte générique',
      };
    }
  }
  if (archetype.requiresSocial) {
    const socialHints =
      /inconnu|quelqu'un|une personne|un proche|appelle|parle|discute|rencontre|écris|message|voisin|sms|texto|invite|compliment|serveur|commerçant|collègue|ami|famille|conversation|discuter avec|parler à|stranger|someone|call |talk |chat |meet |write |message|neighbor|neighbour|text |invite|compliment|server|shopkeeper|colleague|friend|family|conversation|speak with|talk to/i;
    if (!socialHints.test(mission)) {
      return {
        ok: false,
        reason: en
          ? 'this archetype needs real social interaction — make it explicit in the mission'
          : "l'archétype implique du social : la mission doit l'évoquer clairement",
      };
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
  missionHintsBlock: string,
  categoryLabel: string,
  targetTraitsLine: string,
  repairHint: string | null,
  attemptIndex: number,
  stochasticNonce: string,
): string {
  const locale = profile.locale ?? 'fr';
  const arch = questLocalizedText(archetype, locale);
  const archetypeSummary = truncateArchetypeDescription(arch.description);
  const creativeSeed = `${profile.generationSeed ?? profile.questDateIso}|${profile.questDateIso}|${archetype.id}|a${attemptIndex}|${stochasticNonce}`;
  const creativeAngleLine = pickCreativeAngle(locale, creativeSeed);
  const missionPivotLine = pickMissionPivot(locale, creativeSeed);
  const narrativeVoiceBlock = buildNarrativeVoiceBlock(profile.phase, locale, creativeSeed);

  if (locale === 'en') {
    const rerollBlock = profile.isRerollGeneration
      ? `\nIMPORTANT: this is a REROLL — title, mission, and hook must be CLEARLY different from a first draft, same archetype.\n`
      : '';
    const deferInstantBlock = profile.substitutedInstantAfterDefer
      ? `\nCONTEXT: the user deferred a heavy quest. This mission must be 100% doable today — quick win, no multi-day sync.\n`
      : '';
    const paceBlock =
      profile.substitutedInstantAfterDefer
        ? ''
        : archetype.questPace === 'planned'
          ? `\n“Planned” pace: one CONCRETE step for today (15–45 min) in exactly ONE short sentence — no second sentence, no paragraph.\n`
          : `\n“Instant” pace: doable today without heavy scheduling.\n`;
    const repairBlock = repairHint
      ? `\nFIX REQUESTED (previous answer was invalid):\n${repairHint}\nRewrite title, mission, hook${computedIsOutdoor ? ', destinationLabel, destinationQuery' : ''} completely.\n`
      : '';
    const variationSalt = `${profile.questDateIso}|${archetype.id}|${profile.explorerAxis}|${profile.riskAxis}|${profile.congruenceDelta.toFixed(3)}|${profile.day}|${profile.generationSeed ?? 'nos'}|${repairHint ? 'r1' : 'r0'}`;
    const locationBlock = context.hasUserLocation
      ? `TODAY'S CONTEXT:
- City: ${context.city}, ${context.country}
- Weather: ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C
- Outdoor OK: ${context.isOutdoorFriendly ? 'Yes, weather is fine' : 'Not ideal (bad weather)'}`
      : `TODAY'S CONTEXT (no precise location shared):
- Do not name a city or address.
- Weather (indicative): ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C
- No mapped outdoor spot: keep missions at home, indoors, or generic (no named café, park, or shop).`;
    const noNamedPlaceBlock = !context.hasUserLocation
      ? `
NO NAMED PLACES (required):
- Do not invent venue names (restaurant, park, museum, square, brand, address).
- Use generics: “a café you haven't tried”, “a park near you”, “at home”, “somewhere quiet near you”.
`
      : '';
    return `Generate one unique daily quest for today.

VARIATION (avoid repetition): ${variationSalt}
CREATIVE DRAW ID (unique per API call): ${stochasticNonce}
ATTEMPT: ${attemptIndex + 1} of ${DAILY_QUEST_MAX_ATTEMPTS}
CREATIVE PIVOT (obey the intent; do not paste this block verbatim):
${missionPivotLine}

${rerollBlock}${deferInstantBlock}${paceBlock}${repairBlock}
DATE: ${profile.questDateIso}
- "hook": one line, max 24 words — a beat of voice-over or wink to the reader; DIFFERENT from other days.
- Avoid empty platitudes.

${locationBlock}
${noNamedPlaceBlock}

OPERATIONAL PROFILE:
- Day #${profile.day}
- Level (phase for this quest): ${PHASE_LABEL_EN[profile.phase]}
- Explorer / risk style: ${PROFILE_LABEL_EN(profile.explorerAxis, profile.riskAxis)}

${personalityBlock}

${missionHintsBlock}

${profile.recentMissionsAntiRepeat ? `\n${profile.recentMissionsAntiRepeat}\n` : ''}

${narrativeVoiceBlock}

${creativeAngleLine}

${phaseStimulationGuidance('en', profile.phase)}

PRIORITY: the mission must feel written for *this* person and *this* day — the family below is a compass, not a template to paste.
INTEREST: avoid bland “homework” quests. **Title + hook** = where the narrative lives (image, tone, tiny scene). **Mission** = one flowing sentence with one clear action (you may open with a short time/sense beat in the *same* sentence, then the imperative).
ANTI-PATTERN: do not output a “stock quest” for this category; vary object, time window, constraint, tone, and wording — two users in the same family should not get the same mission.

QUEST FAMILY (intent only; do not name the category as a label):
- ${categoryLabel}
- Archetype emphasis (light touch): ${targetTraitsLine}

${profile.refinementContext ? `USER PREFERENCES (adapt; don't cite the source):\n${profile.refinementContext}\n` : ''}

ARCHETYPE HINT (do not repeat the canonical title verbatim): “${arch.title}”
Summary (paraphrase freely; do not copy-paste): ${archetypeSummary}
Minimum duration: ${archetype.minimumDurationMinutes} minutes

ABSOLUTE RULES:
1. Mission must be CONCRETE (specific actions, objects, places, duration) — not only “reflect”. BREVITY: the "mission" field is exactly ONE grammatical sentence, under 300 characters. No second sentence after a full stop; no semicolon between two orders (use commas). You MAY start with a brief beat (time, weather, sensation) in the same sentence, then the main imperative — still one sentence, no numbered lists.
2. Must be doable TODAY${context.hasUserLocation && cityMustAppearInMission(context.city) ? ` in ${context.city}` : ''}.
3. ${!context.hasUserLocation ? 'Without shared GPS: no outdoor mapped outing — isOutdoor stays false.' : context.isOutdoorFriendly ? 'May be outdoors if isOutdoor is true.' : 'Keep indoors or sheltered.'}
4. Match duration to weather.
5. Zero clinical jargon (no Big Five, no “traits”).
6. Start the mission with an imperative verb or “Go”, “Take”, “Write”, etc.
7. isOutdoor must be EXACTLY: ${computedIsOutdoor}
8. ${computedIsOutdoor ? `If isOutdoor is true:
   - Real public place. destinationLabel = short name (e.g. “Covered market”, “Town hall square”) — NEVER “quest location”, “null”, “place name”, or placeholders.
   - destinationQuery: text to geocode (e.g. “Place name, ${context.city}, ${context.country}”).
   - GEO CONSISTENCY: place must match the mission (park if the mission says park). If local (neighborhood, café), stay near ${context.city}. If another town is described, destinationQuery must name that area clearly.` : 'If isOutdoor is false: destinationLabel and destinationQuery must be null.'}
${archetype.requiresSocial ? '9. This family needs real social interaction (stranger, friend, message, call…) — include it in the mission.\n' : ''}
10. Safety: no physical danger, no medical/therapy advice, no illegal or hateful content.
11. CLARITY: one read, one main action — no riddles, no absurd stacked meta-tasks (alter-ego + list + rename in one breath). Boring generic instructions are as bad as nonsense.
12. VOICE & NARRATION: title and hook carry mood and micro-scene (wit, warmth, edge, light imagery) — not corporate. Mission stays direct inside its single sentence.

Reply with strict JSON. Pick ONE icon name from: ${[...ICON_ALLOWLIST].join(', ')}.
{
  "icon": "...",
  "title": "evocative chapter-style title (often 4–9 words)",
  "mission": "one sentence only (under 300 chars)${context.hasUserLocation && cityMustAppearInMission(context.city) ? `; naturally mention ${context.city}` : ''}",
  "hook": "max 24 words; narrative punch, not a slogan",
  "duration": "e.g. 45 min, 1h30",
  "isOutdoor": ${computedIsOutdoor},
  "safetyNote": ${computedIsOutdoor ? 'short string or null' : 'null'},
  "destinationLabel": ${computedIsOutdoor ? `"e.g. Downtown covered market"` : 'null'},
  "destinationQuery": ${computedIsOutdoor ? `"${context.city}, ${context.country}"` : 'null'}
}`;
  }

  const rerollBlock = profile.isRerollGeneration
    ? `\nIMPORTANT : c'est une RELANCE — la formulation (titre, mission, hook) doit être NETTEMENT différente d'une première proposition, tout en restant dans le même archétype.\n`
    : '';

  const deferInstantBlock = profile.substitutedInstantAfterDefer
    ? `\nCONTEXTE : l'utilisateur a utilisé une relance pour « reporter » une quête trop lourde ou mal calée. Cette mission doit être 100 % réalisable aujourd'hui, sans multi-jours ni grosse synchro sociale — une victoire rapide et honnête.\n`
    : '';

  const paceBlock =
    profile.substitutedInstantAfterDefer
      ? ''
      : archetype.questPace === 'planned'
        ? `\nRythme « planifié » : une première étape CONCRÈTE pour aujourd'hui (15–45 min), formulée en **une seule phrase courte** — pas de 2e phrase après un point, pas de paragraphe.\n`
        : `\nRythme « instantané » : mission tenable dans la journée, sans calendrier lourd.\n`;

  const repairBlock = repairHint
    ? `\nCORRECTION DEMANDÉE (la proposition précédente était invalide) :\n${repairHint}\nRéécris entièrement title, mission, hook${computedIsOutdoor ? ', destinationLabel, destinationQuery' : ''}.\n`
    : '';

  const variationSalt = `${profile.questDateIso}|${archetype.id}|${profile.explorerAxis}|${profile.riskAxis}|${profile.congruenceDelta.toFixed(3)}|${profile.day}|${profile.generationSeed ?? 'nos'}|${repairHint ? 'r1' : 'r0'}`;

  const locationBlock = context.hasUserLocation
    ? `CONTEXTE DU JOUR :
- Ville : ${context.city}, ${context.country}
- Météo : ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C
- Sortie en extérieur : ${context.isOutdoorFriendly ? 'Oui, météo favorable' : 'Déconseillé (mauvais temps)'}`
    : `CONTEXTE DU JOUR (position non partagée ou indisponible) :
- Tu ne connais pas la zone précise de l'utilisateur — ne cite pas de ville ni d'adresse.
- Météo (indicative) : ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C
- Pas de sortie avec lieu cartographié : les missions restent chez soi, en intérieur ou formulées sans nom propre de lieu (pas de café, parc, place ou enseigne nommés).`;

  const noNamedPlaceBlock = !context.hasUserLocation
    ? `
PAS DE LIEU NOMMÉ (obligatoire) :
- N'invente aucun nom de lieu (restaurant, parc, musée, place, boutique, adresse).
- Utilise des tournures génériques : « un café que tu ne connais pas encore », « un parc de ton quartier », « chez toi », « dans un lieu calme près de chez toi ».
`
    : '';

  return `Génère une quête quotidienne unique pour aujourd'hui.

VARIATION (évite la copie) : ${variationSalt}
ID TIRAGE (unique à chaque appel API) : ${stochasticNonce}
TENTATIVE : ${attemptIndex + 1} / ${DAILY_QUEST_MAX_ATTEMPTS}
PIVOT CRÉATIF (respecte l'intention ; ne colle pas ce bloc tel quel) :
${missionPivotLine}

${rerollBlock}${deferInstantBlock}${paceBlock}${repairBlock}
DATE DU JOUR : ${profile.questDateIso}
- Le champ "hook" : une ligne, max 24 mots — petit souffle de voix off ou clin d'œil au lecteur ; DIFFÉRENTE d'un jour à l'autre.
- Évite les formules creuses (« Sois toi-même », « Crois en tes rêves »).

${locationBlock}
${noNamedPlaceBlock}

PROFIL OPÉRATIONNEL :
- Jour n°${profile.day}
- Niveau (phase effective pour cette quête) : ${PHASE_LABEL[profile.phase]}
- Tendance explorateur / risque : ${PROFILE_LABEL(profile.explorerAxis, profile.riskAxis)}

${personalityBlock}

${missionHintsBlock}

${profile.recentMissionsAntiRepeat ? `\n${profile.recentMissionsAntiRepeat}\n` : ''}

${narrativeVoiceBlock}

${creativeAngleLine}

${phaseStimulationGuidance('fr', profile.phase)}

PRIORITÉ : la mission doit sembler écrite pour **cette** personne et **ce** jour — la famille ci-dessous est une boussole, pas un modèle à recopier.
INTÉRÊT : évite les quêtes **plates**. **Titre + hook** = là où vit la narration (image, ton, micro-scène). **Mission** = **une** phrase fluide avec une action principale nette (tu peux commencer par une courte incipit — moment, sensation — **dans la même phrase**, puis l'impératif).
ANTI-RÉPÉTITION : n'invente pas une « quête catalogue » pour cette catégorie ; varie objet, créneau, contrainte, **ton**, registre et formulation — deux utilisateurs de la même famille ne doivent pas recevoir la même mission.

FAMILLE DE QUÊTE (intention seulement ; ne cite pas la catégorie comme étiquette) :
- ${categoryLabel}
- Emphase archétype (léger) : ${targetTraitsLine}

${profile.refinementContext ? `PRÉFÉRENCES UTILISATEUR (adapter la mission, sans citer la source) :\n${profile.refinementContext}\n` : ''}

INDICATION D'ARCHÉTYPE (ne répète pas le titre canon mot pour mot) : « ${arch.title} »
Résumé (paraphrase libre ; ne pas copier-coller) : ${archetypeSummary}
Durée minimale : ${archetype.minimumDurationMinutes} minutes

RÈGLES ABSOLUES :
1. La mission doit être CONCRÈTE (actions précises, objets, lieux, durée) — pas seulement « réfléchir ». CONCISION : le champ "mission" est **une seule phrase grammaticale**, **moins de 300 caractères** au total (espaces compris). Pas de 2e phrase après un point final ; **pas de point-virgule** entre deux ordres (un seul fil avec des virgules). Tu **peux** commencer par une courte incipit (horaire, météo, sensation) **dans la même phrase**, puis l'action principale à l'impératif — pas de liste numérotée ni de paragraphe.
2. Elle doit être faisable AUJOURD'HUI${context.hasUserLocation && cityMustAppearInMission(context.city) ? ` à ${context.city}` : ''}.
3. ${!context.hasUserLocation ? 'Sans position GPS partagée : pas de sortie extérieure avec lieu sur carte — isOutdoor reste false.' : context.isOutdoorFriendly ? 'Peut se passer en extérieur si isOutdoor est true.' : 'Doit se passer en intérieur ou sous abri.'}
4. Adapte la durée à la météo.
5. Zéro jargon psychologique ou clinique (pas de Big Five, pas de « traits »).
6. Commence la mission par un verbe d'action à l'impératif ou « Va », « Prends », « Écris », etc.
7. isOutdoor doit être EXACTEMENT : ${computedIsOutdoor}
8. ${computedIsOutdoor ? `Si isOutdoor true :
   - Lieu public réel et identifiable. destinationLabel = nom court (ex. « Marché couvert », « Place de la Mairie ») — JAMAIS « lieu de la quête », « null », « nom du lieu » ni placeholder.
   - destinationQuery : texte pour géocoder le lieu (ex. « Nom du lieu, ${context.city}, ${context.country} »).
   - COHÉRENCE GÉO : le lieu doit coller à la mission (même type de lieu : parc si la mission parle d'un parc). Si la mission est locale (quartier, village, rencontre du jour, café du coin), reste dans l'aire de ${context.city}. Si la mission décrit explicitement un autre lieu, une autre commune ou un déplacement plus large, destinationQuery doit nommer clairement cette zone pour que le point sur la carte soit pertinent.` : 'Si isOutdoor false : destinationLabel et destinationQuery à null.'}
${archetype.requiresSocial ? '9. Cette famille implique une interaction sociale réelle (inconnu, proche, message, appel…) — intègre-la dans la mission.\n' : ''}
10. Respecte les garde-fous de sécurité : pas de danger physique, pas de conseils médicaux ou thérapeutiques, pas d'incitation à l'illégalité ou à la haine.
11. LANGUE : tous les champs texte (title, mission, hook, duration, safetyNote, destinationLabel) en **français naturel** — pas d'anglicismes ni de mots anglais dans la phrase, pas de tournure calquée sur l'anglais ; phrases courtes et idiomatiques.
12. **CLARTÉ** : compréhension immédiate, **une** action principale — pas d'énigme, pas d'empilement absurde (alter ego + liste + renommage dans le même souffle). Les consignes **fades** type devoir scolaire sont à éviter autant que le charabia.
13. **VOIX & NARRATION** : titre et hook portent l'ambiance et une micro-scène (malice, chaleur, image légère) — pas de style corporate ; la mission reste directe dans sa phrase unique.

Réponds en JSON strict. Pour "icon" choisis UN SEUL nom dans cette liste : ${[...ICON_ALLOWLIST].join(', ')}.
{
  "icon": "...",
  "title": "titre évocateur, souvent 4 à 9 mots, comme un titre de chapitre",
  "mission": "une seule phrase (moins de 300 caractères)${context.hasUserLocation && cityMustAppearInMission(context.city) ? ` ; mention naturelle de ${context.city}` : ''}",
  "hook": "max 24 mots ; coup de voix, pas un slogan",
  "duration": "ex: 45 min, 1h30",
  "isOutdoor": ${computedIsOutdoor},
  "safetyNote": ${computedIsOutdoor ? 'string court ou null' : 'null'},
  "destinationLabel": ${computedIsOutdoor ? `"ex: Marché couvert du centre"` : 'null'},
  "destinationQuery": ${computedIsOutdoor ? `"${context.city}, ${context.country}"` : 'null'}
}`;
}

async function callDailyQuestModel(user: string, system: string, temperature: number): Promise<string> {
  const model = DAILY_QUEST_OPENAI_MODEL;
  const samplingDisabled = dailyQuestModelIgnoresSampling(model);
  const t0 = performance.now();
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...(samplingDisabled
        ? {}
        : {
            temperature,
            top_p: 0.94,
          }),
      max_completion_tokens: 600,
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
        meta: {
          model,
          emptyChoices: true,
          temperature: samplingDisabled ? undefined : temperature,
          samplingDisabled,
        },
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
        model,
        temperature: samplingDisabled ? undefined : temperature,
        samplingDisabled,
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
      meta: { model, temperature: samplingDisabled ? undefined : temperature, samplingDisabled },
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
    recentMissionsAntiRepeat:
      truncateForPrompt(profile.recentMissionsAntiRepeat ?? undefined, 2200) ??
      profile.recentMissionsAntiRepeat ??
      null,
  };

  const locale = safeProfile.locale ?? 'fr';

  const system =
    locale === 'en'
      ? `You are Questia's quest narrator-creator. You write short daily quests that feel human: a little scene-setting in the title and hook, one crisp actionable sentence for the mission. Warm, direct "you". Never clinical psychology jargon or "traits" / Big Five. No prerequisites. Match social exposure to the profile in the message without naming scores. The quest family is a compass, not a script to paste.
Each message has a unique draw id and pivots: use them to avoid copy-paste defaults, but never sacrifice voice — readers should feel tone, image, and companionship, not a product spec.

${QUEST_SYSTEM_GUARDRAILS_EN}

${QUEST_CLARITY_EN}`
      : `Tu es le narrateur-créateur de quêtes de Questia. Tu écris des quêtes courtes qui sonnent humaines : un peu de mise en scène dans le titre et le hook, une phrase d'action nette pour la mission. Tutoiement chaleureux et direct. Jamais de jargon psychologique clinique ni de « traits » ou Big Five. Aucun prérequis. Adapte l'exposition sociale au profil du message sans citer de scores. La famille de quête est une boussole, pas un texte à recoller.
Chaque message inclut un id de tirage et des pivots : sers-t'en pour éviter les formulations toutes faites, mais ne sacrifie jamais la voix — on doit sentir le ton, l'image, la complicité, pas une notice produit.

${QUEST_SYSTEM_GUARDRAILS}

${QUEST_SYSTEM_LANG_FR}`;

  const computedIsOutdoor =
    context.hasUserLocation && context.isOutdoorFriendly && archetype.requiresOutdoor;
  const personalityBlock = buildPersonalityPromptBlock(
    safeProfile.declaredPersonality,
    safeProfile.exhibitedPersonality,
    safeProfile.congruenceDelta,
    locale,
  );
  const missionHintsBlock = buildPersonalityMissionHints(
    safeProfile.declaredPersonality,
    safeProfile.exhibitedPersonality,
    locale,
  );
  const categoryLabel = archetypeCategoryLabel(archetype.category, locale);
  const targetTraitsLine = describeArchetypeTargetTraits(archetype, locale);

  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (!hasOpenAiKey) {
    logStructured({
      domain: 'ai',
      operation: 'generateDailyQuest',
      level: 'warn',
      outcome: 'skipped',
      meta: {
        reason: 'OPENAI_API_KEY missing or empty',
        archetypeId: archetype.id,
      },
    });
    return buildFallbackDailyQuest(archetype, safeProfile, computedIsOutdoor);
  }

  let repairHint: string | null = null;

  for (let attempt = 0; attempt < DAILY_QUEST_MAX_ATTEMPTS; attempt++) {
    try {
      const stochasticNonce = randomUUID();
      const user = buildUserPrompt(
        safeProfile,
        archetype,
        context,
        computedIsOutdoor,
        personalityBlock,
        missionHintsBlock,
        categoryLabel,
        targetTraitsLine,
        repairHint,
        attempt,
        stochasticNonce,
      );
      const temperature = profile.isRerollGeneration
        ? attempt === 0
          ? 0.92
          : attempt === 1
            ? 0.76
            : 0.66
        : attempt === 0
          ? 0.9
          : attempt === 1
            ? 0.72
            : 0.6;
      const raw = await callDailyQuestModel(user, system, temperature);
      const parsedRaw = JSON.parse(raw) as Record<string, unknown>;

      const parsed = {
        ...parsedRaw,
        icon: normalizeIcon(parsedRaw.icon ?? parsedRaw.emoji),
        title: typeof parsedRaw.title === 'string' ? parsedRaw.title.trim() : '',
        mission: ensureCityInMission(
          clampMissionToOneSentence(
            typeof parsedRaw.mission === 'string' ? parsedRaw.mission.trim() : '',
          ),
          context.city,
        ),
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
        locale,
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
              ? locale === 'en'
                ? 'Prefer busy, well-lit public places.'
                : 'Privilégie les lieux fréquentés et bien éclairés.'
              : note,
        };
      }
      repairHint = v.reason;
    } catch {
      repairHint =
        repairHint ??
        (locale === 'en'
          ? 'Incomplete or invalid JSON — retry with all required fields.'
          : 'JSON incomplet ou invalide — réessaie avec tous les champs requis.');
    }
  }

  logStructured({
    domain: 'ai',
    operation: 'generateDailyQuest',
    level: 'warn',
    outcome: 'fallback',
    meta: {
      archetypeId: archetype.id,
      attempts: DAILY_QUEST_MAX_ATTEMPTS,
      isOutdoor: computedIsOutdoor,
      lastRepairHint: repairHint ?? undefined,
    },
  });

  return buildFallbackDailyQuest(archetype, safeProfile, computedIsOutdoor);
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
          content: `Tu produis des textes courts pour une app de quêtes ludiques. Pas de conseils médicaux ni psychothérapeutiques. ${QUEST_SYSTEM_GUARDRAILS} ${QUEST_SYSTEM_LANG_FR}`,
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
      max_completion_tokens: 300,
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
        'fr',
      ),
      estimatedDuration: `${questModel.minimumDurationMinutes} min`,
      safetyReminders: [],
    };
  }
}
