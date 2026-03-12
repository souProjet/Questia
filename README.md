# Quêtes Secondaires

> Tu t'ennuies parce que t'as pas de quêtes secondaires. La vie c'est pas juste travailler + dormir.

Application de gamification de la vie réelle par génération de quêtes secondaires personnalisées. L'app utilise un algorithme de profilage psychologique (TIPI/SSS) pour assigner des micro-aventures adaptées au profil de l'utilisateur et les faire progressivement sortir de leur zone de confort.

## Architecture

Monorepo Turborepo avec partage de code TypeScript de bout en bout.

```
quetes-secondaires/
├── apps/
│   ├── mobile/          # Expo + Expo Router (iOS/Android)
│   └── web/             # Next.js 15 + App Router + Server Actions
├── packages/
│   ├── shared/          # Types, constantes, moteur psychologique
│   └── ui/              # Composants partagés (Solito + NativeWind)
├── supabase/
│   └── schema.sql       # Schéma de la base de données
├── turbo.json
└── package.json
```

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Mobile | Expo, Expo Router, React Native, NativeWind |
| Web | Next.js 15, App Router, Server Actions |
| Partage UI | Solito (navigation universelle), React Native Web |
| Moteur | TypeScript (Delta de Congruence, escalade 3 phases) |
| Backend | Next.js Server Actions, Supabase (PostgreSQL + Auth) |
| IA Cloud | OpenAI GPT-4o-mini (narration personnalisée) |
| API Sécurité | OpenWeatherMap (météo), Geofencing |

## Moteur Psychologique

### Profilage Minimaliste (2 questions)

L'onboarding place l'utilisateur dans un **quadrant opérationnel** :

|  | Prudent | Téméraire |
|--|---------|-----------|
| **Casanier** | Quêtes introspectives (9, 13) | Quêtes de discipline (6, 7) |
| **Explorateur** | Quêtes modérées (5, 11) | Quêtes extrêmes (1, 10) |

### Delta de Congruence

```
Δ_cong = ‖p_r − p_ex‖
```

- `p_r` : vecteur de personnalité déclarée (Big Five + Sensation Seeking)
- `p_ex` : vecteur de personnalité exhibée (calculé depuis l'historique de quêtes)

### Système d'Escalade en 3 Phases

1. **Étalonnage** (J1-3) : Δ ≈ 0 — Quêtes confortables pour créer l'habitude
2. **Expansion** (J4-10) : Δ ≈ 0.15-0.35 — Poussée progressive hors zone de confort
3. **Rupture** (J11+) : Δ ≈ 0.4-0.7 — Défis à fort contraste psychologique

## Les 13 Quêtes Archétypales

| # | Quête | Niveau |
|---|-------|--------|
| 1 | Le Voyage Aléatoire | Extrême |
| 2 | Le Dîner Solitaire | Élevé |
| 3 | La Nuit Étoilée | Élevé |
| 4 | L'Explorateur Local | Élevé |
| 5 | Le Point Culminant | Modéré |
| 6 | L'Entraînement de l'Aube | Modéré |
| 7 | La Détox Digitale | Élevé |
| 8 | Le Pont Humain | Élevé |
| 9 | La Lettre au Futur | Faible |
| 10 | L'Immersion Totale | Extrême |
| 11 | Le Rayon de Soleil | Modéré |
| 12 | La Reconnexion | Élevé |
| 13 | Le Festin Altruiste | Faible |

## Installation

```bash
# Installer les dépendances
npm install

# Lancer en développement (web + mobile)
npm run dev

# Lancer uniquement le web
npx turbo dev --filter=@quetes/web

# Lancer uniquement le mobile
npx turbo dev --filter=@quetes/mobile
```

## Configuration

Copier `.env.example` dans `apps/web/.env.local` et renseigner :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

## Sécurité

- **Modale de consentement** obligatoire avant toute quête physique (5 règles à valider)
- **Vérification météo** automatique via OpenWeatherMap avant validation
- **Système de fallback** : remplacement par quête introspective si conditions dangereuses
- **Privacy by Design** : profil psychologique traité localement, données minimales en cloud
