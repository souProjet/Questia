/**
 * Retire du manifeste fusionné des activités de test / preview qui ne devraient pas
 * être dans un APK release (fuites depuis des dépendances Gradle).
 * Utilise Manifest Merger `tools:node="remove"`.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const ACTIVITY_REMOVALS = [
  'androidx.test.core.app.InstrumentationActivityInvoker$BootstrapActivity',
  'androidx.test.core.app.InstrumentationActivityInvoker$EmptyActivity',
  'androidx.test.core.app.InstrumentationActivityInvoker$EmptyFloatingActivity',
  'androidx.compose.ui.tooling.PreviewActivity',
];

/** @param {import('@expo/config-plugins').ExportedConfig} config */
function withRemoveLeakedTestActivities(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.$) manifest.$ = {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const app = getMainApplication(manifest);
    if (!app) return config;

    const removals = ACTIVITY_REMOVALS.map((name) => ({
      $: { 'android:name': name, 'tools:node': 'remove' },
    }));

    const existing = app.activity
      ? Array.isArray(app.activity)
        ? app.activity
        : [app.activity]
      : [];

    for (const removal of removals) {
      const name = removal.$['android:name'];
      const hasMarker = existing.some(
        (a) => a.$?.['android:name'] === name && a.$?.['tools:node'] === 'remove'
      );
      if (!hasMarker) existing.push(removal);
    }

    app.activity = existing.length === 1 ? existing[0] : existing;
    return config;
  });
}

/**
 * @param {import('@expo/config-plugins').AndroidManifest['manifest']} manifest
 */
function getMainApplication(manifest) {
  if (!manifest.application) return null;
  const apps = Array.isArray(manifest.application)
    ? manifest.application
    : [manifest.application];
  return apps[0] ?? null;
}

module.exports = withRemoveLeakedTestActivities;
