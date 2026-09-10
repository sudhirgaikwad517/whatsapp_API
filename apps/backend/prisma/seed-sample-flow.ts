// Idempotent, production-safe script that creates (or updates, if re-run) a
// fully-wired sample Chatbot Flow for a given organization, exercising
// every node type added for single-product commerce: Send Product ->
// Interactive Buttons (Order / See Other Options / Ask a Question) ->
// AI Response (loops back) / another Send Product (loops back) -> Payment
// Link -> End. Safe to run against production — unlike prisma/seed.ts
// (dev-only demo data), this creates real, usable org data and re-running
// it just updates the same flow/products in place rather than duplicating
// them.
//
// Usage (run inside the backend container, where DATABASE_URL is set):
//   npx tsx prisma/seed-sample-flow.ts <organization-slug-or-id>
// or via the npm script:
//   npm run seed:sample-flow -- <organization-slug-or-id>
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_FLOW_NAME = 'Sample: Book a Package (Send Product + AI + Payment Link)';
const TRIGGER_KEYWORD = 'book';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  const orgIdentifier = process.argv[2] || process.env.ORG_SLUG;
  if (!orgIdentifier) {
    console.error('Usage: npm run seed:sample-flow -- <organization-slug-or-id>');
    console.error('   or: ORG_SLUG=<slug-or-id> npm run seed:sample-flow');
    process.exit(1);
  }

  const org = UUID_RE.test(orgIdentifier)
    ? await prisma.organization.findUnique({ where: { id: orgIdentifier } })
    : await prisma.organization.findUnique({ where: { slug: orgIdentifier } });

  if (!org) {
    console.error(`No organization found matching "${orgIdentifier}" (checked by slug, then by id).`);
    process.exit(1);
  }

  // Idempotent sample products, keyed by a stable SKU — re-running this
  // script never creates duplicates, it just reuses what's already there.
  async function upsertSampleProduct(sku: string, title: string, description: string, priceInINR: number) {
    const existing = await prisma.productCatalog.findFirst({ where: { organizationId: org!.id, sku } });
    if (existing) return existing;
    return prisma.productCatalog.create({
      data: { organizationId: org!.id, sku, title, description, priceInINR, isActive: true },
    });
  }

  const basicProduct = await upsertSampleProduct(
    'SAMPLE-BASIC',
    'Basic Package',
    'Our entry-level package — everything you need to get started.',
    999
  );
  const premiumProduct = await upsertSampleProduct(
    'SAMPLE-PREMIUM',
    'Premium Package',
    'Our top-tier package — full features, priority support.',
    1999
  );

  // Exact node/edge shape FlowBuilder.tsx itself produces and
  // flow-engine.service.ts reads — see the FlowNodeData interface and
  // FlowNodeCard component (frontend) / edgeFrom()+executeNode() (backend).
  const definition = {
    nodes: [
      {
        id: '1',
        type: 'input',
        data: { label: `⚡ Trigger: Customer sends "${TRIGGER_KEYWORD}"` },
        position: { x: 400, y: 40 },
        style: {
          background: '#064e3b',
          color: '#34d399',
          border: '1px solid #059669',
          borderRadius: '12px',
          padding: '12px',
          fontWeight: 'bold',
          fontSize: '12px',
        },
      },
      {
        id: 'send-basic',
        type: 'flowNode',
        data: { nodeType: 'sendProduct', productId: basicProduct.id, productTitle: basicProduct.title },
        position: { x: 400, y: 180 },
      },
      {
        id: 'main-buttons',
        type: 'flowNode',
        data: {
          nodeType: 'buttons',
          bodyText: 'How would you like to proceed?',
          buttons: [
            { id: 'btn-order', title: '✅ Order This' },
            { id: 'btn-other', title: '🔄 See Other Options' },
            { id: 'btn-ask', title: '❓ Ask a Question' },
          ],
        },
        position: { x: 400, y: 340 },
      },
      {
        id: 'send-premium',
        type: 'flowNode',
        data: { nodeType: 'sendProduct', productId: premiumProduct.id, productTitle: premiumProduct.title },
        position: { x: 750, y: 340 },
      },
      {
        id: 'ai-ask',
        type: 'flowNode',
        data: {
          nodeType: 'aiResponse',
          introText: 'Sure! Ask me anything about this package.',
          continueKeyword: 'continue',
        },
        position: { x: 50, y: 340 },
      },
      {
        id: 'pay-link',
        type: 'flowNode',
        data: { nodeType: 'paymentLink', description: 'Order Payment' },
        position: { x: 400, y: 540 },
      },
      {
        id: 'end-node',
        type: 'flowNode',
        data: { nodeType: 'end', text: 'Thanks for your order! We will confirm shortly. 🙏' },
        position: { x: 400, y: 680 },
      },
    ],
    edges: [
      { id: 'e-1-send-basic', source: '1', target: 'send-basic', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-send-basic-buttons', source: 'send-basic', target: 'main-buttons', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-buttons-order-pay', source: 'main-buttons', sourceHandle: 'btn-order', target: 'pay-link', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-buttons-other-premium', source: 'main-buttons', sourceHandle: 'btn-other', target: 'send-premium', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-buttons-ask-ai', source: 'main-buttons', sourceHandle: 'btn-ask', target: 'ai-ask', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-premium-back-buttons', source: 'send-premium', target: 'main-buttons', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-ai-back-buttons', source: 'ai-ask', target: 'main-buttons', animated: true, style: { stroke: '#10b981' } },
      { id: 'e-pay-end', source: 'pay-link', target: 'end-node', animated: true, style: { stroke: '#10b981' } },
    ],
  };

  const existingFlow = await prisma.flow.findFirst({ where: { organizationId: org.id, name: SAMPLE_FLOW_NAME } });
  const flow = existingFlow
    ? await prisma.flow.update({
        where: { id: existingFlow.id },
        data: { triggerKeyword: TRIGGER_KEYWORD, definition, isActive: true },
      })
    : await prisma.flow.create({
        data: { organizationId: org.id, name: SAMPLE_FLOW_NAME, triggerKeyword: TRIGGER_KEYWORD, definition, isActive: true },
      });

  console.log('✅ Sample flow ready.');
  console.log('──────────────────────────────────────');
  console.log(`Organization:     ${org.name} (${org.slug})`);
  console.log(`Flow:             ${flow.name}`);
  console.log(`Flow ID:          ${flow.id}`);
  console.log(`Trigger keyword:  "${TRIGGER_KEYWORD}"`);
  console.log(`Products:         ${basicProduct.title} (₹${basicProduct.priceInINR}), ${premiumProduct.title} (₹${premiumProduct.priceInINR})`);
  console.log('Open Flows → Edit Flow in the dashboard to inspect/tweak it, or just WhatsApp "book" to your connected number to test it now.');
  console.log('──────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
