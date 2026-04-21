import type { AppLocale, PersonalityVector } from '@questia/shared';
import { hasExhibitedSignal, PERSONALITY_KEYS } from '@questia/shared';
import type { GenerationProfile } from './types';

const TRAIT_LABEL_FR: Record<string, string> = {
  openness: 'curiosité / ouverture',
  conscientiousness: 'organisation / fiabilité',
  extraversion: 'énergie sociale',
  agreeableness: 'chaleur / coopération',
  emotionalStability: 'calme émotionnel',
  thrillSeeking: 'goût des sensations',
  boredomSusceptibility: 'sensibilité à la routine',
};

const TRAIT_LABEL_EN: Record<string, string> = {
  openness: 'curiosity / openness',
  conscientiousness: 'structure / reliability',
  extraversion: 'social energy',
  agreeableness: 'warmth / cooperation',
  emotionalStability: 'emotional calm',
  thrillSeeking: 'thrill appetite',
  boredomSusceptibility: 'sensitivity to routine',
};

function band(v: number, locale: AppLocale): string {
  if (locale === 'en') {
    if (v < 0.3) return 'low';
    if (v < 0.45) return 'rather low';
    if (v < 0.55) return 'balanced';
    if (v < 0.7) return 'rather high';
    return 'high';
  }
  if (v < 0.3) return 'basse';
  if (v < 0.45) return 'plutôt basse';
  if (v < 0.55) return 'équilibrée';
  if (v < 0.7) return 'plutôt haute';
  return 'haute';
}

/** Liste les 3 traits les plus saillants (les plus loin de 0.5). */
function topSalientTraits(
  vector: PersonalityVector,
  locale: AppLocale,
  count = 3,
): string[] {
  const labels = locale === 'en' ? TRAIT_LABEL_EN : TRAIT_LABEL_FR;
  const ranked = PERSONALITY_KEYS.map((k) => ({
    key: k,
    label: labels[k] ?? k,
    value: vector[k] ?? 0.5,
    deviation: Math.abs((vector[k] ?? 0.5) - 0.5),
  })).sort((a, b) => b.deviation - a.deviation);
  return ranked.slice(0, count).map((t) => `${t.label} ${band(t.value, locale)}`);
}

/** Comparaison déclaré vs observé : où le profil "dérive". */
function describeDrift(
  declared: PersonalityVector,
  exhibited: PersonalityVector,
  locale: AppLocale,
): string | null {
  if (!hasExhibitedSignal(exhibited)) return null;
  const labels = locale === 'en' ? TRAIT_LABEL_EN : TRAIT_LABEL_FR;
  const drifts: string[] = [];
  for (const k of PERSONALITY_KEYS) {
    const d = declared[k] ?? 0.5;
    const e = exhibited[k] ?? 0.5;
    const gap = e - d;
    if (Math.abs(gap) < 0.18) continue;
    const label = labels[k] ?? k;
    if (locale === 'en') {
      drifts.push(
        gap > 0
          ? `recent actions show MORE ${label} than declared`
          : `recent actions show LESS ${label} than declared`,
      );
    } else {
      drifts.push(
        gap > 0
          ? `actions récentes montrent PLUS de ${label} que déclaré`
          : `actions récentes montrent MOINS de ${label} que déclaré`,
      );
    }
  }
  if (drifts.length === 0) return null;
  return drifts.slice(0, 2).join(' ; ');
}

const PHASE_LABEL_FR: Record<string, string> = {
  calibration: 'phase de calibration (zone de confort élargie en douceur)',
  expansion: 'phase d’expansion (léger défi accepté, sortir un peu de la routine)',
  rupture: 'phase de rupture (cherche un cran mémorable, geste audacieux mais sûr)',
};

const PHASE_LABEL_EN: Record<string, string> = {
  calibration: 'calibration phase (gentle comfort-zone widening)',
  expansion: 'expansion phase (light stretch, breaks the routine)',
  rupture: 'rupture phase (memorable edge, bold but safe step)',
};

const SOCIABILITY_LABEL_FR: Record<string, string> = {
  solitary: 'préfère le solo / contact léger',
  balanced: 'mix solo–social',
  social: 'à l’aise avec le contact, énergie sociale recherchée',
};

const SOCIABILITY_LABEL_EN: Record<string, string> = {
  solitary: 'prefers solo / light contact',
  balanced: 'balanced solo / social',
  social: 'enjoys real social contact and seeks it',
};

function heavyQuestPreferenceLine(
  pref: GenerationProfile['heavyQuestPreference'] | undefined,
  locale: AppLocale,
): string {
  const p = pref ?? 'balanced';
  if (locale === 'en') {
    if (p === 'low') {
      return `- Mobility / planning-heavy quests (outings or advance scheduling): user prefers FEWER — prioritize same-day, low-logistics steps; do not push big trips or heavy setup unless the archetype already implies it.`;
    }
    if (p === 'high') {
      return `- Mobility / planning-heavy quests: user is OPEN — richer outdoor or advance-planning missions are welcome when they fit the archetype and safety.`;
    }
    return `- Mobility / planning-heavy quests: BALANCED — mix quick wins with occasional outings or light scheduling when the fit is real.`;
  }
  if (p === 'low') {
    return `- Quêtes « déplacement ou à organiser » (sortie, rythme à caler) : plutôt RARES — privilégie le faisable vite, peu de logistique ; pas de grande sortie imposée sauf si l'archétype le porte déjà.`;
  }
  if (p === 'high') {
    return `- Quêtes « déplacement ou à organiser » : plutôt SOUVENT OK — sorties ou missions à prévoir quand l'archétype et la sécurité s'y prêtent.`;
  }
  return `- Quêtes « déplacement ou à organiser » : ÉQUILIBRÉ — alterne missions du jour et sorties ou léger calendrier quand le fit est net.`;
}

/**
 * Brief profil narratif pour le prompt LLM.
 * Format compact, lisible, sans jargon.
 */
export function buildProfileBrief(profile: GenerationProfile, locale: AppLocale): string {
  const declaredTop = topSalientTraits(profile.declaredPersonality, locale, 3);
  const drift = describeDrift(
    profile.declaredPersonality,
    profile.exhibitedPersonality,
    locale,
  );
  const phaseLabel =
    (locale === 'en' ? PHASE_LABEL_EN : PHASE_LABEL_FR)[profile.phase] ?? profile.phase;
  const sociabilityLabel = profile.sociability
    ? (locale === 'en' ? SOCIABILITY_LABEL_EN : SOCIABILITY_LABEL_FR)[profile.sociability]
    : null;

  if (locale === 'en') {
    const lines = [
      `USER PROFILE`,
      `- Day ${profile.day} — ${phaseLabel}.`,
      `- Operational style: ${profile.explorerAxis === 'explorer' ? 'explorer' : 'homebody'}, ${profile.riskAxis === 'risktaker' ? 'risk-taker' : 'cautious'}.`,
      `- Salient declared traits: ${declaredTop.join(' · ')}.`,
    ];
    if (sociabilityLabel) lines.push(`- Sociability: ${sociabilityLabel}.`);
    if (drift) lines.push(`- Identity ↔ behavior gap (cong=${profile.congruenceDelta.toFixed(2)}): ${drift}. Today's quest can gently help bridge this — never moralize.`);
    else lines.push(`- Identity ↔ behavior gap (cong=${profile.congruenceDelta.toFixed(2)}): coherent. Stay in their grain.`);
    lines.push(heavyQuestPreferenceLine(profile.heavyQuestPreference, locale));
    if (profile.refinementContext) {
      lines.push(`- Stated preferences (do not cite the source): ${profile.refinementContext}`);
    }
    return lines.join('\n');
  }

  const lines = [
    `PROFIL UTILISATEUR`,
    `- Jour ${profile.day} — ${phaseLabel}.`,
    `- Style opérationnel : ${profile.explorerAxis === 'explorer' ? 'explorateur·rice' : 'casanier·ère'}, ${profile.riskAxis === 'risktaker' ? 'preneur·euse de risques' : 'prudent·e'}.`,
    `- Traits déclarés saillants : ${declaredTop.join(' · ')}.`,
  ];
  if (sociabilityLabel) lines.push(`- Sociabilité : ${sociabilityLabel}.`);
  if (drift) lines.push(`- Écart identité ↔ comportement (cong=${profile.congruenceDelta.toFixed(2)}) : ${drift}. La quête du jour peut aider à rapprocher en douceur — sans moraliser.`);
  else lines.push(`- Écart identité ↔ comportement (cong=${profile.congruenceDelta.toFixed(2)}) : cohérent. Reste dans son grain.`);
  lines.push(heavyQuestPreferenceLine(profile.heavyQuestPreference, locale));
  if (profile.refinementContext) {
    lines.push(`- Préférences exprimées (ne pas citer la source) : ${profile.refinementContext}`);
  }
  return lines.join('\n');
}
