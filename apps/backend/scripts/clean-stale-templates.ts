import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanStale() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  const activeWa = await prisma.whatsappAccount.findFirst({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (!activeWa) return;

  console.log(`Active Account ID: ${activeWa.id}`);
  console.log(`Active WABA ID: ${activeWa.wabaId}`);

  // Delete templates in DB that don't belong to active whatsappAccountId OR contain jaspers_market
  const deleted = await prisma.template.deleteMany({
    where: {
      organizationId: orgId,
      OR: [
        { whatsappAccountId: { not: activeWa.id } },
        { name: { startsWith: 'jaspers_market' } },
      ],
    },
  });

  console.log(`🧹 Deleted ${deleted.count} stale template(s) from database!`);

  const remaining = await prisma.template.findMany({
    where: { organizationId: orgId },
  });

  console.log(`\n--- REMAINING TEMPLATES IN DB ---`);
  for (const t of remaining) {
    console.log(`  - ${t.name} (${t.language}) [${t.status}]`);
  }
}

cleanStale()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
