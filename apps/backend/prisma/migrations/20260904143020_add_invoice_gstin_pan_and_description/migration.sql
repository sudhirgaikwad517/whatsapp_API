-- Purely additive: new nullable columns for GST-compliant invoice details
-- (GSTIN/PAN/place of supply were missing entirely — CIN alone isn't
-- sufficient for a proper tax invoice) and a specific per-invoice
-- description so the PDF can show exactly what was purchased.

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "invoiceGstin" VARCHAR(50),
ADD COLUMN     "invoicePan" VARCHAR(20),
ADD COLUMN     "invoicePlaceOfSupply" VARCHAR(100),
ADD COLUMN     "invoiceStateCode" VARCHAR(10);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "description" VARCHAR(255);
