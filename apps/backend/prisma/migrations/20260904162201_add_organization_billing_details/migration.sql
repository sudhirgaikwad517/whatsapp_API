-- Purely additive: lets each organization record its own business/tax
-- identity (address, GSTIN, PAN, billing contact) so invoices can show a
-- complete "Bill To" party, not just the org name.

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingGstin" VARCHAR(50),
ADD COLUMN     "billingPan" VARCHAR(20),
ADD COLUMN     "billingEmail" VARCHAR(255),
ADD COLUMN     "billingPhone" VARCHAR(50);
