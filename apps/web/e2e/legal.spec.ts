import { test, expect } from '@playwright/test';

const LEGAL_PATHS = [
  '/legal/mentions-legales',
  '/legal/confidentialite',
  '/legal/cgu',
  '/legal/cgv',
  '/legal/bien-etre',
] as const;

test.describe('Pages légales (HTML SSR)', () => {
  for (const path of LEGAL_PATHS) {
    test(`GET ${path} renvoie une page avec titre principal`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.ok()).toBeTruthy();
      const html = await res.text();
      expect(html).toMatch(/<h1[^>]*>/i);
    });
  }
});
