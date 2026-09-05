-- Purely additive.
ALTER TABLE "Lead" ADD COLUMN     "source" VARCHAR(50) NOT NULL DEFAULT 'popup';
