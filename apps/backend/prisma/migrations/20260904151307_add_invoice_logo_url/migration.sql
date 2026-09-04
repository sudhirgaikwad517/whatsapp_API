-- Purely additive: lets the superadmin upload a company logo to appear on
-- generated invoice PDFs instead of the plain-text "Prowexa" brand mark.

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "invoiceLogoUrl" TEXT;
