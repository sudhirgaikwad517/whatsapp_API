import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export interface CreateProductInput {
  title: string;
  description?: string;
  priceInINR: number;
  imageUrl?: string;
  sku?: string;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  priceInINR?: number;
  imageUrl?: string;
  sku?: string;
  isActive?: boolean;
}

export async function listProducts(organizationId: string) {
  return prisma.productCatalog.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProductById(organizationId: string, id: string) {
  const product = await prisma.productCatalog.findFirst({
    where: { id, organizationId },
  });
  if (!product) throw new AppError('Product not found in catalog.', 404, 'PRODUCT_NOT_FOUND');
  return product;
}

export async function createProduct(organizationId: string, input: CreateProductInput) {
  return prisma.productCatalog.create({
    data: {
      organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priceInINR: input.priceInINR,
      imageUrl: input.imageUrl?.trim() || null,
      sku: input.sku?.trim() || null,
      isActive: true,
    },
  });
}

export async function updateProduct(organizationId: string, id: string, input: UpdateProductInput) {
  await getProductById(organizationId, id);

  return prisma.productCatalog.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.priceInINR !== undefined ? { priceInINR: input.priceInINR } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
      ...(input.sku !== undefined ? { sku: input.sku?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteProduct(organizationId: string, id: string) {
  await getProductById(organizationId, id);
  await prisma.productCatalog.delete({ where: { id } });
  return { message: 'Product deleted from catalog.' };
}

// In-chat commerce orders (Payment Link flow node + the keyword-triggered
// commerce bot) previously had NO way to be viewed anywhere except a raw DB
// query — org admins had no visibility into which orders were created,
// pending, or actually paid.
export async function listPaymentOrders(organizationId: string, { page = 1, limit = 25 }: { page?: number; limit?: number } = {}) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.paymentOrder.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.paymentOrder.count({ where: { organizationId } }),
  ]);

  // PaymentOrder.contactId has no Prisma relation to Contact (a deliberate
  // loose reference, not an FK) — resolve names/numbers separately instead
  // of an include.
  const contactIds = [...new Set(orders.map((o) => o.contactId).filter((id): id is string => Boolean(id)))];
  const contacts = contactIds.length
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, firstName: true, lastName: true, phoneNumber: true },
      })
    : [];
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  return {
    orders: orders.map((o) => ({ ...o, contact: o.contactId ? contactMap.get(o.contactId) || null : null })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
