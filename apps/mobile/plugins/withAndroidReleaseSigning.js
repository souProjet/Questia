const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Signature release : si `credentials.json` (racine apps/mobile) contient `android.keystore`
 * (chemins type EAS), génère `android/keystore.properties` pour que `bundleRelease` utilise
 * `credentials/android/keystore.jks` au lieu du keystore debug.
 *
 * Sinon, tu peux toujours créer `android/keystore.properties` à la main (voir
 * `android-keystore.properties.example`).
 */
function writeKeystorePropertiesFromCredentials(androidRoot) {
  const mobileRoot = path.join(androidRoot, '..');
  const credPath = path.join(mobileRoot, 'credentials.json');
  if (!fs.existsSync(credPath)) {
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
  const jksAbs = path.join(mobileRoot, ...rel.split('/').filter(Boolean));
  if (!fs.existsSync(jksAbs)) {
    console.warn(
      `[withAndroidReleaseSigning] Fichier keystore introuvable (relatif à apps/mobile) : ${rel}`,
    );
    return;
  }
  const storeFileFromAndroidDir = `../${rel}`;
  const lines = [
    `storePassword=${ks.keystorePassword}`,
    `keyPassword=${ks.keyPassword}`,
    `keyAlias=${ks.keyAlias}`,
    `storeFile=${storeFileFromAndroidDir}`,
    '',
  ];
  fs.writeFileSync(path.join(androidRoot, 'keystore.properties'), lines.join('\n'), 'utf8');
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
      return config;
    },
  ]);
}

module.exports = withAndroidReleaseSigning;
