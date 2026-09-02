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
