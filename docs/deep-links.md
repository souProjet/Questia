# Deep links & partage (web ↔ mobile)

## URL canonique (quête du jour ou jour précis)

- **Web** : `https://questia.fr/app` ou `https://questia.fr/app?questDate=YYYY-MM-DD`  
  Paramètre alternatif : `date=` (même sémantique que l'API).

- **API** : `GET /api/quest/daily?questDate=...` — déjà utilisé par le web et le mobile.

- **App native (scheme)** : `questia://app?questDate=YYYY-MM-DD` → redirection vers `/home` avec la même query.

Helpers TypeScript : `buildWebAppQuestUrl`, `buildNativeAppQuestUrl`, `buildQuestShareMessage` dans `@questia/shared` (`deepLinks.ts`).

## Partage

- **Web** : modal « carte à partager » — texte du partage fichier + **copier le lien** `questia.fr/app?questDate=…`.
- **Mobile** : écran carte — **Partager le lien (questia.fr)** en plus de l'image.

## Universal Links (iOS) & App Links (Android)

Fichiers servis par le site (dossier `apps/web/public/.well-known/`) :

| Fichier | Action requise |
|--------|----------------|
| `apple-app-site-association` | Remplacer `TEAMID` par l'Apple Team ID + vérifier le bundle id (`fr.questia.app` dans `app.json`). |
| `assetlinks.json` | Remplacer `REPLACE_WITH_RELEASE_SHA256` par l'empreinte SHA-256 du certificat de **signature de l'app release** (Play Console ou `keytool`). |

Sur App Store Connect : activer **Associated Domains** avec `applinks:questia.fr`.  
Sur Google Play : les App Links se valident après publication si `autoVerify` est true et que le fichier est accessible en HTTPS sans redirection incorrecte.

## Ancienne route

`/app/share` redirige vers `/app` (voir `next.config.ts`). Les query strings sont conservées par Next si l'utilisateur les ajoute manuellement.
