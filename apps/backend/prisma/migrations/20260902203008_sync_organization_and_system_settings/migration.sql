-- Pre-existing drift fix: these fields already existed in schema.prisma
-- (used by billing.controller.ts's validatePlanPurchase / getInvoiceSettings)
-- but were never captured in a committed migration, so production never had
-- them. Purely additive — no data loss.

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "planExpiryDate" TIMESTAMP(3),
ALTER COLUMN "aiCreditsBalance" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" UUID NOT NULL,
    "invoiceCompanyName" VARCHAR(255),
    "invoiceCin" VARCHAR(100),
    "invoiceAddress" TEXT,
    "invoiceEmail" VARCHAR(255),
    "invoiceWebsite" VARCHAR(255),
    "invoicePhone" VARCHAR(50),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_organizationId_status_idx" ON "Conversation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_organizationId_status_idx" ON "SupportTicket"("organizationId", "status");
