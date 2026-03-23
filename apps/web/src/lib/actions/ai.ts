'use server';

import OpenAI from 'openai';
import type { QuestModel, EscalationPhase, ExplorerAxis, RiskAxis } from '@dopamode/shared';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestContext {
  city: string;
  country: string;
  weatherDescription: string;
  weatherIcon: string;   // Lucide icon name: Sun, CloudRain, Cloud, etc.
  temp: number;
  isOutdoorFriendly: boolean;
}

export interface GeneratedDailyQuest {
  icon: string;  // Lucide icon name
  title: string;
  mission: string;       // 2-3 sentences, concrete actions
  hook: string;          // short motivational punch line
  duration: string;      // human readable
  isOutdoor: boolean;
  safetyNote: string | null;
  archetype: string;     // archetype name for display
  /** Lieu public pour carte / itinéraire (null si intérieur) */
  destinationLabel: string | null;
  /** Recherche type Google Maps : lieu + ville + pays */
  destinationQuery: string | null;
}

// ── Phase → human label ───────────────────────────────────────────────────────

const PHASE_LABEL: Record<EscalationPhase, string> = {
  calibration: 'débutant (zone de confort proche)',
  expansion:   'en progression (léger inconfort accepté)',
  rupture:     'en rupture (challenge significatif recherché)',
};

const PROFILE_LABEL = (e: ExplorerAxis, r: RiskAxis) => {
  const explorer = e === 'explorer' ? 'aime explorer et découvrir' : 'préfère le confort du foyer';
  const risk = r === 'risktaker' ? 'prend des risques spontanément' : 'préfère planifier et sécuriser';
  return `${explorer}, ${risk}`;
};

// ── Main: generate a full unique daily quest ──────────────────────────────────

export async function generateDailyQuest(
  profile: {
    phase: EscalationPhase;
    day: number;
    delta: number;
    explorerAxis: ExplorerAxis;
    riskAxis: RiskAxis;
  },
  archetype: QuestModel,
  context: QuestContext,
): Promise<GeneratedDailyQuest> {
  const system = `Tu es le créateur de quêtes de Dopamode. Tu génères des aventures quotidiennes uniques, concrètes et réalisables. Tu t'adresses à l'utilisateur en le tutoyant, avec un ton chaleureux et direct. Jamais de jargon psychologique. Chaque quête doit être faisable par n'importe qui, même sans expérience.`;

  const user = `Génère une quête quotidienne unique pour aujourd'hui.

CONTEXTE DU JOUR :
- Ville : ${context.city}, ${context.country}
- Météo : ${context.weatherIcon} ${context.weatherDescription}, ${Math.round(context.temp)}°C
- Sortie en extérieur : ${context.isOutdoorFriendly ? 'Oui, météo favorable' : 'Déconseillé (mauvais temps)'}

PROFIL UTILISATEUR :
- Jour n°${profile.day} de son aventure
- Niveau : ${PHASE_LABEL[profile.phase]}
- Personnalité : ${PROFILE_LABEL(profile.explorerAxis, profile.riskAxis)}

ARCHÉTYPE SÉLECTIONNÉ : "${archetype.title}"
Concept : ${archetype.description}
Durée minimale : ${archetype.minimumDurationMinutes} minutes

RÈGLES ABSOLUES :
1. La mission doit être CONCRÈTE (des actions précises, pas "réfléchis à ta vie")
2. Elle doit être faisable AUJOURD'HUI à ${context.city} par n'importe qui
3. ${context.isOutdoorFriendly ? "Peut se passer en extérieur" : "Doit se passer en intérieur ou sous abri"}
4. Adapte la durée à la météo et à la ville
5. Zéro jargon technique ou psychologique
6. Commence la mission par un verbe d'action
7. Si la quête est EN EXTÉRIEUR (isOutdoor true), propose UN lieu public réel et accessible à ${context.city} (parc, place, quai, jardin…). Remplis destinationLabel (nom court) et destinationQuery (phrase complète type recherche Google Maps : lieu + ville + pays). Si la quête est en intérieur (isOutdoor false), mets destinationLabel et destinationQuery à null.

Réponds en JSON strict. Pour "icon" choisis UN SEUL nom dans cette liste (sans rien d'autre) : Swords, Camera, Coffee, Mic, Compass, Sparkles, TreePine, MapPin, Target, BookOpen, UtensilsCrossed, Drama, Leaf, Navigation, Flower.
{
  "icon": "nom d'icône dans la liste ci-dessus",
  "title": "titre court (4-6 mots max), intrigant",
  "mission": "la mission complète en 2-3 phrases précises, actions concrètes, mention naturelle de ${context.city}",
  "hook": "une phrase percutante et motivante (max 15 mots)",
  "duration": "durée réaliste (ex: 1h30, 45 min, toute la journée)",
  "isOutdoor": ${context.isOutdoorFriendly && archetype.requiresOutdoor},
  "safetyNote": ${archetype.requiresOutdoor && context.isOutdoorFriendly ? '"une note de sécurité courte si nécessaire, sinon null"' : 'null'},
  "destinationLabel": ${context.isOutdoorFriendly && archetype.requiresOutdoor ? `"ex: Parc des Buttes-Chaumont"` : 'null'},
  "destinationQuery": ${context.isOutdoorFriendly && archetype.requiresOutdoor ? `"ex: Parc des Buttes-Chaumont, ${context.city}, ${context.country}"` : 'null'}
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 520,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty response');

    const parsed = JSON.parse(raw) as (GeneratedDailyQuest & { emoji?: string });
    const icon = parsed.icon ?? parsed.emoji ?? 'Target';
    const destinationLabel =
      typeof parsed.destinationLabel === 'string' ? parsed.destinationLabel.trim() || null : null;
    const destinationQuery =
      typeof parsed.destinationQuery === 'string' ? parsed.destinationQuery.trim() || null : null;
    return {
      ...parsed,
      icon,
      archetype: archetype.title,
      destinationLabel,
      destinationQuery,
    };
  } catch {
    // Graceful fallback
    return {
      icon: 'Swords',
      title: archetype.title,
      mission: archetype.description,
      hook: 'Chaque jour est une chance de te surprendre toi-même.',
      duration: `${archetype.minimumDurationMinutes} min`,
      isOutdoor: archetype.requiresOutdoor && context.isOutdoorFriendly,
      safetyNote: archetype.requiresOutdoor ? 'Reste dans des zones sûres et éclairées.' : null,
      archetype: archetype.title,
      destinationLabel: null,
      destinationQuery: null,
    } as GeneratedDailyQuest;
  }
}

// ── Legacy: kept for /api/quest/accept backward compat ───────────────────────

import type { QuestNarrationRequest, QuestNarrationResponse } from '@dopamode/shared';

export async function generateQuestNarration(
  request: QuestNarrationRequest,
): Promise<QuestNarrationResponse> {
  const { anonymizedProfile, questModel } = request;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Génère une narration courte et motivante pour cette quête.
Quête: "${questModel.title}" - ${questModel.description}
Jour ${anonymizedProfile.dayNumber}, phase ${anonymizedProfile.phase}.
JSON: { "title": "...", "narrative": "...", "motivationalHook": "...", "estimatedDuration": "...", "safetyReminders": [] }`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('empty');
    return JSON.parse(raw) as QuestNarrationResponse;
  } catch {
    return {
      title: questModel.title,
      narrative: questModel.description,
      motivationalHook: 'Chaque quête est une chance de te redécouvrir.',
      estimatedDuration: `${questModel.minimumDurationMinutes} min`,
      safetyReminders: [],
    };
  }
}
