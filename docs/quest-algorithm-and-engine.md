# Algorithme de congruence et moteur de génération de quêtes

Document de référence pour le **choix d’archétype** (package `@questia/shared`) et la **génération des textes** (app web, `generateDailyQuest`). Les deux couches sont indépendantes mais alignées sur le même profil, la même phase et le même delta de congruence.

**Version grand public (schéma visuel)** : routes web ` /generation-quetes` (FR) et `/en/generation-quetes` (EN), composant `QuestGenerationExplainer`.

---

## 1. Vue d’ensemble

| Couche | Rôle | Fichiers principaux |
|--------|------|---------------------|
| **Historique → personnalité observée** | Agréger les quêtes passées en un vecteur `p_ex` | `packages/shared/src/engine/congruence.ts` |
| **Écart identité / actions** | Mesurer `Δ_cong` entre déclaré et observé | idem |
| **Phase d’escalade** | Calibration → Expansion → Rupture (cibles de `Δ` différentes) | `getEffectivePhase` dans `escalation.ts`, consommé par la route daily |
| **Sélection d’archétype** | `selectQuest` : meilleur candidat dans la taxonomie + diversité | `congruence.ts`, taxonomie `constants/quests` |
| **Contexte jour** | Météo, ville, GPS → extérieur autorisé ou non | `getQuestContext`, route `api/quest/daily` |
| **Génération IA** | Titre, mission, hook, lieu (JSON) + validation serveur | `apps/web/src/lib/actions/ai.ts`, `questGenerationPrompt.ts` |
| **Tirages déterministes** | Index stable à partir d’une graine (prompts, diversité) | `packages/shared/src/engine/promptSeed.ts` |

---

## 2. Personnalité observée `computeExhibitedPersonality(logs)`

Pour chaque entrée d’historique (`QuestLog`) :

1. Résoudre l’archétype `questId` dans `QUEST_TAXONOMY`.
2. Pondérer selon le **statut** :
   - `completed` → **+1.0**
   - `accepted` → **+0.3**
   - `rejected` → **−0.5**
   - `abandoned` / autres → **0** (ignoré)
3. Ajouter au vecteur : `weight × ACTIVITY_PERSONALITY_CORRELATION[catégorie]` (une ligne par trait Big Five + thrill / ennui).
4. Normaliser par la somme des `|weight|` et borner chaque dimension dans **[0, 1]**.

Sans historique pondéré, le vecteur reste à zéro (le générateur s’appuie alors surtout sur le profil **déclaré**).

---

## 3. Delta de congruence `computeCongruenceDelta(declared, exhibited)`

\[
\Delta_{\text{cong}} = \sqrt{\frac{1}{N}\sum_k (\text{declared}_k - \text{exhibited}_k)^2}
\]

où \(N\) est le nombre de dimensions (`PERSONALITY_KEYS`).  
Valeur **0** = très aligné ; valeur plus haute = plus d’écart entre ce que la personne déclare et ce que les quêtes suggèrent comme comportement.

Ce scalaire alimente :

- les **textes** du prompt (sans jargon clinique) : `buildPersonalityPromptBlock` ;
- le **mélange déclaré / observé** dans `selectQuest` (voir §5).

---

## 4. Phase et delta cible `getTargetDelta(phase)`

| Phase | Intervalle cible pour l’écart « attendu » (utilisé dans le score des quêtes) |
|-------|-----------------------------------------------------------------------------|
| `calibration` | ≈ 0 – 0.10 (proche zone de confort) |
| `expansion` | ≈ 0.15 – 0.35 |
| `rupture` | ≈ 0.40 – 0.70 |

La **phase effective** du jour est calculée côté produit (`getEffectivePhase`) à partir du jour de parcours et de l’historique ; la route daily la passe à `selectQuest` et à `generateDailyQuest`.

---

## 5. Sélection d’archétype `selectQuest(...)`

### 5.1 Candidats

Filtres appliqués sur `QUEST_TAXONOMY` :

- exclure les `recentQuestIds` (derniers archétypes + exclusions de relance le même jour) ;
- si pas d’extérieur fiable : exclure `requiresOutdoor` ;
- si `instantOnly` (report + remplacement) : ne garder que `questPace === 'instant'`.

### 5.2 Vecteur de score : `mixPersonality(declared, exhibited, Δ, phase)`

Mélange **déclaré** et **observé** :

- poids de base : `w ∈ [0.12, 0.45]` dérivé de `Δ` ;
- **calibration** : `w × 0.78` (plus fidèle au déclaré) ;
- **expansion** : léger renfort, plafonné ;
- **rupture** : `w` augmenté (l’observé compte plus pour le **fit** des quêtes).

Le résultat est le vecteur sur lequel on calcule `scoreQuestFit` et `computeGentleness`.

### 5.3 Score d’un archétype

Pour chaque candidat `q` :

1. **`scoreQuestFit(q, scoringVector, targetDelta)`**  
   On estime un « delta attendu » si la personne faisait ce type d’activité (via corrélations catégorie → traits), et on pénalise l’écart au **milieu** de l’intervalle cible de la phase.

2. **Confort** : profil « doux » (`computeGentleness`) + niveau de confort de la quête → pénalité si la quête est trop intense par rapport au profil (coefficient selon la phase).

3. **Durée** : en calibration / expansion, profils doux pénalisent les quêtes très longues.

4. **Social** : en calibration, profil très doux pénalisé si la quête `requiresSocial`.

5. **Biais questionnaire** (`categoryBias`) et **pénalités relance** (`categoryScorePenalty`) ajustent le score.

Tri par score **croissant** (meilleur = plus petit).

### 5.4 Diversité stable (`selectionSeed`)

Si `selectionSeed` est fourni (ex. `profileId:date:phase:day:regenTier`) :

- on ne prend pas toujours le premier : on regarde les **N** meilleurs (`diversityWindow`, ex. 10) ;
- on ajoute un **jitter** déterministe par couple `(seed, quest.id)` puis un léger biais d’index ;
- on retrie et on choisit le premier.

Effet : même bon « fit » global, mais **variété** entre utilisateurs et jours sans RNG non reproductible.

---

## 6. Route `GET /api/quest/daily` (synthèse)

1. Authentification, profil Prisma, date calendaire « quête ».
2. Si une `questLog` existe déjà pour **aujourd’hui** → réponse cache (pas de régénération).
3. Sinon : `getQuestContext(lat, lon)` → ville, météo, `hasUserLocation`, `isOutdoorFriendly`.
4. Reconstruction de `QuestLog[]` depuis l’historique récent pour le moteur.
5. `exhibited` = `computeExhibitedPersonality`, `Δ` = `computeCongruenceDelta`, `phase` = `getEffectivePhase`.
6. `selectQuest(...)` avec `selectionSeed`, `diversityWindow`, biais raffinement, pénalités relance.
7. Ajustements météo / `instantOnly` / fallback taxonomie si besoin.
8. **`generateDailyQuest(profileInput, archetype, context)`** → textes + géocodage éventuel → persistance `questLog`.

---

## 7. Moteur IA `generateDailyQuest` (`apps/web/src/lib/actions/ai.ts`)

### 7.1 Modèle

- Variable d’environnement **`OPENAI_DAILY_QUEST_MODEL`** (défaut : **`gpt-4o`**).
- Les modèles dont le nom matche **`gpt-5*`** : pas de `temperature` / `top_p` (souvent ignorés) ; la variété repose surtout sur le prompt.
- Sinon : `temperature` (selon tentative / relance) + `top_p: 0.94`.

La narration legacy (`generateQuestNarration`) utilise **`OPENAI_MODEL`** (souvent distinct).

### 7.2 Entrées principales (`DailyQuestProfileInput`)

- `phase`, `day`, `congruenceDelta`, `explorerAxis`, `riskAxis`, `questDateIso`
- `declaredPersonality`, `exhibitedPersonality`
- `generationSeed` stable (ex. `userId:date:phase:regenTier`)
- options : `isRerollGeneration`, `substitutedInstantAfterDefer`, `refinementContext`, `locale`

### 7.3 Blocs de prompt (utilisateur)

Assemblés dans `buildUserPrompt` :

1. **Variation** + **ID tirage** (`randomUUID` par tentative) + **pivot créatif** (liste tirée via `promptSeedIndex`).
2. Contexte lieu / météo / règles sans GPS.
3. Profil opérationnel + **`buildPersonalityPromptBlock`** + **`buildPersonalityMissionHints`** (`questGenerationPrompt.ts`).
4. **`buildNarrativeVoiceBlock(phase, locale, seed)`** : ton par phase + « couleur » textuelle tirée (`promptSeedIndex`).
5. **Un seul « angle du jour »** (`pickCreativeAngle`) — les anciens « registres variété » redondants ont été retirés.
6. Famille de quête, archétype (titre canon évité mot pour mot), règles JSON, garde-fous (`promptGuardrails.ts`).

Message **système** : narrateur-créateur, pas de jargon clinique, diversité sans tuer la voix.

### 7.4 Graine créative

\[
\text{creativeSeed} = \text{generationSeed} \mid \text{questDateIso} \mid \text{archetypeId} \mid a\_{\text{attempt}} \mid \text{nonce}
\]

Même jour + même archétype + **nouvelle** tentative API → nonce différent → pivots / angles / couleur narrative peuvent changer.

### 7.5 Validation serveur (`validateGeneratedPayload`)

- titre longueur, mission **une phrase** (détection par ponctuation), pas de `;` entre deux ordres, longueur / nombre de mots ;
- mission pas « vague » ou « méta » (listes de fragments interdits) ;
- ville dans la mission si GPS réel et ville connue ;
- extérieur : `destinationLabel` / `destinationQuery` cohérents ;
- social : mots-clés d’interaction si `requiresSocial`.

En échec : jusqu’à **3** tentatives avec `repairHint` ; sinon **`buildFallbackDailyQuest`** (texte taxonomie + hook déterministe).

### 7.6 Utilitaire partagé `promptSeedIndex` (`@questia/shared`)

Fonction **FNV-1a** sur `seed|salt` → index dans `[0, modulo)`. Utilisée pour :

- angles créatifs et pivots (`ai.ts`) ;
- couleur narrative (`questGenerationPrompt.ts`).

---

## 8. Fichiers à modifier en cas d’évolution

| Objectif | Où intervenir |
|----------|----------------|
| Nouvelle catégorie / archétype | `packages/shared/src/constants/quests.ts`, corrélations `personality` |
| Logique de score / phase | `congruence.ts`, éventuellement `escalation.ts` |
| Forme des prompts / voix | `ai.ts`, `questGenerationPrompt.ts`, `promptGuardrails.ts` |
| Règles de validation JSON | `validateGeneratedPayload`, constantes `MISSION_*` dans `ai.ts` |
| Diversité du tirage d’archétype | `diversityWindow`, jitter, `selectionSeed` (route daily + `selectQuest`) |

---

## 9. Tests utiles

- `packages/shared/src/engine/congruence.test.ts` — `selectQuest`, delta, personnalité observée  
- `packages/shared/src/engine/promptSeed.test.ts` — stabilité des tirages  
- `apps/web/src/lib/actions/ai.test.ts` — parsing, fallback, injection prompt  
- `apps/web/src/lib/actions/ai.live-audit.test.ts` — campagne live avec `RUN_LIVE_AUDIT=1` et `OPENAI_API_KEY`
