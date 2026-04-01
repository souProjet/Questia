const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// `__dirname` pointe toujours vers apps/mobile (fichier du config), même si Metro est
// lancé depuis la racine du repo — indispensable pour un bundle complet en EAS / export.
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// SDK 52+ : ne pas réactiver disableHierarchicalLookup ni nodeModulesPaths manuels :
// ça casse la résolution des deps hoistées (ex. react-native-screens).
const config = getDefaultConfig(projectRoot);

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

module.exports = config;
