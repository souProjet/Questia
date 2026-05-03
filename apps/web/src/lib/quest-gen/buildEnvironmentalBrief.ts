import type { AppLocale } from '@questia/shared';

/** Indice JS : 0 = dimanche … 6 = samedi (réf. midi UTC sur la date calendaire). */
function utcWeekdayIndex(questDateIso: string): number {
  const ms = Date.parse(`${questDateIso}T12:00:00.000Z`);
  if (Number.isNaN(ms)) return -1;
  return new Date(ms).getUTCDay();
}

function weekdayLong(questDateIso: string, locale: AppLocale): string {
  try {
    const d = new Date(`${questDateIso}T12:00:00.000Z`);
    return locale === 'en'
      ? d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      : d.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  } catch {
    return questDateIso;
  }
}

/**
 * Cohérence temporelle et réalité sociale : jour de la semaine, contraintes du dimanche,
 * vendredi/samedi soir — pour que la quête soit faisable et tonalement juste.
 */
export function buildEnvironmentalBrief(questDateIso: string, locale: AppLocale): string {
  const day = utcWeekdayIndex(questDateIso);
  const weekday = weekdayLong(questDateIso, locale);

  if (locale === 'en') {
    const lines: string[] = [
      'ENVIRONMENTAL COHERENCE — WEEKDAY & SOCIAL REALITY (mandatory):',
      `Today is **${weekday}** (${questDateIso}). You MUST adapt feasibility and tone of the quest to the social reality of this day where the user lives.`,
    ];
    if (day === 0) {
      lines.push(
        '• **Sunday**: Avoid quests that assume shops, administration, or weekday-only services are open; avoid defaulting to packed bars or nightlife as the frame. Prefer nearby nature, home, rest, gentle rituals, calm outdoor pockets.',
      );
    }
    if (day === 5 || day === 6) {
      lines.push(
        '• **Friday / Saturday**: Evening and night social interactions (cafés, going out, meeting people) are more plausible than on a typical weekday morning — you may lean into that when appropriate and safe, without encouraging heavy drinking or unsafe situations.',
      );
    }
    lines.push(
      'Do not assume opening hours for banks, town halls, or retail unless wording stays fully generic. **No mandatory purchase** — protect the player’s wallet.',
    );
    return lines.join('\n');
  }

  const linesFr: string[] = [
    'COHÉRENCE ENVIRONNEMENTALE — TEMPORALITÉ & RÉALITÉ SOCIALE (obligatoire) :',
    `Aujourd'hui nous sommes **${weekday}** (${questDateIso}). Adapte impérativement la faisabilité et le ton de la quête à la réalité sociale de ce jour.`,
  ];
  if (day === 0) {
    linesFr.push(
      '• **Dimanche** : évite les quêtes impliquant des commerces fermés, l’administration, ou des bars bondés comme cadre par défaut ; privilégie la nature, le foyer ou le repos.',
    );
  }
  if (day === 5 || day === 6) {
    linesFr.push(
      '• **Vendredi / samedi soir** : autorise davantage d’interactions sociales nocturnes (café, sorties, rencontres) qu’en semaine — toujours de façon sûre, sans excès ni dépense imposée.',
    );
  }
  linesFr.push(
    'Ne présuppose pas les horaires d’ouverture (banque, mairie, commerce) sauf formulation très générique. **Aucun achat obligatoire** : protège le portefeuille du joueur.',
  );
  return linesFr.join('\n');
}
