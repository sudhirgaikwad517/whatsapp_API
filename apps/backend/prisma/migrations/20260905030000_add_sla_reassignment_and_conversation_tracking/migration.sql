-- Purely additive.

-- Organization: admin-configurable SLA — auto-reassign an unopened chat to
-- the org owner after this many minutes. NULL = feature off (no behavior change).
ALTER TABLE "Organization" ADD COLUMN     "slaReassignMinutes" INTEGER;

-- Conversation: track when the current agent assignment was made and when
-- that agent first opened the chat, so the SLA worker can detect a stale
-- unopened assignment.
ALTER TABLE "Conversation" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "agentOpenedAt" TIMESTAMP(3);
