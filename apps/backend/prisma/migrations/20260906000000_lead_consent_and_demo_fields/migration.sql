-- Rename to reflect that this is an explicit opt-in consent flag, not a
-- "are you currently receiving messages" troubleshooting question.
ALTER TABLE "Lead" RENAME COLUMN "isReceivingWhatsapp" TO "whatsappConsent";

-- New optional fields for the "Book a Demo" page's richer form — additive.
ALTER TABLE "Lead" ADD COLUMN     "company" VARCHAR(255),
ADD COLUMN     "industry" VARCHAR(100),
ADD COLUMN     "messageVolume" VARCHAR(100);
