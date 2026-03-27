import { test, expect } from '@playwright/test';

test.describe('Routes protégées (sans session)', () => {
  test('redirige /app vers la connexion', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/sign-in|clerk\.accounts/);
  });

  test('redirige /admin vers la connexion', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/sign-in|clerk\.accounts/);
  });
});
