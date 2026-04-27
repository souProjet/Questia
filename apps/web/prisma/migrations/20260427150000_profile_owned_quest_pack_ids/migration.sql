-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "owned_quest_pack_ids" JSONB NOT NULL DEFAULT '[]';
