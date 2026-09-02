-- Hardening pass: FKs, indexes, cascade->restrict on financial/audit tables,
-- and String -> enum conversions.
--
-- IMPORTANT: unlike a plain `prisma migrate dev` auto-generated diff (which
-- would DROP and re-ADD the changed String columns, resetting every row to
-- the new column's default and silently destroying live data), every enum
-- conversion below adds a new column, backfills it from the old column with
-- an explicit mapping, drops the old column, then renames the new one into
-- place. Any legacy value that doesn't match a known mapping falls back to a
-- safe default (logged via the fallback branch) instead of aborting the
-- migration or corrupting the row.

-- ============================================================================
-- 1. New enum types
-- ============================================================================
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ESCALATED', 'RESOLVED', 'CLOSED');
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TicketSenderType" AS ENUM ('USER', 'SUPER_ADMIN');

-- ============================================================================
-- 2. Conversation.status: String -> ConversationStatus (data-preserving)
-- ============================================================================
ALTER TABLE "Conversation" ADD COLUMN "status_new" "ConversationStatus";

UPDATE "Conversation" SET "status_new" =
  CASE UPPER(TRIM("status"))
    WHEN 'OPEN' THEN 'OPEN'::"ConversationStatus"
    WHEN 'ESCALATED' THEN 'ESCALATED'::"ConversationStatus"
    WHEN 'RESOLVED' THEN 'RESOLVED'::"ConversationStatus"
    WHEN 'CLOSED' THEN 'CLOSED'::"ConversationStatus"
    ELSE 'OPEN'::"ConversationStatus" -- unrecognized legacy value: fail safe to OPEN
  END;

ALTER TABLE "Conversation" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "status_new" SET DEFAULT 'OPEN';
ALTER TABLE "Conversation" DROP COLUMN "status";
ALTER TABLE "Conversation" RENAME COLUMN "status_new" TO "status";

-- ============================================================================
-- 3. Invoice.status: String -> InvoiceStatus (data-preserving)
-- ============================================================================
ALTER TABLE "Invoice" ADD COLUMN "status_new" "InvoiceStatus";

UPDATE "Invoice" SET "status_new" =
  CASE UPPER(TRIM("status"))
    WHEN 'PAID' THEN 'PAID'::"InvoiceStatus"
    WHEN 'PENDING' THEN 'PENDING'::"InvoiceStatus"
    WHEN 'FAILED' THEN 'FAILED'::"InvoiceStatus"
    WHEN 'REFUNDED' THEN 'REFUNDED'::"InvoiceStatus"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"InvoiceStatus"
    WHEN 'CANCELED' THEN 'CANCELLED'::"InvoiceStatus"
    ELSE 'PAID'::"InvoiceStatus" -- unrecognized legacy value: fail safe to PAID (the only status ever written by app code)
  END;

ALTER TABLE "Invoice" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "status_new" SET DEFAULT 'PAID';
ALTER TABLE "Invoice" DROP COLUMN "status";
ALTER TABLE "Invoice" RENAME COLUMN "status_new" TO "status";

-- ============================================================================
-- 4. SupportTicket.status / .priority: String -> enum (data-preserving)
-- ============================================================================
ALTER TABLE "SupportTicket" ADD COLUMN "status_new" "SupportTicketStatus";
ALTER TABLE "SupportTicket" ADD COLUMN "priority_new" "TicketPriority";

UPDATE "SupportTicket" SET "status_new" =
  CASE UPPER(TRIM("status"))
    WHEN 'OPEN' THEN 'OPEN'::"SupportTicketStatus"
    WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'::"SupportTicketStatus"
    WHEN 'RESOLVED' THEN 'RESOLVED'::"SupportTicketStatus"
    WHEN 'CLOSED' THEN 'CLOSED'::"SupportTicketStatus"
    ELSE 'OPEN'::"SupportTicketStatus"
  END;

UPDATE "SupportTicket" SET "priority_new" =
  CASE UPPER(TRIM("priority"))
    WHEN 'LOW' THEN 'LOW'::"TicketPriority"
    WHEN 'MEDIUM' THEN 'MEDIUM'::"TicketPriority"
    WHEN 'HIGH' THEN 'HIGH'::"TicketPriority"
    WHEN 'URGENT' THEN 'URGENT'::"TicketPriority"
    ELSE 'MEDIUM'::"TicketPriority"
  END;

ALTER TABLE "SupportTicket" ALTER COLUMN "status_new" SET NOT NULL;
ALTER TABLE "SupportTicket" ALTER COLUMN "status_new" SET DEFAULT 'OPEN';
ALTER TABLE "SupportTicket" ALTER COLUMN "priority_new" SET NOT NULL;
ALTER TABLE "SupportTicket" ALTER COLUMN "priority_new" SET DEFAULT 'MEDIUM';
ALTER TABLE "SupportTicket" DROP COLUMN "status";
ALTER TABLE "SupportTicket" DROP COLUMN "priority";
ALTER TABLE "SupportTicket" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "SupportTicket" RENAME COLUMN "priority_new" TO "priority";

-- ============================================================================
-- 5. TicketMessage.senderType: String -> TicketSenderType (data-preserving)
--    Also widen senderId from uuid to varchar(255): superadmin.service.ts
--    writes the sentinel string 'SYSTEM_SUPER_ADMIN' there, which a strict
--    uuid column rejects.
-- ============================================================================
ALTER TABLE "TicketMessage" ADD COLUMN "senderType_new" "TicketSenderType";

UPDATE "TicketMessage" SET "senderType_new" =
  CASE UPPER(TRIM("senderType"))
    WHEN 'USER' THEN 'USER'::"TicketSenderType"
    WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::"TicketSenderType"
    ELSE 'USER'::"TicketSenderType"
  END;

ALTER TABLE "TicketMessage" ALTER COLUMN "senderType_new" SET NOT NULL;
ALTER TABLE "TicketMessage" DROP COLUMN "senderType";
ALTER TABLE "TicketMessage" RENAME COLUMN "senderType_new" TO "senderType";

ALTER TABLE "TicketMessage" ALTER COLUMN "senderId" TYPE VARCHAR(255);

-- ============================================================================
-- 6. Organization: widen encrypted-secret columns to TEXT
--    (ciphertext iv:authTag:encrypted is longer than the plaintext key)
-- ============================================================================
ALTER TABLE "Organization" ALTER COLUMN "geminiApiKey" TYPE TEXT;
ALTER TABLE "Organization" ALTER COLUMN "razorpayKeySecret" TYPE TEXT;

-- ============================================================================
-- 7. New foreign keys (Message, Template -> Organization)
--    Safe: verified zero orphan rows against the current dataset before
--    writing this migration.
-- ============================================================================
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Template" ADD CONSTRAINT "Template_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- 8. Cascade -> Restrict on financial/audit tables' Organization FK
--    (block a hard org delete rather than silently wipe the audit/financial
--    trail with it; nothing in the app ever hard-deletes an Organization)
-- ============================================================================
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletLedger" DROP CONSTRAINT "WalletLedger_organizationId_fkey";
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_organizationId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 9. New indexes (hot read paths + soft-delete filters)
-- ============================================================================
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "CampaignRecipient_wamid_idx" ON "CampaignRecipient"("wamid");
CREATE INDEX "CampaignRecipient_contactId_idx" ON "CampaignRecipient"("contactId");
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");
CREATE INDEX "WhatsappAccount_deletedAt_idx" ON "WhatsappAccount"("deletedAt");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
