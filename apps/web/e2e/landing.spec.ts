import { test, expect } from '@playwright/test';

test.describe('Landing (HTML SSR)', () => {
  test('contient le hero, le skip link et la section FAQ', async ({ request }) => {
    const res = await request.get('/');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/quêtes quotidiennes/i);
    expect(html).toContain('id="hero-heading"');
    expect(html).toMatch(/Questions fréquentes/i);
    expect(html).toContain('skip-link');
    expect(html).toContain('href="#main-content"');
  });
});
