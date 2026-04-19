# Algorithme de congruence et moteur de génération de quêtes

Document de référence pour le **choix d'archétype** (package `@questia/shared`,
moteur `engine`) et la **génération des textes** (app web, pipeline
`quest-gen`). Les deux couches sont indépendantes mais alignées sur le même
profil, la même phase et le même delta de congruence.

---

## 1. Vue d'ensemble

| Couche | Rôle | Fichiers principaux |
|--------|------|---------------------|
| **Historique → personnalité observée** | Agrège les quêtes passées en un vecteur `p_ex` | `packages/shared/src/engine/congruence.ts` |
| **Écart identité / actions** | Mesure `Δ_cong` entre déclaré et observé | idem |
| **Phase d'escalade** | Calibration → Expansion → Rupture (effort attendu différent) | `engine/escalation.ts` |
| **Sélection candidats (top-N)** | Score multi-critères (`affinity`, `phaseFit`, `freshness`, `refinement`) puis tri stable | `packages/shared/src/engine/{affinity,phaseFit,freshness,selectCandidates}.ts` |
| **Contexte jour** | Météo, ville, GPS → autorise/interdit l'extérieur | `getQuestContext` (`apps/web/src/lib/actions/weather.ts`) |
| **Génération IA (LLM-first)** | Choix d'archétype + texte + lieu en 1 appel JSON, validation serveur, fallback déterministe | `apps/web/src/lib/quest-gen/` |
| **Tirages déterministes** | Hash stable d'une graine pour la reproductibilité | `packages/shared/src/engine/promptSeed.ts` |

---

## 2. Personnalité observée `computeExhibitedPersonality(logs)`

Pour chaque `QuestLog` (du plus récent au plus ancien) :

1. Résoudre l'archétype dans la taxonomie courante.
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
partout)** — le moteur s'appuie alors uniquement sur le profil **déclaré**.

`hasExhibitedSignal(exhibited)` détecte au moins une dimension qui s'écarte de
0.5 de plus que `EXHIBITED_SIGNAL_EPSILON` ; quand c'est faux, le LLM ne reçoit
pas de bloc « personnalité observée » dans son prompt.

---

## 3. Delta de congruence `computeCongruenceDelta(declared, exhibited)`

\[
\Delta_{\text{cong}} = \sqrt{\frac{1}{N}\sum_k (\text{declared}_k - \text{exhibited}_k)^2}
\]

où \(N\) est le nombre de dimensions (`PERSONALITY_KEYS`).  
Valeur **0** = parfaitement aligné, valeur plus haute = plus d'écart.

Ce scalaire alimente :

- la **phase effective** (combiné à `currentDay` dans `getEffectivePhase`),
- l'**affinité** entre profil et archétype (`engine/affinity.ts`),
- le bloc « écart observé » du prompt LLM (`buildProfileBrief`).

---

## 4. Phase d'escalade `getEffectivePhase(day, recentLogs, today?)`

Trois phases avec des **bornes** sur le jour de parcours et un système de
downgrade/upscale selon la dynamique récente (cf. `engine/escalation.ts`) :

| Phase | Jour typique | Confort cible | Esprit |
|-------|--------------|---------------|--------|
| `calibration` | 1–7  | `low` voire `moderate` | poser un rituel, gagner en confiance |
| `expansion`   | 8–17 | `moderate` à `high`     | tester du nouveau sans rupture |
| `rupture`     | 18+  | `high` / `extreme`     | bousculer un peu, viser la transformation |

La phase **persiste** dans `Profile.currentPhase` (calculée au moment de
l'assignation), pour que UI, prompt et badges voient la même vérité.

---

## 5. Moteur de sélection

### 5.1 Principe

Le moteur produit explicitement un **top-N** de candidats (`5` par défaut) avec
un **score décomposé** que l'on peut tracer / journaliser. C'est ce dossier de
candidature qui est ensuite passé au LLM, qui décide quel archétype rédiger.

### 5.2 Filtres durs

Avant tout scoring, on retire les archétypes :

- listés dans `excludeArchetypeIds` (relances cumulées du jour, archétypes
  servis dans les `RECENT_EXCLUSION_WINDOW_DAYS` derniers jours calendaires) ;
- nécessitant l'extérieur quand `hasUserLocation` est faux ou que la météo
  n'est pas amicale ;
- non `instant` quand on est en mode « après report » (`instantOnly`).

### 5.3 Score doux : 4 composantes pondérées

Chaque candidat reçoit `total = Σ wᵢ × scoreᵢ` (poids `DEFAULT_SCORE_WEIGHTS`) :

| Composante | Poids | Rôle |
|------------|-------|------|
| `affinity` | 0.45 | Aligne la quête sur la personnalité (déclarée + observée si signal) |
| `phaseFit` | 0.25 | Pénalise les quêtes trop intenses ou trop fades pour la phase |
| `freshness` | 0.20 | Évite la saturation de catégorie (et l'archétype récemment refusé) |
| `refinement` | 0.10 | Biais issu du questionnaire de raffinement utilisateur |

#### `affinity.ts`
Croise la corrélation profil/catégorie psychologique et les traits cibles de
l'archétype. Quand `hasExhibitedSignal(exhibited)` est vrai, on injecte
`exhibited` avec un poids modulé.

#### `phaseFit.ts`
Compare le confort et la durée de la quête à ce qui est attendu pour la phase.
Un profil « doux » (`computeGentleness > 0.55`) bénéficie d'un assouplissement
en phase `calibration` (les quêtes sociales / extrêmes deviennent moins
prioritaires).

#### `freshness.ts`
Combine deux signaux :

- **fenêtre catégorielle** : si la même catégorie a été servie plusieurs fois
  récemment, on la pénalise (sauf si toutes ont été *complétées* — alors
  l'utilisateur en redemande, on n'écrase pas) ;
- **archétype refusé/abandonné** : pénalité forte si un user a explicitement
  rejeté l'archétype dans la fenêtre récente.

#### `refinement` bias
Issue de `refinementAnswersToCategoryBias(...)`. Convention : valeur positive
favorise (le moteur la convertit en bonus de score).

### 5.4 Stabilité du tri

`selectCandidates` trie par score décroissant ; en cas d'ex-aequo, un
tie-break déterministe `hash(seed, archetypeId)` garantit la reproductibilité
sans figer le choix d'un jour à l'autre. La graine recommandée est
`${profileId}:${today}:${phase}:${day}:${rerollTier}`.

### 5.5 Sortie

```
SelectCandidatesResult = {
  candidates: QuestCandidate[],   // top-N triés
  excludedHardCount: number,      // diagnostic
  saturatedCategories: string[],  // info pour l'IA
}
```

Chaque `QuestCandidate` porte `archetype`, `score` (les 4 composantes + total)
et une `reason` courte exposée au LLM.

---

## 6. Pipeline IA `quest-gen` (`apps/web/src/lib/quest-gen/`)

Approche **LLM-first** : un seul appel OpenAI choisit le candidat le plus
pertinent et rédige la quête.

### 6.1 Construction du prompt

| Bloc | Source | Notes |
|------|--------|-------|
| `buildSystemPrompt(locale)` | `lib/ai/promptGuardrails.ts` (style, langue, sécurité) | partagé avec d'autres prompts du produit |
| `buildProfileBrief(profile)` | personnalité déclarée + observée (si signal) + phase + sociabilité + contexte raffinement | langage non technique, mentionne explicitement les divergences (`PLUS de…`, `MOINS de…`) |
| `buildHistoryBrief(history)` | 5 dernières quêtes (titre, mission, statut) | sert d'anti-répétition stylistique et thématique |
| `buildCandidatesBrief(candidates)` | top-N avec catégorie, intensité, durée, raison + score | l'IA doit choisir l'`archetypeId` dans cette liste |
| `buildUserPrompt(...)` | concatène tout + contexte (date, météo, ville, mode reroll, mode after-defer) + repair hint éventuel | format strictement déterminé : « réponds en JSON contenant *exactement* … » |

### 6.2 Modèle & paramètres

- Modèle : `OPENAI_DAILY_QUEST_MODEL` (par défaut `gpt-5.4`).
- Format : `response_format: { type: 'json_object' }`.
- `temperature` : 0.85 puis 0.6 au retry (sauf `gpt-5*` qui ignore le sampling).
- `max_completion_tokens : 700`.

### 6.3 Boucle de validation

`MAX_ATTEMPTS = 2`. À chaque tentative :

1. Appel OpenAI.
2. `parseGeneratedJson(raw, archetypesById, computedIsOutdoor)` — normalise et
   recale les champs manquants ; lève si JSON invalide.
3. `ensureCityInMission(mission, city)` (sauvetage doux) si la ville manque.
4. `validateGenerated(parsed, candidateIds, archetype, locale, city, isOutdoor)`
   vérifie : `archetypeId` dans la liste, mission ≤ 1 phrase /
   `MISSION_MAX_CHARS` / `MISSION_MAX_WORDS`, titre dans
   `[TITLE_MIN_CHARS, TITLE_MAX_CHARS]`, hook ≤ `HOOK_MAX_WORDS`,
   icône dans `QUEST_ICON_ALLOWLIST`, cohérence outdoor/social, etc.

Tout échec déclenche un **retry avec hint de réparation** (`repairHint` injecté
au prompt suivant). Tout est tracé via `logStructured` (operation
`quest-gen.call|parse|validate`).

### 6.4 Fallback déterministe

Si toutes les tentatives échouent, `buildFallbackQuest(topCandidate, locale,
context)` produit une quête à partir :

- du **titre canon** et de la **description canon** de l'archétype,
- d'un **hook déterministe** choisi via `promptSeedIndex(seed, ...)`,
- d'une icône stable selon la catégorie psychologique.

`wasFallback: true` est conservé pour analytics et XP (calcul XP non boosté).

---

## 7. Boucle complète `GET /api/quest/daily`

1. Auth (Clerk) + lecture `Profile` + locale.
2. Si une quête existe déjà pour `today` (cache) → renvoie telle quelle.
3. Charge :
   - taxonomie (`getQuestTaxonomy()`),
   - contexte météo (`getQuestContext(lat, lon)`),
   - historique récent (`HISTORY_WINDOW_LOGS = 14` rows).
4. Calcule `exhibited`, `delta`, `effectivePhase`, exclusions cumulées.
5. Construit `ProfileSnapshot` + appelle `selectCandidates(taxonomy, snapshot, …)`.
6. Construit le brief historique (`HISTORY_BRIEF_DEPTH = 5`) et appelle
   `generateDailyQuest({ candidates, profile, context, history, … })`.
7. Géocode la destination si la quête est outdoor + GPS dispo
   (`geocodeNominatim` + heuristique « recherche large » sur certains mots-clés).
8. Met à jour `Profile` (jour, phase, série, relances) et crée le `QuestLog`
   atomiquement, puis renvoie le payload final (incluant la progression XP,
   la boutique et le statut du raffinement).

Les actions `POST` (accept / reroll / replace / complete / abandon / report)
restent inchangées dans leur contrat ; les soft-updates de personnalité
déclarée (`softUpdateDeclaredPersonality`) sont déclenchés en fire-and-forget
sur les transitions `accepted | completed | rejected | abandoned`.

---

## 8. Reproductibilité & seeds

- `selectionSeed` : `${profileId}:${today}:${effectivePhase}:${day}:${reroll}`
  → injecté à `selectCandidates` pour stabiliser les ex-aequo.
- `generationSeed` : même schéma, transmis au LLM dans le prompt
  (utile pour debug ; le LLM peut s'en servir pour varier sans dériver).
- `promptSeedIndex(seed, scope, length)` : index déterministe utilisé par les
  fallbacks et les hooks rotatifs.

---

## 9. Tests

- `packages/shared/src/engine/selectCandidates.test.ts` — affinity, phaseFit,
  freshness, hard filters, sélection top-N.
- `packages/shared/src/engine/congruence.test.ts` — exhibited, delta,
  gentleness, signal.
- `packages/shared/src/engine/questRelevance.test.ts` — campagnes 28 jours
  multi-personas (diversité, montée en difficulté, séquences distinctes).
- `apps/web/src/lib/quest-gen/quest-gen.test.ts` — briefs, prompts,
  parsing, validation, fallback.
- `apps/web/src/app/api/quest/daily/route.test.ts` — orchestration GET/POST,
  XP, report, abandon.

Tester en boucle : `npx vitest run`.
