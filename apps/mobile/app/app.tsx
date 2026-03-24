import { Redirect } from 'expo-router';

/** Ancien chemin /app → accueil avec barre d’onglets. */
export default function LegacyAppRedirect() {
  return <Redirect href="/home" />;
}
