-- Taxonomie des archétypes + paramètres applicatifs (fallback id).

CREATE TYPE "QuestPsychologicalCategory" AS ENUM (
  'spatial_adventure',
  'public_introspection',
  'sensory_deprivation',
  'exploratory_sociability',
  'physical_existential',
  'async_discipline',
  'dopamine_detox',
  'active_empathy',
  'temporal_projection',
  'hostile_immersion',
  'spontaneous_altruism',
  'relational_vulnerability',
  'unconditional_service'
);

CREATE TYPE "QuestComfortLevel" AS ENUM ('low', 'moderate', 'high', 'extreme');

CREATE TYPE "QuestArchetypePace" AS ENUM ('instant', 'planned');

CREATE TABLE "quest_archetypes" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "category" "QuestPsychologicalCategory" NOT NULL,
    "target_traits" JSONB NOT NULL,
    "comfort_level" "QuestComfortLevel" NOT NULL,
    "requires_outdoor" BOOLEAN NOT NULL,
    "requires_social" BOOLEAN NOT NULL,
    "minimum_duration_minutes" INTEGER NOT NULL,
    "fallback_quest_id" INTEGER,
    "quest_pace" "QuestArchetypePace" NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_archetypes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
