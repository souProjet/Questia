import { test, expect } from '@playwright/test';

test.describe('Onboarding web (HTML SSR)', () => {
  test('contient la première question de profil', async ({ request }) => {
    const res = await request.get('/onboarding');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/Je reste au chaud/i);
    expect(html).toMatch(/Je pars explorer/i);
  });
});
