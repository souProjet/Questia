-- Add a public sharing identifier on quest logs.
ALTER TABLE "quest_logs"
ADD COLUMN "share_id" TEXT;

CREATE UNIQUE INDEX "quest_logs_share_id_key" ON "quest_logs"("share_id");
