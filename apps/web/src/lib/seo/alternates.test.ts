import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/marketing', () => ({
  siteUrl: 'https://example.test',
}));

import { alternatesForLocalePath, canonicalUrlFor, stripLocalePrefix } from './alternates';

describe('stripLocalePrefix', () => {
  it('retire /en pour la home anglaise', () => {
    expect(stripLocalePrefix('/en')).toBe('/');
  });
  it('retire le préfixe /en/', () => {
    expect(stripLocalePrefix('/en/legal/cgu')).toBe('/legal/cgu');
  });
  it('laisse les chemins FR intacts', () => {
    expect(stripLocalePrefix('/legal/cgu')).toBe('/legal/cgu');
    expect(stripLocalePrefix('/')).toBe('/');
  });
});

describe('canonicalUrlFor', () => {
  it('FR : chemin sans préfixe', () => {
    expect(canonicalUrlFor('fr', '/')).toBe('https://example.test/');
    expect(canonicalUrlFor('fr', '/legal/cgu')).toBe('https://example.test/legal/cgu');
  });
  it('EN : préfixe /en', () => {
    expect(canonicalUrlFor('en', '/')).toBe('https://example.test/en');
    expect(canonicalUrlFor('en', '/legal/cgu')).toBe('https://example.test/en/legal/cgu');
  });
});

describe('alternatesForLocalePath', () => {
  it('expose canonical + hreflang', () => {
    const a = alternatesForLocalePath('fr', '/legal/cgu');
    expect(a.canonical).toBe('https://example.test/legal/cgu');
    expect(a.languages?.fr).toBe('https://example.test/legal/cgu');
    expect(a.languages?.['en-US']).toBe('https://example.test/en/legal/cgu');
    expect(a.languages?.['x-default']).toBe('https://example.test/legal/cgu');
  });
  it('home EN : canonical vers /en', () => {
    const a = alternatesForLocalePath('en', '/');
    expect(a.canonical).toBe('https://example.test/en');
  });
});
