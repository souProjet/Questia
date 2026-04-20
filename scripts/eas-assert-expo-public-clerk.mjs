#!/usr/bin/env node
/**
 * Hook EAS : sans EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY dans l'environnement du build,
 * l'APK embarque une clé vide → écrans Clerk instables ou crash en prod.
 *
 * Définis la variable sur expo.dev (Environment variables) ou `eas env:create`,
 * même valeur que NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (web).
 *
 * Réf. : https://docs.expo.dev/eas/environment-variables/
 */

function isEasBuild() {
  const v = process.env.EAS_BUILD;
  return v === 'true' || v === '1';
}

if (!isEasBuild()) {
  process.exit(0);
}

const k = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
if (k && k.length > 10) {
  process.exit(0);
}

const profile = process.env.EAS_BUILD_PROFILE ?? '(profil inconnu)';
console.error('');
console.error('[Questia] Build EAS : EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY est absente ou invalide.');
console.error(`            Profil : ${profile}`);
console.error('');
console.error('À faire :');
console.error('  1. expo.dev → ton projet Questia → Environment variables');
console.error('     → ajoute EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (même pk_* que le site web)');
console.error('     → environnement : production / preview selon ton build');
console.error('  2. Ou en CLI : eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ...');
console.error('  3. Relance le build (les EXPO_PUBLIC_* sont figées au build).');
console.error('');
process.exit(1);
