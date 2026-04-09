import { test, expect } from '@playwright/test';

test.describe('Pages auth (shell Questia, HTML SSR)', () => {
  test("connexion : texte d'accueil et lien vers inscription", async ({ request }) => {
    const res = await request.get('/sign-in');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/Bon retour/i);
    expect(html).toContain('href="/sign-up"');
  });

  test('inscription : lien vers connexion', async ({ request }) => {
    const res = await request.get('/sign-up');
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('href="/sign-in"');
  });
});
