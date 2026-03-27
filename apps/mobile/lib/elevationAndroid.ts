import { Platform } from 'react-native';

/**
 * Sur Android, `elevation` dessine une ombre selon le rectangle englobant de la vue, pas selon les
 * coins arrondis — d’où des « carrés » visibles sur les cartes avec dégradé ou `overflow: hidden`.
 * iOS utilise `shadow*` et n’est pas concerné de la même façon.
 */
export function elevationAndroidSafe(n: number): number {
  return Platform.OS === 'android' ? 0 : n;
}
