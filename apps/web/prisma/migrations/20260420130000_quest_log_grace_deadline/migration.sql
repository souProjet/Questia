-- Carry-over conditionnel des quêtes « planned » non terminées à minuit.
-- `grace_deadline` est posé au premier rollover après minuit ; passé cette date,
-- le log est forcé en `abandoned` au prochain appel GET /quest/daily.

ALTER TABLE "quest_logs" ADD COLUMN "grace_deadline" TIMESTAMP(3);
