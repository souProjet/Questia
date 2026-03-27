import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
/** Même port que `npm run dev` / Clerk (authorized origins : localhost + 127.0.0.1). */
const port = process.env.PLAYWRIGHT_WEB_SERVER_PORT ?? '3000';
/** `localhost` : aligné sur les origines Clerk (souvent autorisées par défaut ; ajoute aussi 127.0.0.1 si besoin). */
const defaultBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

/**
 * E2E Playwright : parcours publics (sans session Clerk).
 * Il faut des clés Clerk valides (voir `.env.example`) : le dashboard doit autoriser
 * http://localhost:3000 (et en local aussi http://127.0.0.1:3000 si tu testes avec cette URL).
 * Auth complète, quête du jour, paiement et partage : comptes / Stripe de test séparés.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html']] : [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: defaultBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(skipWebServer
    ? {}
    : {
        webServer: isCI
          ? {
              command: `npx next start -p ${port}`,
              url: defaultBaseUrl,
              reuseExistingServer: false,
              timeout: 120_000,
            }
          : {
              command: 'npm run dev',
              url: defaultBaseUrl,
              reuseExistingServer: true,
              timeout: 300_000,
            },
      }),
});
