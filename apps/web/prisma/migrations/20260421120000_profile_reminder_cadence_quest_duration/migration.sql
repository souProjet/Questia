-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "reminder_cadence" TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE "profiles" ADD COLUMN "quest_duration_min_minutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "profiles" ADD COLUMN "quest_duration_max_minutes" INTEGER NOT NULL DEFAULT 1440;
