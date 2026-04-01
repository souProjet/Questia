/**
 * Si Metro / `expo export` est invoqué depuis la racine du dépôt, ce fichier est chargé en premier.
 * Déléguer à apps/mobile évite un projectRoot incorrect et un bundle JS incomplet → crash au lancement de l’APK.
 */
module.exports = require('./apps/mobile/metro.config.js');
