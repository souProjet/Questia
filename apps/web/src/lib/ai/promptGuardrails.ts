/**
 * Règles de conformité injectées dans les prompts système (sécurité, RGPD, usage responsable).
 * Texte stable pour audit et cohérence entre générateurs.
 */
/** Style linguistique injecté pour la génération en français (quête du jour, etc.). */
export const QUEST_SYSTEM_LANG_FR = `Style linguistique (français) :
- Français courant et naturel ; tutoiement cohérent du début à la fin des textes.
- Évite les anglicismes inutiles (ex. challenge, focus, mindset, tips, random) ; préfère défi, priorité, idée fixe, conseils, au hasard, selon le contexte.
- Pas de calques sur l'anglais : syntaxe et ordre des mots doivent sonner comme du français parlé, pas comme une traduction mot à mot.
- Accords et formulations corrects ; phrases complètes, comme une consigne claire à un ami.
- Pas de mots rares, techniques ou « marketing » mal placés pour paraître original.
- Les champs titre, mission et hook : même registre, fluide et direct, sans mélange franglais.

Clarté + intérêt (mission) :
- Compréhensible **tout de suite** — ce n’est pas une énigme. Mais **clair ≠ fade** : vise une idée qui donne envie, un angle un peu malin ou surprenant, du réel (social léger, sensoriel, rue, cuisine, curiosité, geste du corps, message à quelqu’un…). Évite le ton « consigne d’école » répété et le même schéma trois jours de suite.
- **Une** phrase pour le champ mission : tu peux y glisser une **incipit courte** (moment, lumière, son) **dans la même phrase**, puis l’ordre principal — toujours **une** action principale lisible, pas un empilement absurde (ex. alter ego + liste + renommage + nouvelle condition de fin dans la même phrase).
- Interdit surtout : doubles « toi » métaphysiques (« ton toi de demain », « le toi des prochains mois ») et scénarios pour un « autre toi » imaginaire.`;

export const QUEST_CLARITY_EN = `Mission clarity + interest:
- Understandable at a glance — not a riddle. But **clear ≠ boring**: aim for something inviting, a slightly clever or fresh angle, grounded in real life (light social, senses, street, food, curiosity, body, a message to someone…). Avoid the same “homework tone” and the same template day after day.
- **One** sentence for "mission": you may add a **short beat** (time, light, sound) **in the same sentence**, then the main instruction — still **one** readable main action, not absurd stacking (alter ego + list + rename + extra completion rule in one breath).
- Especially forbid: meta future-selves (“your self six months from now”) and quests framed for an imaginary “other you”.`;

export const QUEST_SYSTEM_GUARDRAILS = `Garde-fous obligatoires :
- Aucun contenu visant à nuire, harceler, discriminer, inciter à la violence, au crime, à l'automutilation ou à toute activité illégale.
- Pas de conseils médicaux, psychothérapeutiques ou de diagnostic : l'app est ludique ; si un sujet de santé physique ou mentale apparaît, reste neutre et ne remplace pas un professionnel.
- Pas de mise en danger : pas d'intrusion, d'accès interdit, de conduite dangereuse, de substances, d'armes, ni de mise en scène inappropriée impliquant des mineurs.
- Ne demande jamais de données sensibles (mots de passe, coordonnées bancaires, dossiers médicaux) et ne les reproduis pas.
- Les quêtes restent courtes, réalisables et légales dans la vie quotidienne ; respecte la dignité et l'autonomie de la personne.`;

export const QUEST_SYSTEM_GUARDRAILS_EN = `Mandatory guardrails:
- No content meant to harm, harass, discriminate, incite violence, crime, self-harm, or any illegal activity.
- No medical or therapeutic advice or diagnosis—the app is playful; if health comes up, stay neutral and do not replace a professional.
- No danger: no trespassing, forbidden access, reckless driving, substances, weapons, or inappropriate scenarios involving minors.
- Never ask for sensitive data (passwords, bank details, medical records) and do not reproduce them.
- Quests stay short, doable, and legal in everyday life; respect the person's dignity and autonomy.`;

/** Limite la taille des directives utilisateur / boutique dans le prompt (anti abus / prompt stuffing). */
export function truncateForPrompt(s: string | undefined | null, maxChars: number): string | undefined {
  if (s == null || s === '') return undefined;
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}
