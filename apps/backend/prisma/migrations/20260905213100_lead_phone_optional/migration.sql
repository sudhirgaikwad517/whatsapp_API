-- Purely additive/loosening — no data loss.
ALTER TABLE "Lead" ALTER COLUMN "phoneNumber" DROP NOT NULL;
