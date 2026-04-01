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

module.exports = config;
