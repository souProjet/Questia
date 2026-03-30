import { describe, expect, it, vi, afterEach } from 'vitest';
import { HISTORY_PAGE_SIZE } from './historyPagination';
import { formatQuestDateFr } from './formatQuestDateFr';
import { questDisplayEmoji, QUEST_LUCIDE_ICON_TO_EMOJI } from './questDisplayEmoji';
import { QUEST_SHARE_BACKGROUNDS, getQuestShareBackgroundById } from './questShareBackgrounds';
import {
  QUEST_TAXONOMY,
  questFamilyLabel,
  questLocalizedText,
  isValidReportDeferredDate,
} from './constants/quests';
import { QUADRANT_DEFAULTS } from './constants/personality';

describe('historyPagination', () => {
  it('taille de page positive', () => {
    expect(HISTORY_PAGE_SIZE).toBe(25);
  });
});

describe('formatQuestDateFr', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne la chaîne si format invalide', () => {
    expect(formatQuestDateFr('pas-une-date')).toBe('pas-une-date');
  });
  it('formate une date ISO valide', () => {
    const s = formatQuestDateFr('2026-03-24');
    expect(s).toMatch(/2026/);
  });
  it('fallback si toLocaleDateString lève (locale indisponible)', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('locale');
    });
    expect(formatQuestDateFr('2026-06-15')).toBe('2026-06-15');
    spy.mockRestore();
  });
});

describe('questDisplayEmoji', () => {
  it('défaut si vide', () => {
    expect(questDisplayEmoji(null)).toBe('⚔️');
    expect(questDisplayEmoji('')).toBe('⚔️');
    expect(questDisplayEmoji('   ')).toBe('⚔️');
  });
  it('mappe Lucide vers emoji', () => {
    expect(questDisplayEmoji('Swords')).toBe(QUEST_LUCIDE_ICON_TO_EMOJI.Swords);
    expect(questDisplayEmoji('swords')).toBe(QUEST_LUCIDE_ICON_TO_EMOJI.Swords);
  });
  it('garde un caractère non ASCII', () => {
    expect(questDisplayEmoji('🔥')).toBe('🔥');
  });
  it('inconnu → défaut', () => {
    expect(questDisplayEmoji('UnknownIconName')).toBe('⚔️');
  });
});

describe('questShareBackgrounds', () => {
  it('liste et getter', () => {
    expect(QUEST_SHARE_BACKGROUNDS.length).toBeGreaterThan(0);
    expect(getQuestShareBackgroundById('nope').id).toBe(QUEST_SHARE_BACKGROUNDS[0]!.id);
    expect(getQuestShareBackgroundById('night').darkForeground).toBe(true);
  });
});

describe('isValidReportDeferredDate', () => {
  it('accepte aujourd’hui et la borne +14 jours', () => {
    expect(isValidReportDeferredDate('2026-03-24', '2026-03-24')).toBe(true);
    expect(isValidReportDeferredDate('2026-04-07', '2026-03-24')).toBe(true);
  });
  it('refuse hors fenêtre', () => {
    expect(isValidReportDeferredDate('2026-03-23', '2026-03-24')).toBe(false);
    expect(isValidReportDeferredDate('2026-04-08', '2026-03-24')).toBe(false);
  });
});

describe('constants re-export sanity', () => {
  it('taxonomie et quadrants', () => {
    expect(QUEST_TAXONOMY.length).toBe(65);
    expect(QUADRANT_DEFAULTS.explorer_risktaker.openness).toBeGreaterThan(0.5);
  });
  it('questFamilyLabel', () => {
    expect(questFamilyLabel(null)).toBeNull();
    expect(questFamilyLabel('spatial_adventure')).toBeTruthy();
    expect(questFamilyLabel('not_a_category' as never)).toBeNull();
  });
  it('questLocalizedText FR et EN', () => {
    const q = QUEST_TAXONOMY[0]!;
    expect(questLocalizedText(q, 'fr').title).toBe(q.title);
    expect(questLocalizedText(q, 'en').title).toBe(q.titleEn);
    expect(questLocalizedText(q, 'en').description).toBe(q.descriptionEn);
  });
});
