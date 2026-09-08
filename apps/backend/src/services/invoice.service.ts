import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database.js';

type QueryableClient = PrismaClient | Prisma.TransactionClient;

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
 *
 * Pass `client` as an active `$transaction` callback's `tx` (not the bare
 * `prisma` default) when this call needs to be atomic with the credit-grant
 * it's confirming — Invoice.paymentId has a unique constraint specifically
 * so that two concurrent confirmations of the same payment (a double-click,
 * a retried request after a timeout) can't both pass an earlier
 * check-then-act idempotency check and both grant credit: only one insert
 * here can succeed, and doing it inside the same transaction as the credit
 * grant means the loser's transaction rolls back the credit too, not just
 * the invoice.
 */
export async function createInvoiceRecord(input: CreateInvoiceInput, client: QueryableClient = prisma) {
  const subtotal = Number((input.grandTotal / 1.18).toFixed(2));
  const taxAmount = Number((input.grandTotal - subtotal).toFixed(2));

  return client.invoice.create({
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
