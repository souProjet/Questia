const path = require('path');
const metroResolver = require('metro-resolver');
const { getDefaultConfig } = require('expo/metro-config');

// `__dirname` pointe toujours vers apps/mobile (fichier du config), même si Metro est
// lancé depuis la racine du repo — indispensable pour un bundle complet en EAS / export.
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Sans ceci, getMetroServerRoot() remonte à la racine npm workspaces : Metro résout alors
// ./index.js depuis la racine du repo (ex. Q:\ ou Questia/) → createBundleReleaseJsAndAssets échoue.
// On garde la racine serveur = apps/mobile ; watchFolders ci-dessous inclut déjà monorepoRoot.
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

// Avec EXPO_NO_METRO_WORKSPACE_ROOT, Expo considère workspaceRoot === projectRoot →
// getModulesPaths ne pousse aucun chemin : nodeModulesPaths reste vide et Metro ne voit pas
// les paquets hoistés à la racine du repo (ex. expo-web-browser → erreur ./node_modules/...).
// On réinjecte project + racine monorepo uniquement (pas disableHierarchicalLookup).
const config = getDefaultConfig(projectRoot);

const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');
config.resolver.nodeModulesPaths = [
  ...new Set([...(config.resolver.nodeModulesPaths ?? []), mobileNodeModules, rootNodeModules]),
];

// Inclure explicitement le monorepo pour @questia/* et workspaces (évite un graphe trop petit).
const folders = new Set([...(config.watchFolders ?? []), monorepoRoot]);
config.watchFolders = [...folders];

// Empêche Metro de suivre le code Next.js si turbo lance web + mobile
config.resolver.blockList = [/.*[\\/]apps[\\/]web[\\/].*/];

// Une seule copie de React pour tout le bundle. Sinon Hermes / release peut charger
// deux instances : les hooks voient ReactSharedInternals.H === null →
// « Cannot read property 'useEffect' of null » (dispatcher Clerk vs app).
const reactPkg = path.resolve(monorepoRoot, 'node_modules/react');
const reactDomPkg = path.resolve(monorepoRoot, 'node_modules/react-dom');
const reactNativePkg = path.resolve(monorepoRoot, 'node_modules/react-native');
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: reactPkg,
  'react-dom': reactDomPkg,
  'react-native': reactNativePkg,
};

// Les `import()` avec experimentalImportSupport deviennent des requêtes relatives
// `./node_modules/pkg/...`. Metro les résout uniquement depuis le dossier du module
// d'origine → échec si le paquet est hoisté à la racine du workspace.
// On retente avec un chemin absolu sous apps/mobile puis sous le monorepo.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const runDefault = (name) =>
    upstreamResolveRequest
      ? upstreamResolveRequest(context, name, platform)
      : metroResolver.resolve(
          Object.freeze({
            ...context,
            resolveRequest: metroResolver.resolve,
          }),
          name,
          platform,
        );

  if (
    moduleName.startsWith('./node_modules/') ||
    moduleName.startsWith('.\\node_modules\\')
  ) {
    const rel = moduleName.replace(/^\.\//, '').replace(/^\.\\/, '');
    const absProject = path.normalize(path.join(projectRoot, rel));
    const absRoot = path.normalize(path.join(monorepoRoot, rel));
    for (const abs of [absProject, absRoot]) {
      try {
        return runDefault(abs);
      } catch {
        /* tenter l'autre racine */
      }
    }
  }

  return runDefault(moduleName);
};

module.exports = config;
