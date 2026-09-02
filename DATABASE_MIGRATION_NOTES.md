# Database Migration Notes — Schema Hardening Pass

`apps/backend/prisma/schema.prisma` has been updated (validated with `prisma validate`, and `prisma generate` + a full backend typecheck + test run all pass). A migration has since appeared at `apps/backend/prisma/migrations/20260902051142_harden_schema_indexes_enums_fks/migration.sql` — written by hand (not a raw `prisma migrate dev` auto-diff) to be data-preserving: every `String → enum` conversion adds a new column, backfills it from the old one via an explicit `CASE` mapping with a safe fallback default for anything unrecognized, then drops/renames — rather than the destructive drop-and-recreate a naive auto-generated migration would produce. It also states it was checked for zero orphan rows on the new `Message`/`Template` foreign keys against a real dataset.

I did not write this migration file myself — I have no reachable database from this session (the configured `localhost:5433` Postgres isn't running here) so I could not generate or verify one directly. **Before trusting it, confirm it has actually been run (`npx prisma migrate deploy`) against a real database and that the app boots and the ticket-reply / conversation-status / invoice flows still work** — I can't confirm either of those things myself. If you didn't run it yourself either, treat the verification steps below as still outstanding.

## What changed in the schema

- `Message` and `Template` now have a real `organization` relation/foreign key (the column already existed and was already populated correctly by application code — Prisma will fail the migration if it finds any orphaned rows, which would itself be worth investigating).
- New indexes: `Message(conversationId, createdAt)`, `CampaignRecipient(wamid)`, `CampaignRecipient(contactId)`, `deletedAt` on `Contact`/`WhatsappAccount`/`User`.
- `Invoice`, `WalletLedger`, and `AuditLog` now `onDelete: Restrict` on their organization relation instead of `Cascade` — a hard org delete will now fail if financial/audit records exist for it, rather than silently deleting them.
- New enums replacing loose `String` status columns: `Conversation.status` → `ConversationStatus`, `Invoice.status` → `InvoiceStatus`, `SupportTicket.status`/`priority` → `SupportTicketStatus`/`TicketPriority`, `TicketMessage.senderType` → `TicketSenderType`. Enum values were derived from every string literal actually written or checked against in the codebase (backend + frontend), **not** from querying live data — I could not connect to a database from this session.
- `Template.status` was deliberately **left as a plain String** — it mirrors whatever status value Meta's Template Management API returns (`APPROVED`, `PENDING`, `REJECTED`, `PAUSED`, `DISABLED`, `IN_APPEAL`, etc.), a vocabulary this app doesn't control. Locking it to an enum would risk breaking template sync the day Meta adds a new status value.
- `TicketMessage.senderId` changed from `@db.Uuid` to `@db.VarChar(255)` — this fixes a real, currently-broken code path: `superadmin.service.ts`'s `superAdminReplyTicket()` writes the literal string `'SYSTEM_SUPER_ADMIN'` into this column, which a strict `uuid` column rejects at the database level. Every superadmin reply to a support ticket is likely failing today because of this.
- `Organization.geminiApiKey` and `razorpayKeySecret` widened to `@db.Text` in preparation for encrypting them at rest (they're currently stored in plaintext — see `SECURITY_NOTES.md`).

## Before you run this against anything with real data

1. **Verify the enum values against live data first** — run this against your actual database (not included here, since I have no DB access):
   ```sql
   SELECT DISTINCT status FROM "Conversation";
   SELECT DISTINCT status FROM "Invoice";
   SELECT DISTINCT status, priority FROM "SupportTicket";
   SELECT DISTINCT "senderType" FROM "TicketMessage";
   ```
   Every value returned must appear in the corresponding enum in `schema.prisma`. If anything doesn't match, add it to the enum before migrating — don't change the live data to fit the enum.

2. **Verify no orphaned rows exist** for the new `Message`/`Template` foreign keys:
   ```sql
   SELECT COUNT(*) FROM "Message" m LEFT JOIN "Organization" o ON m."organizationId" = o.id WHERE o.id IS NULL;
   SELECT COUNT(*) FROM "Template" t LEFT JOIN "Organization" o ON t."organizationId" = o.id WHERE o.id IS NULL;
   ```
   Both should return 0.

3. Generate the migration in an environment with real database access:
   ```bash
   cd apps/backend
   npx prisma migrate dev --name schema_hardening
   ```
   Review the generated SQL in `apps/backend/prisma/migrations/<timestamp>_schema_hardening/migration.sql` before applying it anywhere with production data — in particular double-check the enum `ALTER COLUMN ... TYPE` statements Prisma generates, since a bad cast there is the one part of this change that could actually lose data if an unexpected value slips through.

4. Apply to staging first, confirm the app boots and the ticket-reply / conversation-status / invoice flows still work, then apply to production during a maintenance window.

## Application-layer follow-up (not yet done)

Actually encrypting `geminiApiKey`/`razorpayKeySecret` at write/read time (routing them through `utils/encryption.ts`, matching `WhatsappAccount.encryptedAccessToken`) still needs the application code changed in `organization.service.ts`/`superadmin.service.ts`/`in-chat-payment.service.ts` plus a one-time data migration script to encrypt whatever's already stored in plaintext. The column is widened and ready for it, but the encrypt/decrypt calls themselves are not yet wired in.
