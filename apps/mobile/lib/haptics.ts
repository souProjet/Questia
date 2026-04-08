import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(action: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  void action().catch(() => {
    /* indisponible sur certains simulateurs / appareils */
  });
}

/** Tap léger : secondaires, listes, copier */
export function hapticLight() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Action confirmée : accepter quête, relance, achat pièces */
export function hapticMedium() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Impact fort (rare) */
export function hapticHeavy() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Changement d'onglet, sélecteur, puce */
export function hapticSelection() {
  run(() => Haptics.selectionAsync());
}

/** Succès : validation quête, achat, partage image */
export function hapticSuccess() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Attention : abandon, action sensible */
export function hapticWarning() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Erreur API ou action refusée */
export function hapticError() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
