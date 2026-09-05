-- Purely additive — new table, no existing data touched.

CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phoneNumber" VARCHAR(50) NOT NULL,
    "isReceivingWhatsapp" BOOLEAN,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
