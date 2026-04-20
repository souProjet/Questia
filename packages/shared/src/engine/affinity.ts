import type { PersonalityVector, QuestModel } from '../types';
import { ACTIVITY_PERSONALITY_CORRELATION, PERSONALITY_KEYS } from '../constants/personality';

/**
 * Score d'affinité entre un profil et un archétype, dans [0, 1] où 1 = très aligné.
 *
 * Principe :
 *  - L'archétype possède une corrélation par catégorie (ACTIVITY_PERSONALITY_CORRELATION)
 *    qui décrit, pour chaque trait Big Five + sensations, dans quel sens cette activité
 *    « pousse » naturellement (ex. social → +extraversion, calme → +emotionalStability).
 *  - L'archétype possède aussi des `targetTraits` explicites (peut être vide / partiel).
 *  - On combine les deux : la corrélation donne la signature large, les targetTraits
 *    affinent (et reçoivent un poids plus fort quand présents).
 *
 * Pour chaque dimension du profil, on calcule un score local :
 *   - si le trait du profil est élevé ET la corrélation est positive → +score
 *   - si le trait du profil est bas ET la corrélation est négative → +score (on respecte le profil)
 *   - sinon → -score (l'activité va à contre-courant du profil)
 *
 * On agrège en moyenne pondérée par la magnitude des corrélations (les dimensions
 * neutres pour cette catégorie ne pèsent pas).
 */
export function computeAffinityScore(
  profile: PersonalityVector,
  archetype: QuestModel,
  options: { exhibited?: PersonalityVector; exhibitedWeight?: number } = {},
): number {
  const correlation = ACTIVITY_PERSONALITY_CORRELATION[archetype.category];
  if (!correlation) return 0.5;

  const exhibited = options.exhibited;
  const exhibitedWeight = Math.min(0.5, Math.max(0, options.exhibitedWeight ?? 0.35));

  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of PERSONALITY_KEYS) {
    const corr = correlation[key];
    if (corr === undefined || Math.abs(corr) < 0.05) continue;

    const declared = profile[key] ?? 0.5;
    const observed = exhibited?.[key];
    const blended =
      observed === undefined
        ? declared
        : declared * (1 - exhibitedWeight) + observed * exhibitedWeight;

    // Si corr > 0 : score = blended (haut = bonne affinité)
    // Si corr < 0 : score = 1 - blended (bas = bonne affinité)
    const localScore = corr > 0 ? blended : 1 - blended;
    const weight = Math.abs(corr);
    weightedSum += localScore * weight;
    totalWeight += weight;
  }

  // Bonus / malus targetTraits : alignement explicite renforce ou pénalise.
  //
  // Budget total normalisé : on alloue un poids global `TARGET_TRAITS_BUDGET` réparti
  // entre tous les traits ciblés. Sans ça, un archétype qui cible 3 traits (poids 3×1.5=4.5)
  // écrase un archétype qui n'en cible qu'un (poids 1.5) pour un même profil — et l'algo
  // finit par ne proposer que les archétypes « larges » (audit du 2026-04 : #21 et #32
  // étaient top-1 dans > 45 % des simulations).
  const targetTraits = archetype.targetTraits;
  const targetEntries = targetTraits
    ? (Object.entries(targetTraits).filter(([, v]) => typeof v === 'number') as [
        keyof PersonalityVector,
        number,
      ][])
    : [];
  if (targetEntries.length > 0) {
    const perTraitWeight = TARGET_TRAITS_BUDGET / targetEntries.length;
    for (const [k, target] of targetEntries) {
      const declared = profile[k] ?? 0.5;
      const observed = exhibited?.[k];
      const blended =
        observed === undefined
          ? declared
          : declared * (1 - exhibitedWeight) + observed * exhibitedWeight;
      const proximity = 1 - Math.abs(blended - target);
      weightedSum += proximity * perTraitWeight;
      totalWeight += perTraitWeight;
    }
  }

  if (totalWeight === 0) return 0.5;
  const raw = weightedSum / totalWeight;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Budget de poids total alloué aux `targetTraits` dans le calcul d'affinité.
 * Équivaut à ~2 dimensions de corrélation catégorielle moyenne (|corr| moyen ≈ 0.4 × 2 = 0.8)
 * amplifiées par un facteur 1.5 pour garder leur statut de signal explicite.
 * Distribué équitablement entre les traits ciblés pour éviter la domination par le nombre.
 */
const TARGET_TRAITS_BUDGET = 2.4;
