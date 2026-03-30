/**
 * Réduit l’empreinte « portefeuille crypto » sur le Play Store :
 * - supprime toute entrée `solana-wallet` déjà présente dans le manifeste Expo ;
 * - ajoute une règle de fusion Manifest Merger `tools:node="remove"` pour l’intent
 *   injecté par les AAR (@solana-mobile, transitif via @clerk/clerk-js), qui sinon
 *   n’apparaît qu’au build Gradle.
 *
 * Si vous activez la connexion Web3 / Solana dans l’app, supprimez ce plugin.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

/** @param {import('@expo/config-plugins').ExportedConfig} config */
function withRemoveWalletQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    ensureToolsNamespace(manifest);
    stripSolanaWalletQueries(manifest);
    addSolanaWalletRemovalMerger(manifest);
    return config;
  });
}

/**
 * @param {import('@expo/config-plugins').AndroidManifest['manifest']} manifest
 */
function ensureToolsNamespace(manifest) {
  if (!manifest.$) manifest.$ = {};
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }
}

/**
 * @param {import('@expo/config-plugins').AndroidManifest['manifest']} manifest
 */
function stripSolanaWalletQueries(manifest) {
  if (!manifest.queries) return;

  const queriesList = Array.isArray(manifest.queries) ? manifest.queries : [manifest.queries];
  const next = [];

  for (const query of queriesList) {
    if (!query.intent) {
      next.push(query);
      continue;
    }
    const intents = Array.isArray(query.intent) ? query.intent : [query.intent];
    const kept = intents.filter((intent) => !isSolanaWalletIntent(intent));
    if (kept.length === 0) continue;
    next.push({
      ...query,
      intent: kept.length === 1 ? kept[0] : kept,
    });
  }

  if (next.length === 0) {
    delete manifest.queries;
  } else {
    manifest.queries = next.length === 1 ? next[0] : next;
  }
}

/**
 * Intent fusionné par les libs ; le merger supprime la déclaration équivalente des dépendances.
 * @param {import('@expo/config-plugins').AndroidManifest['manifest']} manifest
 */
function addSolanaWalletRemovalMerger(manifest) {
  const removalIntent = {
    $: { 'tools:node': 'remove' },
    action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
    category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
    data: [{ $: { 'android:scheme': 'solana-wallet' } }],
  };

  if (!manifest.queries) {
    manifest.queries = [{ intent: [removalIntent] }];
    return;
  }

  const queriesList = Array.isArray(manifest.queries) ? manifest.queries : [manifest.queries];
  const target = queriesList[0];
  if (!target.intent) {
    target.intent = [removalIntent];
  } else {
    const intents = Array.isArray(target.intent) ? target.intent : [target.intent];
    if (hasSolanaRemovalMerger(intents)) return;
    target.intent = [...intents, removalIntent];
  }
  manifest.queries = queriesList.length === 1 ? queriesList[0] : queriesList;
}

/**
 * @param {Record<string, unknown>[]} intents
 */
function hasSolanaRemovalMerger(intents) {
  return intents.some((intent) => {
    if (!intent || typeof intent !== 'object') return false;
    const marker = intent.$ && intent.$['tools:node'] === 'remove';
    if (!marker) return false;
    return isSolanaWalletIntent(intent);
  });
}

/**
 * @param {Record<string, unknown>} intent
 */
function isSolanaWalletIntent(intent) {
  const data = intent.data;
  if (!data) return false;
  const list = Array.isArray(data) ? data : [data];
  return list.some((d) => {
    if (!d || typeof d !== 'object') return false;
    const attrs = /** @type {Record<string, string | undefined>} */ (d.$ ?? d);
    const scheme = attrs['android:scheme'] ?? attrs['android:host'];
    return scheme === 'solana-wallet';
  });
}

module.exports = withRemoveWalletQueries;
