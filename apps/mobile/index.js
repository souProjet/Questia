/**
 * Ordre d'exécution : CommonJS uniquement pour que enableScreens s'exécute
 * avant tout le graphe expo-router (les `import` seraient hoistés au-dessus).
 *
 * Contournement : crash au démarrage après chargement de librnscreens sur certains
 * appareils (ex. Honor / Android 15) — voir logcat juste après nativeloader rnscreens.
 */
const { enableScreens } = require('react-native-screens');
enableScreens(false);

require('expo-router/entry');
