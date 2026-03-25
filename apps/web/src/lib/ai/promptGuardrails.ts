/**
 * Règles de conformité injectées dans les prompts système (sécurité, RGPD, usage responsable).
 * Texte stable pour audit et cohérence entre générateurs.
 */
export const QUEST_SYSTEM_GUARDRAILS = `Garde-fous obligatoires :
- Aucun contenu visant à nuire, harceler, discriminer, inciter à la violence, au crime, à l’automutilation ou à toute activité illégale.
- Pas de conseils médicaux, psychothérapeutiques ou de diagnostic : l’app est ludique ; si un sujet de santé physique ou mentale apparaît, reste neutre et ne remplace pas un professionnel.
- Pas de mise en danger : pas d’intrusion, d’accès interdit, de conduite dangereuse, de substances, d’armes, ni de mise en scène inappropriée impliquant des mineurs.
- Ne demande jamais de données sensibles (mots de passe, coordonnées bancaires, dossiers médicaux) et ne les reproduis pas.
- Les quêtes restent courtes, réalisables et légales dans la vie quotidienne ; respecte la dignité et l’autonomie de la personne.`;

/** Limite la taille des directives utilisateur / boutique dans le prompt (anti abus / prompt stuffing). */
export function truncateForPrompt(s: string | undefined | null, maxChars: number): string | undefined {
  if (s == null || s === '') return undefined;
  const t = s.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}
