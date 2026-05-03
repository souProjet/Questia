# Algorithme de congruence et moteur de génération de quêtes (Full-Gen)

Document de référence pour le **moteur de contexte** (package `@questia/shared`,
module `engine`) et la **génération créative** (app web, pipeline `quest-gen`).
La taxonomie (~180 archétypes) sert d’**inspiration thématique** et de **fallback
déterministe** ; le LLM n’est plus contraint par un archétype pré-sélectionné.

---

## 1. Vue d’ensemble

| Étape | Rôle | Fichiers principaux |
|-------|------|---------------------|
| **Historique → personnalité observée** | Agrège les quêtes passées en un vecteur `p_ex` | `packages/shared/src/engine/congruence.ts` |
| **Écart identité / actions** | Mesure `Δ_cong` entre déclaré et observé | idem |
| **Phase d’escalade** | Calibration → Expansion → Rupture (effort attendu différent) | `engine/escalation.ts` |
| **Intensité cible** | Étiquette `ComfortLevel` dérivée phase + douceur du profil | `engine/phaseFit.ts` (`computeTargetComfortLevel`) |
| **Moteur de contexte** | Score par archétype → champion **par famille psychologique** → primaire + inspirations | `engine/{affinity,phaseFit,freshness,selectCandidates}.ts` (`buildQuestParameters`) |
| **Contexte jour** | Météo, ville, GPS → autorise/interdit l’extérieur | `getQuestContext` (`apps/web/src/lib/actions/weather.ts`) |
| **Pipeline IA full-gen** | Prompt dynamique (profil, météo, date, contraintes moteur) → JSON créatif | `apps/web/src/lib/quest-gen/` |
| **Fallback taxonomie** | Tirage déterministe dans la famille du jour si l’API LLM échoue | `apps/web/src/lib/quest-gen/fallback.ts` |
| **Tirages déterministes** | Hash stable pour reproductibilité | `packages/shared/src/engine/promptSeed.ts` |

### Table — fichiers clés mis à jour (refactor Full-Gen)

| Zone | Fichier | Changement |
|------|---------|------------|
| Moteur | `packages/shared/src/engine/selectCandidates.ts` | `buildQuestParameters`, `pickArchetypeIdForCategoryStorage`, `buildEmergencyQuestParameters` |
| Types moteur | `packages/shared/src/engine/selectionTypes.ts` | Type `QuestParameters` |
| Phase | `packages/shared/src/engine/phaseFit.ts` | `computeTargetComfortLevel` |
| Seeds | `packages/shared/src/engine/promptSeed.ts` | `pickDeterministicFromPool` |
| Constantes | `packages/shared/src/constants/quests.ts` | `ALL_PSYCHOLOGICAL_CATEGORIES`, `isValidPsychologicalCategory` |
| Prompt | `apps/web/src/lib/quest-gen/buildCreativeConstraints.ts` | Consignes créatives (remplace l’ancien brief candidats) |
| Prompt | `apps/web/src/lib/quest-gen/buildPrompt.ts` | System / user prompts full-gen |
| Parse / validation | `apps/web/src/lib/quest-gen/parse.ts`, `validation.ts` | `psychologicalCategory` + `requiresSocial`, plus de liste d’`archetypeId` candidats |
| Génération | `apps/web/src/lib/quest-gen/generateQuest.ts` | Résolution `archetypeId` stats post-parse |
| API | `apps/web/src/app/api/quest/daily/route.ts` | Orchestration `buildQuestParameters` → `generateDailyQuest` |

---

## 2. Personnalité observée `computeExhibitedPersonality(logs)`

Pour chaque `QuestLog` (du plus récent au plus ancien) :

1. Résoudre l’archétype dans la taxonomie courante.
2. Pondérer par le **statut** :
   - `completed` → **+1.0**
   - `accepted` → **+0.3**
   - `rejected` → **−0.5**
   - `abandoned`, `pending`, `replaced` → **0**
3. Décroissance de récence : log #i pondéré par `RECENCY_DECAY ** i` (`0.88`).
4. Ajouter au vecteur : `weight × ACTIVITY_PERSONALITY_CORRELATION[catégorie]`.
5. Normaliser par `Σ|w|` et appliquer
   `value = 0.5 + EXHIBITED_MAX_SHIFT × signed`, puis `clamp01`.

Sans signal exploitable, on retombe sur **`neutralExhibitedVector()` (0.5
partout)** — le moteur s’appuie alors uniquement sur le profil **déclaré**.

`hasExhibitedSignal(exhibited)` détecte au moins une dimension qui s’écarte de
0.5 de plus que `EXHIBITED_SIGNAL_EPSILON` ; quand c’est faux, le LLM ne reçoit
pas de bloc « personnalité observée » dans son prompt.

---

## 3. Delta de congruence `computeCongruenceDelta(declared, exhibited)`

\[
\Delta_{\text{cong}} = \sqrt{\frac{1}{N}\sum_k (\text{declared}_k - \text{exhibited}_k)^2}
\]

où \(N\) est le nombre de dimensions (`PERSONALITY_KEYS`).  
Valeur **0** = parfaitement aligné, valeur plus haute = plus d’écart.

Ce scalaire alimente :

- la **phase effective** (combiné à `currentDay` dans `getEffectivePhase`),
- l’**affinité** entre profil et archétype (`engine/affinity.ts`),
- le bloc « écart observé » du prompt LLM (`buildProfileBrief`).

---

## 4. Phase d’escalade `getEffectivePhase(day, recentLogs, today?)`

Trois phases avec des **bornes** sur le jour de parcours et un système de
downgrade/upscale selon la dynamique récente (cf. `engine/escalation.ts`) :

| Phase | Jour typique | Confort cible | Esprit |
|-------|--------------|---------------|--------|
| `calibration` | 1–7  | `low` voire `moderate` | poser un rituel, gagner en confiance |
| `expansion`   | 8–17 | `moderate` à `high`     | tester du nouveau sans rupture |
| `rupture`     | 18+  | `high` / `extreme`     | bousculer un peu, viser la transformation |

La phase **persiste** dans `Profile.currentPhase` (calculée au moment de
l’assignation), pour que UI, prompt et badges voient la même vérité.

---

## 5. Moteur de contexte `buildQuestParameters`

### 5.1 Principe

Le moteur score **chaque archétype** éligible avec les mêmes composantes qu’auparavant
(`affinity`, `phaseFit`, `freshness`, `refinement`) puis :

1. **Agrège par famille psychologique** : pour chaque `PsychologicalCategory`, on garde le **champion** (meilleur score total dans cette famille).
2. **Classe les familles** par score du champion (tie-break déterministe via `selectionSeed`).
3. Déduit **`primaryCategory`**, des **familles secondaires** (suggestions optionnelles), **`targetComfort`** via `computeTargetComfortLevel` (phase + profil), **`idealDurationMinutes`** (bornes profil + phase + `computeGentleness`).
4. Extrait **3 exemples taxonomie** dans la famille primaire (`themeInspirations`) — **inspiration uniquement** pour le prompt.
5. Construit **`fallbackArchetypePool`** : tous les archétypes scorrés dans la famille primaire (pour tirage de secours et résolution d’un `archetypeId` « stats »).

Les filtres durs (exclusions, outdoor, `instantOnly`, fenêtre de récence des archétypes servis) sont inchangés par rapport à l’ancienne sélection top-N.

### 5.2 Congruence et escalade

`congruence.ts` et `escalation.ts` restent la source de vérité pour la phase et le delta ;  
`phaseFit.ts` continue de scorer chaque archétype ; **`computeTargetComfortLevel`** expose une **intensité lisible** pour le brief créatif.

---

## 6. Pipeline IA `quest-gen` (full-gen)

Approche **création libre** : un appel OpenAI produit une quête **originale** en JSON.

### 6.1 Construction du prompt

| Bloc | Source | Notes |
|------|--------|-------|
| `buildSystemPrompt(locale)` | `buildPrompt.ts` | Voix créative, pas de liste d’archétypes |
| `buildProfileBrief(profile)` | personnalité + phase + écart + raffinement | inchangé conceptuellement |
| `buildHistoryBrief(history)` | anti-répétition | inchangé |
| `buildCreativeConstraints(params)` | **contraintes du jour** : famille, intensité, durée cible, 3 étincelles taxonomie, jour de la semaine | remplace l’ancien `buildCandidatesBrief` |
| `buildUserPrompt(...)` | date, météo, ville, modes reroll/report, schéma JSON avec `psychologicalCategory` **figée** au primaire moteur | le LLM doit respecter cette famille |

### 6.2 Sortie JSON et persistance

Le LLM renvoie notamment :

- `psychologicalCategory` — **doit égaler** la famille primaire du moteur ;
- `requiresSocial` — si la mission exige une interaction humaine réelle ;
- textes, icône, durée, outdoor, destinations…

Après validation, le serveur résout un **`archetypeId`** réel via
`pickArchetypeIdForCategoryStorage` (tirage déterministe dans `fallbackArchetypePool`)
pour la **base de données**, la congruence future et les stats — sans figer la
créativité du texte.

### 6.3 Modèle & paramètres

- Modèle : `OPENAI_DAILY_QUEST_MODEL` (par défaut `gpt-5.4`).
- Format : `response_format: { type: 'json_object' }`.
- `temperature` : 0.85 puis 0.6 au retry (sauf `gpt-5*` qui ignore le sampling).
- `max_completion_tokens : 700`.

### 6.4 Boucle de validation

`MAX_ATTEMPTS = 2`. À chaque tentative :

1. Appel OpenAI.
2. `parseGeneratedJson(raw, computedIsOutdoor, defaultDurationMinutes)` — JSON + `psychologicalCategory` valide.
3. `ensureCityInMission` si besoin.
4. `validateGenerated(parsed, enginePrimaryCategory, locale, city, isOutdoor)` — titres / mission / hook dans les limites UI, cohérence social/outdoor.

Échec → retry avec `repairHint`.

### 6.5 Fallback déterministe

Si toutes les tentatives échouent, `buildFallbackQuest` pioche un archétype dans la
**famille du jour** (`pickDeterministicFromPool`) et utilise titre/description canoniques.

---

## 7. Boucle complète `GET /api/quest/daily`

1. Auth (Clerk) + lecture `Profile` + locale.
2. Si une quête existe déjà pour `today` (cache) → renvoie telle quelle.
3. Charge : taxonomie, contexte météo (`getQuestContext`), historique récent (`HISTORY_WINDOW_LOGS`).
4. Calcule `exhibited`, `delta`, `effectivePhase`, exclusions cumulées.
5. `clampQuestDurationBounds` → **`buildQuestParameters`** (ou **`buildEmergencyQuestParameters`** si aucun archétype éligible).
6. Brief historique (`HISTORY_BRIEF_DEPTH`) → **`generateDailyQuest`**.
7. Géocode la destination si outdoor + GPS.
8. Met à jour `Profile` et crée le `QuestLog` (incl. `archetypeId` résolu).

---

## 8. Reproductibilité & seeds

- `selectionSeed` / `generationSeed` : stables par utilisateur et jour (phase, jour, reroll).
- `pickDeterministicFromPool` / `promptSeedIndex` : fallback et hooks.

---

## 9. Tests

| Fichier | Couverture |
|---------|------------|
| `packages/shared/src/engine/selectCandidates.test.ts` | `buildQuestParameters`, affinity, phaseFit, freshness |
| `packages/shared/src/engine/congruence.test.ts` | exhibited, delta |
| `packages/shared/src/engine/questRelevance.test.ts` | campagnes multi-jours |
| `apps/web/src/lib/quest-gen/*.test.ts` | prompts, parse, validation, fallback |
| `apps/web/src/app/api/quest/daily/route.test.ts` | orchestration GET/POST |

Commande : `npx vitest run`.
