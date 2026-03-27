import { describe, it, expect } from 'vitest';
import {
  buildNativeAppQuestUrl,
  buildWebAppQuestUrl,
  buildQuestShareMessage,
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
  });

  it('buildNativeAppQuestUrl', () => {
    expect(buildNativeAppQuestUrl('questia')).toBe('questia://app');
    expect(buildNativeAppQuestUrl('questia', '2026-01-15')).toBe('questia://app?questDate=2026-01-15');
  });

  it('buildQuestShareMessage', () => {
    expect(buildQuestShareMessage({ title: 'Hello', webUrl: 'https://x.fr/app' })).toBe(
      'Hello\nhttps://x.fr/app',
    );
    expect(
      buildQuestShareMessage({
        title: 'Hello',
        webUrl: 'https://x.fr/app',
        equippedTitleLine: '🧭 Scout',
        progressionLine: 'Nv. 2 · 100 XP',
      }),
    ).toBe('Hello\n🧭 Scout\nNv. 2 · 100 XP\nhttps://x.fr/app');
  });
});
