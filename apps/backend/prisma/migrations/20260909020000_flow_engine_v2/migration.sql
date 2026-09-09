-- CreateEnum
CREATE TYPE "FlowSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'ABANDONED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "triggerFlowId" UUID;

-- CreateTable
CREATE TABLE "FlowSession" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "flowId" UUID NOT NULL,
    "currentNodeId" VARCHAR(100) NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "status" "FlowSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAdvancedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "FlowSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowSubmission" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "flowId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowSession_organizationId_status_idx" ON "FlowSession"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FlowSession_conversationId_status_idx" ON "FlowSession"("conversationId", "status");

-- CreateIndex
CREATE INDEX "FlowSession_status_expiresAt_idx" ON "FlowSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "FlowSubmission_organizationId_flowId_idx" ON "FlowSubmission"("organizationId", "flowId");

-- CreateIndex
CREATE INDEX "FlowSubmission_contactId_idx" ON "FlowSubmission"("contactId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_triggerFlowId_fkey" FOREIGN KEY ("triggerFlowId") REFERENCES "Flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSession" ADD CONSTRAINT "FlowSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSession" ADD CONSTRAINT "FlowSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSession" ADD CONSTRAINT "FlowSession_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSubmission" ADD CONSTRAINT "FlowSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSubmission" ADD CONSTRAINT "FlowSubmission_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSubmission" ADD CONSTRAINT "FlowSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
