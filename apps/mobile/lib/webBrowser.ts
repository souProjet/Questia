/**
 * Indique si on peut utiliser `expo-web-browser` pour OAuth / Custom Tabs.
 * Ne pas utiliser `requireOptionalNativeModule('ExpoWebBrowser')` : sur Android release
 * (Hermes), il peut renvoyer `null` à tort alors que le module est bien lié — ce qui
 * bloquait « Continuer avec Google » et le checkout. Le package est une dépendance ;
 * en cas de problème réel, l'erreur remontera à l'appel (Clerk / openBrowserAsync).
 */
export function isExpoWebBrowserNativeAvailable(): boolean {
  return true;
}

export async function maybeCompleteAuthSession(): Promise<void> {
  if (!isExpoWebBrowserNativeAvailable()) return;
  const WebBrowser = await import('expo-web-browser');
  WebBrowser.maybeCompleteAuthSession();
}
