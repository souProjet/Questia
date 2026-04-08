# Fiches App Store & Google Play — conformité Questia

Document interne pour préparer les soumissions, les captures d'écran et les questionnaires légaux / confidentialité. Domaine public de référence : **https://questia.fr** (configurer `NEXT_PUBLIC_SITE_URL` / `EXPO_PUBLIC_SITE_URL`).

---

## 1. Positionnement produit (revue & bien-être)

**Catégorie principale (indicatif)**  
- App Store : **Style de vie** (ou **Divertissement** selon le ton de la fiche).  
- Play Store : **Style de vie** ou **Divertissement**.

**Ce que Questia n'est pas** (à respecter dans les textes, captures et réponses aux questionnaires) :

- Pas une **application médicale**, de **télémédecine**, de **thérapie** ou de **diagnostic** psychologique.
- Pas un **substitut** à un suivi professionnel (médecin, psychologue, etc.).
- Les quêtes et textes **IA** sont des **suggestions ludiques** pour sortir de la routine, pas des prescriptions de comportement.

**Formulations à privilégier** : micro-défis, motivation, sorties, routine ludique, aventure du quotidien, gamification.

**Formulations à éviter** sur la fiche et les visuels** : « guérir », « traiter », « thérapie », « anxiété / dépression » comme promesse de résultat, « certifié », « approuvé médicalement », comparaisons avec des dispositifs de santé.

**Référence web** (à indiquer si la plateforme demande une URL de politique ou d'avertissement) :

- Politique de confidentialité : `https://questia.fr/legal/confidentialite`
- Mentions légales : `https://questia.fr/legal/mentions-legales`
- CGU : `https://questia.fr/legal/cgu`
- CGV : `https://questia.fr/legal/cgv`
- Bien-être et limites : `https://questia.fr/legal/bien-etre`

---

## 2. Apple — lignes directrices utiles

| Sujet | Référence |
|--------|-----------|
| Sécurité, contenu dangereux | [Guideline 1.4](https://developer.apple.com/app-store/review/guidelines/#safety) (Physical harm) |
| Apps « bien-être » / pas de diagnostic | [1.4.1–1.4.3](https://developer.apple.com/app-store/review/guidelines/#health) — rester dans le divertissement / style de vie si pas de fonctionnalités médicales |
| Confidentialité, données | [5.1](https://developer.apple.com/app-store/review/guidelines/#privacy) |
| Métadonnées honnêtes (screenshots, description) | [2.3](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata) |
| Contenu généré par l'utilisateur / IA | [1.1.6, 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content) selon le cas |
| Achats intégrés | [3.1](https://developer.apple.com/app-store/review/guidelines/#business) |

**App Privacy (nutrition labels)** — à aligner sur la réalité du binaire :

- Compte (e-mail, identifiant) : **Clerk** — collecte liée à l'identité du compte.
- Localisation : **approximative** si tu n'exposes que ville / météo / carte ; **précise** si tu stockes ou affiches des coordonnées précises de façon durable (vérifier le code / les libellés App Store).
- Contenu généré par l'utilisateur : historique de quêtes, profil de jeu.
- **OpenAI** : traitement côté serveur pour génération de textes ; déclarer selon le questionnaire (données utilisées pour améliorer le service / contenu, etc.).
- **Stripe** : paiements ; pas de numéro de carte complet côté Questia.
- Notifications push : jeton d'appareil.

**Déclaration des fonctionnalités récentes** (API obligatoires) : renseigner les motifs (ex. localisation pour contexte météo / carte) cohérents avec les textes des permissions dans `app.json`.

---

## 3. Google Play — politiques utiles

| Sujet | Référence |
|--------|-----------|
| Contenu utilisateur, IA | [User-generated content](https://support.google.com/googleplay/android-developer/answer/9876937) |
| Applications de santé | [Health](https://support.google.com/googleplay/android-developer/answer/10964453) — si tu restes « lifestyle », ne te présente pas comme app de santé |
| Données (formulaire Sécurité des données) | [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) |
| Familles / enfants | [Families](https://support.google.com/googleplay/android-developer/answer/9893335) si tu cibles les jeunes |

**Questionnaire de classification du contenu** : pas de violence graphique ; « stimulation » / motivation sans promesse thérapeutique ; achats in-app si boutique.

---

## 4. Textes prêts à coller (français — à adapter)

### Nom

**Questia**

### Sous-titre (App Store, ~30 caractères max — à raccourcir si besoin)

Exemples :

- `Quêtes IRL du jour, sur mesure`
- `Micro-défis & motivation quotidienne`

### Promotional text (App Store, ~170 caractères, sans compte à rebours version)

> Une mission courte par jour pour sortir de la routine : quêtes concrètes, ton adapté à ton style. Ludique, pas médical — à utiliser avec bon sens.

### Description courte (Play, ~80 caractères)

> Quête du jour dans la vraie vie : défis courts, XP et série. Ludique.

### Description longue (extrait — compléter avec fonctionnalités exactes)

> Questia te propose **une quête par jour** dans ton quotidien : sorties, défis légers, petites actions pour casser la routine.  
> Ton profil et ton historique adaptent le niveau d'exposition et le style des missions.  
> **Important** : Questia est une application de **divertissement et de motivation**. Ce n'est pas un dispositif médical ni psychologique ; les textes générés par IA sont des suggestions. En cas de difficulté de santé physique ou mentale, consulte un professionnel.

### Mots-clés App Store (100 caractères max, virgules, sans nom de l'app)

Exemple : `motivation,quête,défi,habitude,sortie,routine,gamification,IRL`

### « Nouveautés » (modèle)

> Améliorations de stabilité et de textes. Rappel : Questia est une app ludique ; en cas de souci de santé, adresse-toi à un professionnel.

---

## 5. Captures d'écran — checklist

### Cohérence avec les guidelines

- **Exactitude** : ce qui est visible doit exister dans l'app (pas de fausse fonction, pas de note « 4,9 » inventée).
- **Pas de promesse de résultat santé** sur les visuels (avant/après humain, courbes de « guérison », etc.).
- **Marques** : ne pas impliquer un partenariat Apple/Google sans accord.
- **Contenu sensible** : éviter captures de quêtes pouvant être mal interprétées hors contexte ; préférer écrans génériques (accueil, profil, historique, validation).

### Formats (à vérifier sur la doc officielle au moment du dépôt)

- **Apple** : tailles requises par appareil (6,7", 6,5", 5,5" selon les générations) — [App Store Connect](https://help.apple.com/app-store-connect/).
- **Google** : téléphone obligatoire ; tablette optionnelle — [Play Console](https://support.google.com/googleplay/android-developer/answer/9866151).

### Série recommandée (ordre logique)

1. **Écran d'accueil / quête du jour** — titre + mission + CTA clair.  
2. **Carte ou contexte** (si applicable) — sans données personnelles réelles sur la capture (ville fictive ou floutée).  
3. **Profil ou progression** — niveau, série, badges.  
4. **Historique** (optionnel).  
5. **Boutique** (si monétisation) — prix visibles comme dans l'app.

### Accessibilité des captures

- Contraste lisible, pas de texte illisible en miniature.  
- Éviter le mode sombre seul si la fiche store est claire (ou l'inverse) — cohérence avec la marque.

---

## 6. Permissions (textes affichés à l'utilisateur)

Vérifier l'alignement avec les écrans réels et `app.json` (Expo) :

- **Localisation** : formulation actuelle — contexte météo / sécurité des quêtes extérieures.  
- **Photos / caméra** : partage de carte — uniquement si l'écran existe dans le build soumis.  
- **Notifications** : rappel quête du jour — opt-in clair.

---

## 7. IA générative (transparence)

- **Dans l'app** : mention « contenu généré par IA » / lien vers `bien-etre` ou politique (déjà prévu côté web et mobile).  
- **Fiche store** : une phrase dans la description longue suffit souvent ; ajuster si Apple ou Google demandent plus de détail sur le fournisseur de modèle (OpenAI) et l'absence de conseil médical.

---

## 8. Après publication

- Mettre à jour **NEXT_PUBLIC_APP_STORE_URL** et **NEXT_PUBLIC_PLAY_STORE_URL** dans `.env` du web pour activer les badges du site.  
- Garder une trace des réponses aux questionnaires **App Privacy** et **Sécurité des données** à chaque version majeure qui change les SDK ou les flux de données.

---

*Dernière révision : à maintenir à chaque changement de permissions, de SDK ou de positionnement produit.*
