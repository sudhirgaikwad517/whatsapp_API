-- Purely additive.

-- OrganizationMember: activate/deactivate + per-agent page permissions
ALTER TABLE "OrganizationMember" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedPages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Organization: escalation notification template selection
ALTER TABLE "Organization" ADD COLUMN     "escalationTemplateId" UUID;

-- SuperAdminUser: forgot/reset password support
ALTER TABLE "SuperAdminUser" ADD COLUMN     "resetToken" VARCHAR(255),
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
