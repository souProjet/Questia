# Profil Aura Visuelle

Les orbes de couleur en arrière-plan de l'application ne sont pas de simples décorations.
Ils constituent un **miroir ambiant de la personnalité de l'utilisateur**, calculé en temps réel
à partir de son vecteur Big Five + Sensation Seeking.

---

## Concept

Chaque utilisateur possède un **vecteur de personnalité** à 7 dimensions (valeurs de 0 à 1) :

| Dimension               | Pôle faible (≈0)               | Pôle fort (≈1)                 |
|-------------------------|-------------------------------|-------------------------------|
| `openness`              | Concret, habitudes stables    | Curieux, imaginatif, créatif  |
| `conscientiousness`     | Flexible, spontané            | Rigoureux, organisé           |
| `extraversion`          | Solitaire, introverti         | Social, expressif, énergique  |
| `agreeableness`         | Direct, compétitif            | Bienveillant, coopératif      |
| `emotionalStability`    | Réactif, intense              | Serein, équilibré             |
| `thrillSeeking`         | Prudent, confort assuré       | Adrénaline, prises de risque  |
| `boredomSusceptibility` | Patient, routine acceptable   | S'ennuie vite, cherche la nouveauté |

---

## Les 3 orbes et leur signification

L'interface affiche **3 orbes** (home mobile + carte quête + fond web) qui correspondent chacun
à une paire de traits complémentaires :

### Orbe TR — Énergie & Action
- **Traits** : `extraversion` + `thrillSeeking`
- **Spectre** : Cyan froid (200°) → Orange chaleureux (28°) pour l'extraversion ;
  Turquoise (175°) → Rouge vif (0°) pour le thrill seeking.
- **Lecture** : Intensité de l'élan social et du goût pour l'adrénaline.

### Orbe BL — Créativité & Lien
- **Traits** : `openness` + `agreeableness`
- **Spectre** : Bleu terne (220°) → Violet créatif (280°) pour l'ouverture ;
  Terracotta (20°) → Vert tendre (130°) pour l'agréabilité.
- **Lecture** : Richesse de l'imaginaire et chaleur des relations.

### Orbe TL — Ancrage & Sérénité
- **Traits** : `conscientiousness` + `emotionalStability`
- **Spectre** : Ambre (35°) → Bleu ardoise (210°) pour la discipline ;
  Rouge anxieux (350°) → Or serein (50°) pour la stabilité émotionnelle.
- **Lecture** : Sens de la structure et de la paix intérieure.

---

## Formule de calcul

### 1. Mapping trait → teinte HSL

```
hue(trait, value) = blend_circulaire(hue_low, 1-value, hue_high, value)
```

Le blend circulaire utilise une projection vectorielle (cos/sin) pour éviter le saut angulaire 0°/360°.

### 2. Couleur d'un orbe (2 traits combinés)

```
w1 = v1 / (v1 + v2)   # poids du trait 1
w2 = v2 / (v1 + v2)   # poids du trait 2

hue = blend_circulaire(hue(trait1, v1), w1, hue(trait2, v2), w2)

intensity = |((v1 + v2) / 2) - 0.5| × 2   # déviation par rapport à la neutralité
alpha = baseAlpha + intensity × intensityBoost
```

### 3. Paramètres visuels par thème

| Mode          | Saturation | Luminosité | Alpha base | Boost max |
|---------------|-----------|-----------|-----------|-----------|
| Thèmes clairs | 46%       | 68%       | 0.09–0.10 | +0.07–0.08 |
| Midnight      | 62%       | 54%       | 0.12–0.14 | +0.10–0.12 |

Un profil parfaitement neutre (0,5 sur tous les axes) → teintes du thème par défaut, sans aura visible.
Un profil très marqué → intensité maximum selon le thème.

---

## Personnalité déclarée vs exhibée

- **Déclarée** (`declaredPersonality`) : saisie lors de l'onboarding (axes explorateur/casanier, prudent/audacieux).
- **Exhibée** (`exhibitedPersonality`) : calculée depuis l'historique de quêtes complétées, refusées, relancées
  par `computeExhibitedPersonality()` dans `packages/shared/src/engine/congruence.ts`.

**Priorité** : la personnalité exhibée est utilisée en priorité pour l'aura.
Si elle n'existe pas encore (nouveau compte), la déclarée prend le relais.
Si aucune n'est disponible, les teintes neutres du thème s'appliquent.

---

## Implémentation

### Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `packages/ui/src/auraProfile.ts` | Moteur de calcul mobile (React Native) |
| `apps/web/src/lib/auraColors.ts` | Moteur de calcul web (Next.js, pas de dépendance RN) |
| `packages/ui/src/index.ts` | Exports : `computeAuraOrbTints`, `computeAuraCardBlobs`, `auraOrbCssVars` |

### Points d'intégration

#### Mobile (Expo)
1. **`AppThemeContext`** — fetche `/api/profile` et stocke `personality: PersonalityVector | null`
   (exhibée > déclarée).
2. **`HomeBackdropShell`** (`home.tsx`) — utilise `computeAuraOrbTints(personality, themeId, palette)`
   pour les 3 orbes du fond plein-écran.
3. **`QuestSwipeCard`** — prop `personality?: PersonalityVector | null`, utilise
   `computeAuraCardBlobs(personality, themeId, palette, isDarkCard)` pour les blobs décoratifs sur la face carte.

#### Web (Next.js)
1. **`ensureProfile()`** (`app/page.tsx`) — parse la réponse et stocke `personality` dans le state local.
2. **`computeWebAuraColors(personality, themeId)`** — calcule les 3 couleurs `rgba()`.
3. **3 divs `fixed`** avec `blur-[120px]` — orbes en arrière-plan de la page `/app`.

### Rétrocompatibilité

Aucune modification du schéma Prisma ni des routes API n'a été nécessaire.
La personnalité est déjà présente dans la réponse `GET /api/profile` via `...profile`.
L'implémentation est **entièrement additive** : `null` = comportement identique à avant.

---

## Page web dédiée

Une page `/aura` est disponible sur le site web avec :
- Explication du fonctionnement en 5 étapes
- **Simulateur interactif** — 7 curseurs (un par axe) + prévisualisation en temps réel des 3 orbes
- Profils prédéfinis (Aventurier, Sage solitaire, Connecteur social, Bâtisseur)
- Légende des orbes avec la couleur calculée affichée en fond de chaque carte

**Composants** :
- `apps/web/src/app/[locale]/aura/page.tsx`
- `apps/web/src/components/aura/AuraProfilePage.tsx`
- `apps/web/src/components/aura/AuraProfileSimulator.tsx`

---

## Évolutions possibles

- **Transition animée** : interpolation douce des couleurs quand la personnalité exhibée évolue
  semaine après semaine (Reanimated `withTiming` sur mobile, CSS `transition` sur web — déjà en place).
- **Congruence delta** : moduler l'intensité de l'aura selon `congruenceDelta` (plus l'utilisateur
  est congruent entre déclaré et exhibé, plus l'aura est stable et affirmée).
- **Aura partageable** : générer une image statique de l'aura personnelle pour la carte de partage.
- **Thème adaptatif** : proposer automatiquement un thème boutique dont les accents sont proches
  de la teinte dominante de l'aura.
