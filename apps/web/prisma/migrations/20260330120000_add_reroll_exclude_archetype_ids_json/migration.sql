-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "reroll_exclude_archetype_ids" JSONB NOT NULL DEFAULT '[]';
