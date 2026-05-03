import { describe, expect, it } from 'vitest';
import { buildEnvironmentalBrief } from './buildEnvironmentalBrief';

describe('buildEnvironmentalBrief', () => {
  it('dimanche (UTC) : consigne FR dimanche + pas d’achat obligatoire', () => {
    const s = buildEnvironmentalBrief('2024-01-07', 'fr');
    expect(s).toContain('dimanche');
    expect(s).toMatch(/Dimanche/i);
    expect(s).toContain('Aucun achat obligatoire');
  });

  it('vendredi (UTC) : mention vendredi/samedi soir en FR', () => {
    const s = buildEnvironmentalBrief('2024-01-05', 'fr');
    expect(s).toMatch(/Vendredi|vendredi/);
    expect(s).toContain('interactions sociales');
  });

  it('dimanche EN : Sunday guidance + no mandatory purchase', () => {
    const s = buildEnvironmentalBrief('2024-01-07', 'en');
    expect(s).toMatch(/Sunday/i);
    expect(s).toContain('No mandatory purchase');
  });
});
