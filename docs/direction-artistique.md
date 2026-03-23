# Direction artistique — Dopamode (web)

Ce document décrit la **DA** appliquée au site marketing et aux styles partagés dans `apps/web`. Elle est centrée sur une **identité « jeu d’aventure »** : quêtes IRL, énergie positive, **cyan · orange · vert**, sans aspect corporate froid.

---

## 1. Positionnement visuel

| Axes | Choix |
|------|--------|
| **Ton** | Ludique, encourageant, direct — pas culpabilisant |
| **Métaphore** | Plateau de quête, carte mission, « boss fight » léger |
| **Rythme** | Sections en bandes, grille diagonale légère, halos colorés |
| **Contraste** | Textes foncés sur fonds clairs partout (site + app) ; dégradés de titres lisibles (WCAG visé sur les zones marketing) |

Toute l’expérience (landing, auth, app, mobile) suit la **même DA claire** : bleu ciel, cartes blanches / crème, accents cyan · orange · vert — **pas de thème sombre** ni de fonds type « app dark ».

---

## 2. Palette sémantique

Variables CSS (`:root` dans `globals.css`) :

| Token | Valeur | Usage |
|-------|--------|--------|
| `--bg` | `#e8f8ff` | Fond global landing |
| `--surface` | `#f5fbff` | Surfaces |
| `--card` | `#ffffff` | Cartes |
| `--text` | `#13212d` | Texte principal |
| `--muted` | `#4d7187` | Texte secondaire |
| `--subtle` | `#8bb9d1` | Scrollbar, détails |
| `--violet` | `#22d3ee` | Accent cyan (nom historique « violet ») |
| `--orange` | `#f97316` | CTA chaleur, bordures quest |
| `--gold` | `#fbbf24` | Highlights |
| `--green` | `#10b981` | Réussite, extérieur |

**Sélection de texte** : fond `rgba(249,115,22,.3)` — rappel de la marque orange.

---

## 3. Typographie

| Rôle | Police | Config |
|------|--------|--------|
| **Corps** | **Inter** | `font-sans` → `var(--font-inter)` |
| **Titres / display** | **Space Grotesk** | `font-display` → `var(--font-space)` avec repli Inter |

Déclarée dans `layout.tsx` (Google Fonts, `display: swap`).

**Hiérarchie** : titres souvent `font-black`, labels de section en **petites caps** (`label` + `tracking-widest`).

---

## 4. Fonds & atmosphère

### `.bg-adventure` (landing principal)

Fond **bleu très clair** + superposition de :

- Halos **ellipse** cyan (haut), orange (droite), vert (bas gauche)
- **Grille diagonale** fine cyan (`repeating-linear-gradient`)
- **Motif pointillé** subtil (32px)

Référence : jeu / carte / ciel.

### Bandeaux de section

| Classe | Rôle visuel |
|--------|-------------|
| `.section-band-how` | Légère teinte **cyan → vert** (fonctionnement) |
| `.section-band-social` | **Orange → cyan** (témoignages) |
| `.section-band-cta` | **Cyan → crème → orange** (transition vers CTA final) |

### Halo animé (hero)

Calque absolu avec `animate-glow-soft` (pulse d’opacité) pour donner de la vie sans surcharger.

---

## 5. Cartes « quête » & slider

Alignées sur une **famille crème / orange / cyan** :

| Classe | Description |
|--------|-------------|
| `.quest-board` | Carte type « tableau de quête » (dégradé crème → jaune, bordure orange, ombre « jeu ») |
| `.quest-slider-embedded` | Slider hero : même ADN, **ombre serrée** (lisibilité du texte, pas de gros blur) |
| `.landing-cta-panel` | Bloc CTA final : dégradé crème/cyan, bordure orange 2px, ombre + **bande basse** type plateau |

Éléments satellites : `.quest-glow`, `.quest-glow-orange`, `.quest-sticker` (pastille type autocollant).

---

## 6. Textes en dégradé

Tous utilisent `background-clip: text` (préfixes WebKit conservés).

| Classe | Contexte | Notes |
|--------|----------|--------|
| `.text-gradient` | Fonds **clairs** (landing, app) | Teal / vert / brun — bon contraste |
| `.text-gradient-pop` | Accroches **hero + CTA** landing | Dégradé **cyan → teal → vert → orange** + `drop-shadow` multiples (relief + glow) |
| `.text-gradient-on-dark` | *Alias historique* | Même dégradé que `.text-gradient` — le nom est conservé pour compatibilité, **sans** fond sombre |
| `.text-warm` | Optionnel | Orange / vert (moins utilisé sur la landing actuelle) |

---

## 7. Boutons

| Classe | Style |
|--------|--------|
| `.btn` | Base : flex, bold, `rounded-2xl`, transitions |
| `.btn-primary` | Dégradé cyan, ombre froide |
| `.btn-cta` | Dégradé **orange → or**, ombre chaude — action principale marketing |
| `.btn-ghost` | Blanc semi-transparent, bordure slate légère |

Survol : légère **élévation** (`translateY`) + ombre renforcée.

---

## 8. Labels & badges

- **`.label`** : micro-titre de section — `uppercase`, `tracking-widest`, `text-orange-800` (couleur adaptable par section : `text-emerald-900`, `text-cyan-900`, etc.).
- **Pills** (phases / état) : `.pill-calibration` (vert), `.pill-expansion` (cyan), `.pill-rupture` (orange).
- **`.streak-badge`** : série / flamme — ambre.

---

## 9. Cartes génériques

- **`.card`** : fond blanc dégradé léger, bordure sombre soft, `rounded-2xl`.
- **`.card-hover`** : au survol, bordure cyan, fond plus lumineux, `-translate-y-0.5` / `-translate-y-1` selon contexte.

---

## 10. Séparateurs

- **`.divider`** : ligne fine neutre.
- **`.divider-glow`** : ligne **dégradée cyan** (effet « lumière » au centre) — utilisé autour du « ou » entre stores et lien web.

---

## 11. Animations (Tailwind)

Définies dans `tailwind.config.ts` :

| Nom | Effet |
|-----|--------|
| `animate-fade-up` | Entrée douce (opacité + translation) |
| `animate-float` / `animate-float-delayed` | Flottement décoratif (hero) |
| `animate-glow-soft` | Pulsation d’opacité (halo) |

Composant **`LandingReveal`** : apparition au **scroll** (opacity + translate), respect de `prefers-reduced-motion`.

---

## 12. Bonnes pratiques

1. **Ne pas** appliquer `transform: scale()` sur des blocs de texte marketing (flou des polices) — préférer taille explicite ou typo.
2. **Ombres** des cartes quête : plutôt **serrées** ; les très larges `blur` autour des badges store ou du slider donnent un aspect « flou » indésirable.
3. **Cohérence** : CTA final et slider hero partagent la **même famille** (crème, orange, cyan).
4. **Accessibilité** : prévoir `motion-reduce` là où des animations CSS sont ajoutées ; focus visible sur les contrôles (FAQ `summary`, liens, boutons).

---

## 13. Fichiers de référence

| Fichier | Contenu |
|---------|---------|
| `apps/web/src/app/globals.css` | Tokens, composants, dégradés, sections |
| `apps/web/tailwind.config.ts` | Fonts, animations, keyframes |
| `apps/web/src/app/layout.tsx` | Chargement Inter + Space Grotesk |
| `apps/web/src/components/Navbar.tsx` | Barre fixe, verre / bordure cyan |
| `apps/web/src/components/AppStoreButtons.tsx` | Badges stores (taille alignée, `drop-shadow` sur images) |
| `apps/web/src/components/QuestExamplesSlider.tsx` | Cartes exemples mission |
| `apps/web/src/components/LandingReveal.tsx` | Animation d’entrée au scroll |

---

*Document généré à partir du code du dépôt — à tenir à jour lors de changements de DA.*
