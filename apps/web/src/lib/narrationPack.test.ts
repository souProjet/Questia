import { describe, expect, it } from 'vitest';
import { getNarrationDirectiveForPack, NARRATION_PACK_DIRECTIVES } from './narrationPack';

describe('narrationPack', () => {
  it('directives connues', () => {
    expect(Object.keys(NARRATION_PACK_DIRECTIVES).length).toBeGreaterThan(0);
    expect(getNarrationDirectiveForPack(null)).toBeUndefined();
    expect(getNarrationDirectiveForPack('cinematic')).toContain('CINÉMATIQUE');
    expect(getNarrationDirectiveForPack('inconnu')).toBeUndefined();
  });
});
