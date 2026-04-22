import { describe, it, expect } from 'vitest';
import {
  buildNativeAppQuestUrl,
  buildWebAppQuestUrl,
  buildWebSharedQuestUrl,
  buildQuestShareMessage,
  formatQuestShareEquippedTitleLine,
  formatQuestShareProgressionLine,
  isValidQuestDateIso,
} from './deepLinks';

describe('deepLinks', () => {
  it('isValidQuestDateIso', () => {
    expect(isValidQuestDateIso('2026-03-25')).toBe(true);
    expect(isValidQuestDateIso('2026-13-01')).toBe(false);
    expect(isValidQuestDateIso('2026-02-30')).toBe(false);
    expect(isValidQuestDateIso('bad')).toBe(false);
  });

  it('buildWebAppQuestUrl', () => {
    expect(buildWebAppQuestUrl('https://questia.fr')).toBe('https://questia.fr/app');
    expect(buildWebAppQuestUrl('https://questia.fr/', '2026-01-15')).toBe(
      'https://questia.fr/app?questDate=2026-01-15',
    );
    expect(buildWebAppQuestUrl('https://questia.fr/', '')).toBe('https://questia.fr/app');
    expect(buildWebAppQuestUrl('https://questia.fr/', 'not-a-date')).toBe('https://questia.fr/app');
  });

  it('buildNativeAppQuestUrl', () => {
    expect(buildNativeAppQuestUrl('questia')).toBe('questia://app');
    expect(buildNativeAppQuestUrl('questia', '2026-01-15')).toBe('questia://app?questDate=2026-01-15');
    expect(buildNativeAppQuestUrl('questia:')).toBe('questia://app');
    expect(buildNativeAppQuestUrl('questia/', 'bad')).toBe('questia://app');
  });

  it('buildWebSharedQuestUrl', () => {
    expect(buildWebSharedQuestUrl('https://questia.fr', 'abc123')).toBe('https://questia.fr/q/abc123');
    expect(buildWebSharedQuestUrl('https://questia.fr/', '  z-9  ')).toBe('https://questia.fr/q/z-9');
  });

  it('formatQuestShareEquippedTitleLine', () => {
    expect(formatQuestShareEquippedTitleLine(null)).toBe(null);
    expect(formatQuestShareEquippedTitleLine(undefined)).toBe(null);
    expect(formatQuestShareEquippedTitleLine('')).toBe(null);
    expect(formatQuestShareEquippedTitleLine('scout')).toBe('Éclaireur·se des trottoirs');
    expect(formatQuestShareEquippedTitleLine('unknown-id')).toBe(null);
  });

  it('formatQuestShareProgressionLine', () => {
    expect(formatQuestShareProgressionLine({ level: 3, totalXp: 1200 }, 'fr')).toMatch(/Nv\. 3/);
    expect(formatQuestShareProgressionLine({ level: 3, totalXp: 1200 }, 'fr')).toMatch(/1[\s\u202f]200/);
    expect(formatQuestShareProgressionLine({ level: 2, totalXp: 99 }, 'en')).toBe('Lv. 2 · 99 XP');
  });

  it('buildQuestShareMessage', () => {
    expect(buildQuestShareMessage({ title: 'Hello', webUrl: 'https://x.fr/app' })).toBe(
      'Hello\nhttps://x.fr/app',
    );
    expect(
      buildQuestShareMessage({
        title: 'Hello',
        webUrl: 'https://x.fr/app',
        equippedTitleLine: 'Éclaireur·se des trottoirs',
        progressionLine: 'Nv. 2 · 100 XP',
      }),
    ).toBe('Hello\nÉclaireur·se des trottoirs\nNv. 2 · 100 XP\nhttps://x.fr/app');
  });
});
