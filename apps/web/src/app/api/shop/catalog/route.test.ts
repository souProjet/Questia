import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/shop/catalog', () => {
  it('retourne le catalogue', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
    expect(Array.isArray(json.coinPacks)).toBe(true);
  });
});
