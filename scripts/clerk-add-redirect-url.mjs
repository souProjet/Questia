#!/usr/bin/env node
/**
 * Enregistre une URL de redirection autorisée sur l'instance Clerk (nécessaire pour OAuth
 * Expo : exp://… ou schéma perso questia://…). L'UI du dashboard ne l'expose pas toujours ;
 * l'API Backend est la méthode fiable.
 *
 * Prérequis : CLERK_SECRET_KEY (Dashboard Clerk → Configure → API Keys → Secret keys).
 * Ne jamais committer cette clé ni la mettre dans l'app mobile.
 *
 * Usage (PowerShell) :
 *   $env:CLERK_SECRET_KEY="sk_test_..."; node scripts/clerk-add-redirect-url.mjs "exp://10.193.26.85:8081/--/(auth)"
 *
 * Bash :
 *   CLERK_SECRET_KEY=sk_test_... node scripts/clerk-add-redirect-url.mjs "exp://127.0.0.1:8081/--/(auth)"
 *
 * @see https://clerk.com/docs/reference/backend/redirect-urls/create-redirect-url
 */

const url = process.argv[2];
const key = process.env.CLERK_SECRET_KEY?.trim();

if (!key) {
  console.error(
    'Définis CLERK_SECRET_KEY (clé secrète Clerk, même instance que NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).',
  );
  process.exit(1);
}
if (!url) {
  console.error('Usage: node scripts/clerk-add-redirect-url.mjs "<url>"');
  console.error('Exemple: node scripts/clerk-add-redirect-url.mjs "exp://192.168.1.10:8081/--/(auth)"');
  process.exit(1);
}

const res = await fetch('https://api.clerk.com/v1/redirect_urls', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Erreur HTTP ${res.status}:`, text);
  process.exit(1);
}

console.log('URL enregistrée sur l'instance Clerk :');
console.log(url);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
