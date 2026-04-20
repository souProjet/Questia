/**
 * expo-web-browser 14.0.x publie encore modulesClassNames dans expo-module.config.json.
 * Expo Autolinking 3.x (SDK 54) ne lit que android.modules / ios.modules → WebBrowserModule
 * absent de ExpoModulesPackageList → runtime "Cannot find native module 'ExpoWebBrowser'".
 * Aligné sur https://github.com/expo/expo/blob/main/packages/expo-web-browser/expo-module.config.json
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repoRoot, 'package.json'));

let pkgRoot;
for (const base of [repoRoot, path.join(repoRoot, 'apps', 'mobile')]) {
  try {
    pkgRoot = path.dirname(
      require.resolve('expo-web-browser/package.json', { paths: [base] })
    );
    break;
  } catch {
    /* try next */
  }
}
if (!pkgRoot) {
  process.exit(0);
}

const configPath = path.join(pkgRoot, 'expo-module.config.json');
if (!fs.existsSync(configPath)) {
  process.exit(0);
}

const j = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let changed = false;

if (j.android?.modulesClassNames?.length && !j.android.modules?.length) {
  j.android.modules = [...j.android.modulesClassNames];
  delete j.android.modulesClassNames;
  changed = true;
}
if (j.ios?.modulesClassNames?.length && !j.ios?.modules?.length) {
  j.ios.modules = [...j.ios.modulesClassNames];
  delete j.ios.modulesClassNames;
  changed = true;
}

if (changed) {
  fs.writeFileSync(configPath, `${JSON.stringify(j, null, 2)}\n`);
  console.log('[Questia] expo-web-browser: expo-module.config.json corrigé (modules autolinking SDK 54).');
}
