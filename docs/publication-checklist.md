# Checklist publication Questia

Liste des éléments restants typiques pour une mise en production (web + iOS + Android), au-delà de ce qui est déjà en place dans le dépôt.

---

## Infra & domaine

- [ ] Pointer **questia.fr** vers l’hébergement (Vercel, autre) avec **HTTPS** valide.
- [ ] Configurer les **variables d’environnement de prod** sur l’hôte : `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXT_PUBLIC_SITE_URL=https://questia.fr`, clés **Clerk** (prod), **OpenAI**, **OpenWeather**, **Stripe**, **Resend** (si mails), secrets **cron** / **webhooks**, etc. (référence : `apps/web/.env.example`).
- [ ] **Mobile** : `EXPO_PUBLIC_API_BASE_URL` = URL HTTPS du backend en prod ; `EXPO_PUBLIC_SITE_URL` = `https://questia.fr` ; même **Clerk publishable** que le web en prod.

---

## Base de données & migrations

- [ ] Appliquer les **migrations Prisma** sur la base **production** (pas seulement un `db push` local).
- [ ] Avoir un **plan de sauvegarde** / restauration (ex. snapshots Neon).

---

## Clerk (authentification)

- [ ] Utiliser une **instance production** : domaines autorisés (`questia.fr`, sous-domaines si besoin), URLs de callback compatibles Next + Expo.
- [ ] **Dashboard Clerk** : branding, e-mails, lien vers la politique de confidentialité (`https://questia.fr/legal/confidentialite`).

---

## Paiements (Stripe)

- [ ] **Compte Stripe live**, produits / prix alignés avec le code (webhooks, `STRIPE_WEBHOOK_SECRET` prod).
- [ ] Tester un **parcours d’achat réel** (petit montant) + remboursement si besoin.
- [ ] **CGV / mentions** boutique si vente réelle — à valider selon ton statut juridique.

---

## Deep links & Universal / App Links

- [ ] Compléter **`apple-app-site-association`** : `TEAMID` + bundle id (`fr.questia.app`).
- [ ] Compléter **`assetlinks.json`** : empreinte **SHA-256** du certificat **release** Play Store.
- [ ] **App Store Connect** : capability **Associated Domains** (`applinks:questia.fr`).
- [ ] Vérifier en prod : `https://questia.fr/.well-known/...` accessible (pas de 404, bon `Content-Type` pour Apple).

*Détail : voir [`deep-links.md`](deep-links.md).*

---

## Mobile — build & stores

- [ ] **`app.json`** : remplacer `REPLACE_WITH_EAS_PROJECT_ID` par le vrai projet EAS.
- [ ] **`eas.json`** : Apple ID, `ascAppId`, compte de service Google Play pour **submit**, clés prod.
- [ ] **Builds release** iOS + Android ; tests sur appareils réels (auth, quête, boutique, rappels, partage, liens).
- [ ] **App Store Connect** : métadonnées, captures, classification, **App Privacy** (données réelles = code + SDK).
- [ ] **Google Play Console** : fiche, **Sécurité des données**, classification, tests puis prod.
- [ ] Renseigner **`NEXT_PUBLIC_APP_STORE_URL`** et **`NEXT_PUBLIC_PLAY_STORE_URL`** sur le web pour les badges de téléchargement.

*Aide rédactionnelle : [`store-app-play-compliance.md`](store-app-play-compliance.md).*

---

## Légal & contenu éditorial

- [ ] **Politique de confidentialité** : remplacer le bloc générique « responsable du traitement » par **identité juridique, contact, DPO** si applicable.
- [ ] **Mentions légales / CGU** si nécessaire pour la France.
- [ ] Cohérence **âge minimum** (ex. 13 ans dans la politique) avec la cible et les exigences stores.

---

## Ops & sécurité

- [ ] **Cron** (rappels quotidiens) : secret d’URL en prod, monitoring des échecs.
- [ ] **Abus / charge** : surveillance des logs ; renforcer si besoin (rate limiting, etc.).
- [ ] **Outil d’erreurs** (Sentry ou équivalent) en prod si ce n’est pas déjà branché partout.

---

## QA finale

- [ ] Parcours **inscription → onboarding → quête → validation → XP / badges → historique → boutique** (web + mobile).
- [ ] **Déconnexion**, **suppression de compte**, **export JSON**.
- [ ] **Notifications** push + e-mail en conditions réelles.
- [ ] **Partage** : lien `questia.fr/app?questDate=…` et ouverture app (après Universal Links OK).

---

## Versioning & communication

- [ ] **Version** (`app.json`, changelog) alignée avec les stores.
- [ ] Texte **« Nouveautés »** pour la première version (brouillon dans `store-app-play-compliance.md` à adapter).

---

## État fonctionnel (référence interne)

Les blocs produit suivants sont déjà couverts dans le dépôt (voir `note.txt`) : règles XP, badges, boutique, historique, rappels, accessibilité, tests/CI, observabilité, RGPD, transparence IA, fiches stores, deep links / partage.
