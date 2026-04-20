const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Signature release : si `credentials.json` contient `android.keystore` (format EAS),
 * génère `android/keystore.properties` pour que `bundleRelease` utilise le bon .jks
 * au lieu du keystore debug (sinon Play Console refuse l’AAB).
 *
 * Fichiers cherchés, dans l’ordre :
 * - `apps/mobile/credentials.json`
 * - racine du monorepo (`../../credentials.json` depuis apps/mobile), car `eas credentials`
 *   télécharge souvent à la racine du dépôt courant.
 *
 * `keystorePath` dans le JSON est résolu par rapport au dossier qui contient `credentials.json`.
 *
 * Sinon, crée `android/keystore.properties` à la main (voir `android-keystore.properties.example`).
 */
function resolveCredentialsJsonPath(mobileRoot) {
  const candidates = [
    path.join(mobileRoot, 'credentials.json'),
    path.join(mobileRoot, '..', '..', 'credentials.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function writeKeystorePropertiesFromCredentials(androidRoot) {
  const mobileRoot = path.join(androidRoot, '..');
  const credPath = resolveCredentialsJsonPath(mobileRoot);
  if (!credPath) {
    return;
  }
  let cred;
  try {
    cred = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } catch {
    return;
  }
  const ks = cred?.android?.keystore;
  if (!ks?.keystorePath || !ks.keystorePassword || !ks.keyAlias || !ks.keyPassword) {
    return;
  }
  const rel = String(ks.keystorePath).replace(/\\/g, '/');
  const credDir = path.dirname(credPath);
  const jksAbs = path.join(credDir, ...rel.split('/').filter(Boolean));
  if (!fs.existsSync(jksAbs)) {
    console.warn(
      `[withAndroidReleaseSigning] Keystore introuvable (base: ${credDir}) : ${rel}`,
    );
    return;
  }
  const storeFileFromAndroidDir = path
    .relative(androidRoot, jksAbs)
    .replace(/\\/g, '/');
  const lines = [
    `storePassword=${ks.keystorePassword}`,
    `keyPassword=${ks.keyPassword}`,
    `keyAlias=${ks.keyAlias}`,
    `storeFile=${storeFileFromAndroidDir}`,
    '',
  ];
  fs.writeFileSync(path.join(androidRoot, 'keystore.properties'), lines.join('\n'), 'utf8');
}

/** Recrée `local.properties` après `prebuild --clean` (Gradle a besoin de sdk.dir). */
function writeAndroidLocalProperties(androidRoot) {
  const home = process.env.HOME || process.env.USERPROFILE;
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    localAppData && path.join(localAppData, 'Android', 'Sdk'),
    home && path.join(home, 'Android', 'Sdk'),
    home && path.join(home, 'Library', 'Android', 'sdk'),
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      if (dir && fs.existsSync(path.join(dir, 'platform-tools'))) {
        const resolved = path.resolve(dir);
        const sdkLine =
          process.platform === 'win32'
            ? `sdk.dir=${resolved.replace(/\\/g, '\\\\')}\r\n`
            : `sdk.dir=${resolved}\n`;
        fs.writeFileSync(path.join(androidRoot, 'local.properties'), sdkLine, 'utf8');
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

function patchAppBuildGradle(gradlePath) {
  let content = fs.readFileSync(gradlePath, 'utf8');
  if (content.includes('questiaKeystorePropertiesFile')) {
    return content;
  }

  const propsBlock = `
def questiaKeystoreProperties = new Properties()
def questiaKeystorePropertiesFile = rootProject.file("keystore.properties")
if (questiaKeystorePropertiesFile.exists()) {
    questiaKeystoreProperties.load(new FileInputStream(questiaKeystorePropertiesFile))
}
`;

  const androidBlockIdx = content.indexOf('\nandroid {');
  if (androidBlockIdx === -1) {
    return content;
  }
  content = content.slice(0, androidBlockIdx) + propsBlock + content.slice(androidBlockIdx);

  const debugOnlySigning = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

  const debugAndReleaseSigning = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (questiaKeystorePropertiesFile.exists()) {
                keyAlias questiaKeystoreProperties['keyAlias']
                keyPassword questiaKeystoreProperties['keyPassword']
                storeFile rootProject.file(questiaKeystoreProperties['storeFile'])
                storePassword questiaKeystoreProperties['storePassword']
            }
        }
    }`;

  if (!content.includes(debugOnlySigning)) {
    return content;
  }
  content = content.replace(debugOnlySigning, debugAndReleaseSigning);

  const releaseBuildTypeMarker = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;
  const releaseBuildTypePatched = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig questiaKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`;
  if (content.includes(releaseBuildTypeMarker)) {
    content = content.replace(releaseBuildTypeMarker, releaseBuildTypePatched);
  }

  return content;
}

function withAndroidReleaseSigning(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const gradlePath = path.join(androidRoot, 'app', 'build.gradle');
      if (fs.existsSync(gradlePath)) {
        const next = patchAppBuildGradle(gradlePath);
        fs.writeFileSync(gradlePath, next, 'utf8');
      }
      writeKeystorePropertiesFromCredentials(androidRoot);
      writeAndroidLocalProperties(androidRoot);
      return config;
    },
  ]);
}

module.exports = withAndroidReleaseSigning;
