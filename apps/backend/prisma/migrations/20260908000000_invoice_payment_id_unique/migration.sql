-- Invoice.paymentId gets a unique constraint so two concurrent confirmations
-- of the same Razorpay payment (a double-click, a client retry after a
-- timeout, or the payment webhook racing the client-side confirmation) can
-- only ever create one invoice for it going forward — application code now
-- relies on this to make the credit-grant + invoice-create sequence
-- transactionally atomic (see billing.controller.ts / billing-wallet.service.ts).
--
-- Fails loudly with a clear, actionable message if duplicate paymentId
-- values already exist (i.e. the exact double-credit race this constraint
-- is meant to prevent has already happened at least once) instead of a
-- cryptic generic constraint-violation error. If this migration fails:
--   1. Run: SELECT "paymentId", COUNT(*) FROM "Invoice" GROUP BY "paymentId" HAVING COUNT(*) > 1;
--   2. For each duplicate, decide which invoice is the legitimate one
--      (compare timestamps/amounts against the org's actual Razorpay
--      dashboard record for that payment), then reconcile that org's wallet/
--      AI-credits/plan-tier balance for the extra credit the duplicate
--      caused, and remove or renumber the duplicate invoice row.
--   3. Re-run this migration once no duplicates remain.
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT "paymentId" FROM "Invoice" GROUP BY "paymentId" HAVING COUNT(*) > 1
  ) dupes;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot add unique constraint on Invoice.paymentId — % duplicate paymentId value(s) already exist. See the comment at the top of this migration file for how to resolve them.', dup_count;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");
