# Dopamode

> Tu t'ennuies parce que t'as pas de quêtes secondaires. La vie c'est pas juste travailler + dormir.

Application de gamification de la vie réelle par génération de quêtes secondaires personnalisées. L'app utilise un algorithme de profilage psychologique (TIPI/SSS) pour assigner des micro-aventures adaptées au profil de l'utilisateur et les faire progressivement sortir de leur zone de confort.

## Architecture

Monorepo Turborepo avec partage de code TypeScript de bout en bout.

```
dopamode/
├── apps/
│   ├── mobile/              # Expo 53 + Expo Router (iOS/Android)
│   └── web/                 # Next.js 15 + App Router + Server Actions
│       └── prisma/          # Schéma Prisma (NeonDB PostgreSQL)
├── packages/
│   ├── shared/              # Types, constantes, moteur psychologique
│   └── ui/                  # Composants partagés (Solito + NativeWind)
├── turbo.json
└── package.json
```

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Mobile | Expo 53, Expo Router, React Native, NativeWind |
| Web | Next.js 15, App Router, Server Actions |
| Partage UI | Solito (navigation universelle), React Native Web |
| Moteur | TypeScript (Delta de Congruence, escalade 3 phases) |
| Base de données | Prisma ORM + NeonDB (PostgreSQL serverless) |
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

# Générer le client Prisma
npx turbo db:generate --filter=@dopamode/web

# Pousser le schéma vers NeonDB
npx turbo db:push --filter=@dopamode/web

# Lancer en développement (web + mobile)
npm run dev

# Lancer uniquement le web
npx turbo dev --filter=@dopamode/web

# Lancer uniquement le mobile
npx turbo dev --filter=@dopamode/mobile
```

## Configuration

Copier `.env.example` dans `apps/web/.env.local` et renseigner :

```env
# NeonDB (Prisma)
DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/dopamode?sslmode=require
DIRECT_DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/dopamode?sslmode=require

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# OpenWeatherMap
OPENWEATHER_API_KEY=your_openweather_api_key
```

## Base de Données (Prisma + NeonDB)

Le schéma se trouve dans `apps/web/prisma/schema.prisma`. Commandes utiles :

```bash
# Ouvrir Prisma Studio (interface visuelle)
cd apps/web && npx prisma studio

# Créer une migration
cd apps/web && npx prisma migrate dev --name init

# Pousser le schéma (sans migration)
cd apps/web && npx prisma db push
```

## Sécurité

- **Modale de consentement** obligatoire avant toute quête physique (5 règles à valider)
- **Vérification météo** automatique via OpenWeatherMap avant validation
- **Système de fallback** : remplacement par quête introspective si conditions dangereuses
- **Privacy by Design** : profil psychologique traité localement, données minimales en cloud
