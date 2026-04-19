import type { AppLocale } from '@questia/shared';
import type { GenerationHistoryItem } from './types';

const STATUS_LABEL_FR: Record<GenerationHistoryItem['status'], string> = {
  completed: '✓ complétée',
  accepted: '· acceptée',
  rejected: '✗ refusée',
  abandoned: '✗ abandonnée',
  pending: '· en attente',
  replaced: '↻ remplacée',
};

const STATUS_LABEL_EN: Record<GenerationHistoryItem['status'], string> = {
  completed: '✓ completed',
  accepted: '· accepted',
  rejected: '✗ rejected',
  abandoned: '✗ abandoned',
  pending: '· pending',
  replaced: '↻ replaced',
};

/**
 * Brief historique : 5 dernières quêtes du plus récent au plus ancien.
 * Sert deux objectifs simultanés au LLM :
 *  - éviter la répétition stylistique (mêmes verbes, mêmes scènes, mêmes objets)
 *  - capter ce que la personne a aimé / rejeté pour ajuster le ton
 */
export function buildHistoryBrief(
  history: GenerationHistoryItem[],
  locale: AppLocale,
  limit = 5,
): string {
  if (history.length === 0) {
    return locale === 'en'
      ? 'RECENT HISTORY: none — first quests; favor a reassuring opening that still feels personal.'
      : 'HISTORIQUE RÉCENT : aucun — premières quêtes ; mise sur une ouverture rassurante mais déjà personnelle.';
  }

  const slice = history.slice(0, limit);
  const labelMap = locale === 'en' ? STATUS_LABEL_EN : STATUS_LABEL_FR;
  const lines: string[] = [
    locale === 'en'
      ? `RECENT HISTORY (newest first — DO NOT reuse the same beat, scene, object or wording):`
      : `HISTORIQUE RÉCENT (plus récent en premier — NE PAS réutiliser le même ressort, la même scène, le même objet ou la même formulation) :`,
  ];
  for (const item of slice) {
    const stat = labelMap[item.status] ?? item.status;
    const date = item.questDate ?? '';
    const title = item.generatedTitle ?? item.archetypeTitle;
    const mission = item.generatedMission?.trim();
    const head = `[${date}] ${stat} (${item.category}) — ${title}`;
    lines.push(mission ? `- ${head} :: ${mission}` : `- ${head}`);
  }
  return lines.join('\n');
}
