#!/usr/bin/env node
/**
 * Enregistre en une fois les URLs de redirection Clerk utiles pour Questia (mobile Expo + schéma questia).
 *
 * Prérequis : CLERK_SECRET_KEY (même instance que tes clés publishable).
 * Pour la prod Play Store / site : utilise la clé secrète **live** (`sk_live_...`) sur l’instance **production** Clerk.
 *
 * Usage :
 *   CLERK_SECRET_KEY=sk_test_... node scripts/clerk-register-all-redirect-urls.mjs
 *
 * Optionnel — URL supplémentaires (ex. exp://IP_LAN:8081/--/(auth) qui change selon le Wi‑Fi) :
 *   CLERK_EXTRA_REDIRECT_URLS="exp://192.168.1.10:8081/--/(auth),exp://10.193.26.85:8081/--/(auth)" node scripts/...
 *
 * Les URLs déjà présentes sur l’instance sont ignorées (erreur « already exists » / duplicate).
 *
 * @see https://clerk.com/docs/reference/backend/redirect-urls/create-redirect-url
 */

const key = process.env.CLERK_SECRET_KEY?.trim();
if (!key) {
  console.error(
    'Définis CLERK_SECRET_KEY (Dashboard Clerk → API Keys → Secret keys).',
  );
  process.exit(1);
}

/** URLs stables pour Questia (Expo Router + groupe (auth)). */
const DEFAULT_URLS = [
  // Build native / EAS / dev client — scheme app.json (OAuth mobile, voir Linking.createURL('/(auth)'))
  'questia:///(auth)',
  // Fallback possible si un flux OAuth utilise makeRedirectUri({ path: 'sso-callback' }) sans URL explicite
  'questia://sso-callback',
  // Metro / Expo Go — machine locale
  'exp://127.0.0.1:8081/--/(auth)',
  'exp://localhost:8081/--/(auth)',
  // Émulateur Android → Metro sur la machine hôte
  'exp://10.0.2.2:8081/--/(auth)',
  // Next.js (middleware / routes Clerk) — domaine prod
  'https://questia.fr',
  'https://questia.fr/app',
  'https://questia.fr/sign-in',
  'https://questia.fr/sign-up',
  'https://questia.fr/en/sign-in',
  'https://questia.fr/en/sign-up',
  // Ancienne entrée utile si tu avais des liens vers un groupe « (auth) » côté web (mobile-like)
  'https://questia.fr/(auth)',
];

const extra = (process.env.CLERK_EXTRA_REDIRECT_URLS ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const allUrls = [...new Set([...DEFAULT_URLS, ...extra])];

function isDuplicateError(status, body) {
  const t = (body + '').toLowerCase();
  return (
    status === 422 ||
    status === 409 ||
    t.includes('already') ||
    t.includes('duplicate') ||
    t.includes('exist')
  );
}

async function registerOne(url) {
  const res = await fetch('https://api.clerk.com/v1/redirect_urls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  const text = await res.text();
  if (res.ok) {
    return { ok: true, url, detail: text };
  }
  if (isDuplicateError(res.status, text)) {
    return { ok: true, url, skipped: true, detail: text };
  }
  return { ok: false, url, status: res.status, detail: text };
}

console.log(`Enregistrement de ${allUrls.length} URL(s) sur l’instance Clerk…\n`);

let ok = 0;
let skipped = 0;
let failed = 0;

for (const url of allUrls) {
  const result = await registerOne(url);
  if (result.ok && !result.skipped) {
    console.log(`✓ ${url}`);
    ok += 1;
  } else if (result.ok && result.skipped) {
    console.log(`○ ${url} (déjà présente ou ignorée)`);
    skipped += 1;
  } else {
    console.error(`✗ ${url} → HTTP ${result.status}`);
    console.error(result.detail);
    failed += 1;
  }
}

console.log(`\nRésumé : ${ok} ajoutée(s), ${skipped} ignorée(s), ${failed} erreur(s).`);
if (failed > 0) {
  process.exit(1);
}
