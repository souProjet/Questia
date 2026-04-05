-- Remove quest text tone packs (shop feature dropped)
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "owned_narration_packs";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "active_narration_pack_id";
