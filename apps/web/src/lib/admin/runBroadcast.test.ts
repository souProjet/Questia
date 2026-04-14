import { describe, expect, it } from 'vitest';
import { buildBroadcastEmailInner } from './runBroadcast';

describe('buildBroadcastEmailInner', () => {
  it('accepte le HTML brut', () => {
    const r = buildBroadcastEmailInner('<p>x</p>', '');
    expect(r).toEqual({ ok: true, html: '<p>x</p>' });
  });

  it('échappe le texte', () => {
    const r = buildBroadcastEmailInner('', '<b>hi</b>');
    expect(r.ok && r.html).toContain('&lt;b&gt;');
  });

  it('refuse vide', () => {
    const r = buildBroadcastEmailInner('', '');
    expect(r.ok).toBe(false);
  });
});
