import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

interface CreateInvoiceInput {
  organizationId: string;
  invoicePrefix: 'INV-AI' | 'INV-PLAN' | 'INV-USG';
  grandTotal: number; // GST-inclusive amount actually charged
  paymentId: string;
  gatewayName: string;
  description: string;
}

/**
 * Creates a tax invoice for a captured payment, deriving the pre-tax subtotal
 * and 18% GST split from the GST-inclusive grand total. Shared by every
 * payment-confirmation path (AI credits, plan purchase, wallet recharge) so
 * the invoice-numbering and Decimal-construction boilerplate lives in one place.
 */
export async function createInvoiceRecord(input: CreateInvoiceInput) {
  const subtotal = Number((input.grandTotal / 1.18).toFixed(2));
  const taxAmount = Number((input.grandTotal - subtotal).toFixed(2));

  return prisma.invoice.create({
    data: {
      organizationId: input.organizationId,
      invoiceNumber: `${input.invoicePrefix}-${Date.now().toString().slice(-6)}`,
      description: input.description,
      subtotal: new Prisma.Decimal(subtotal),
      taxAmount: new Prisma.Decimal(taxAmount),
      grandTotal: new Prisma.Decimal(input.grandTotal),
      currency: 'INR',
      paymentId: input.paymentId,
      gatewayName: input.gatewayName,
      status: 'PAID',
    },
  });
}
