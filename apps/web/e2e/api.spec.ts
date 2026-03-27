import { test, expect } from '@playwright/test';

test.describe('API publique', () => {
  test('GET /api/shop/catalog renvoie le catalogue JSON', async ({ request }) => {
    const res = await request.get('/api/shop/catalog');
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { items?: unknown[]; coinPacks?: unknown[] };
    expect(Array.isArray(json.items)).toBe(true);
    expect(Array.isArray(json.coinPacks)).toBe(true);
  });
});
