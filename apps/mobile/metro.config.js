const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Ne pas surveiller tout le monorepo : Next.js crée/supprime `.next/` et Metro plante
// sur des chemins comme `apps/web/.next/diagnostics` (ENOENT) si turbo lance web + mobile.
config.watchFolders = [
  projectRoot,
  path.join(monorepoRoot, 'packages', 'shared'),
  path.join(monorepoRoot, 'packages', 'ui'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Empêche de résoudre des modules depuis l'app Next.js
config.resolver.blockList = [/.*[\\/]apps[\\/]web[\\/].*/];

module.exports = config;
