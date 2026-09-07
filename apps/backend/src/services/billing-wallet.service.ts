import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { getTemplateSentCounts, getPricingRates } from './usage-metrics.service.js';

type QueryableClient = PrismaClient | Prisma.TransactionClient;

export async function getOrCreateWallet(organizationId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { organizationId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        organizationId,
        availableBalance: new Prisma.Decimal(500.0), // Welcome bonus credits ₹500
        reservedBalance: new Prisma.Decimal(0.0),
        currency: 'INR',
      },
    });

    // Initial Ledger record
    await prisma.walletLedger.create({
      data: {
        walletId: wallet.id,
        organizationId,
        transactionType: 'BONUS',
        amount: new Prisma.Decimal(500.0),
        openingBalance: new Prisma.Decimal(0.0),
        closingBalance: new Prisma.Decimal(500.0),
        description: 'Welcome Promotional Bonus Credits',
      },
    });
  }

  return wallet;
}

/**
 * Commits any usage (messages sent since the last reconciliation) that has
 * been counted toward billing but never actually turned into a Wallet debit
 * + WalletLedger row. Previously this only ran inside rechargeWallet(), so
 * the ledger's audit trail (and the stored Wallet balance) silently lagged
 * behind the live-computed "spendable balance" shown on the Billing page
 * until the org's next recharge — a message send would visibly reduce the
 * displayed balance immediately, but no corresponding DEBIT row appeared
 * until much later. Calling this from the wallet-details GET endpoint too
 * means simply opening the Billing page keeps the ledger caught up.
 */
export async function reconcileUnbilledUsage(organizationId: string, tx: QueryableClient) {
  let wallet = await tx.wallet.findUnique({ where: { organizationId } });
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: { organizationId, availableBalance: new Prisma.Decimal(500.0), reservedBalance: new Prisma.Decimal(0.0) },
    });
  }

  const { marketingSent, utilitySent } = await getTemplateSentCounts(tx, { organizationId });
  const rates = await getPricingRates(tx);
  const calculatedCharges = Number((marketingSent * rates.marketingClientPrice + utilitySent * rates.utilityClientPrice).toFixed(2));

  const ledgerDebitsSum = await tx.walletLedger.aggregate({
    _sum: { amount: true },
    where: { organizationId, transactionType: { in: ['DEBIT', 'MANUAL_DEBIT'] } },
  });
  const ledgerDebits = Number(ledgerDebitsSum._sum?.amount || 0);
  const unbilledCharges = calculatedCharges > ledgerDebits ? calculatedCharges - ledgerDebits : 0;

  if (unbilledCharges <= 0) return wallet;

  const currentBalance = wallet.availableBalance;
  const debitAmount = new Prisma.Decimal(unbilledCharges);
  const newBalanceAfterDebit = Decimal.sub(currentBalance, debitAmount);

  const updatedWallet = await tx.wallet.update({
    where: { id: wallet.id },
    data: { availableBalance: { decrement: debitAmount } },
  });

  await tx.walletLedger.create({
    data: {
      walletId: wallet.id,
      organizationId,
      transactionType: 'DEBIT',
      amount: debitAmount,
      openingBalance: currentBalance,
      closingBalance: newBalanceAfterDebit,
      referenceId: `USAGE_${Date.now()}`,
      description: 'Messaging Usage Charges',
    },
  });

  return updatedWallet;
}

/**
 * Wallet Top-Up / Recharge
 */
export async function rechargeWallet(
  organizationId: string,
  amountNumber: number,
  referenceId: string,
  description: string
) {
  const amount = new Prisma.Decimal(amountNumber);

  return await prisma.$transaction(async (tx) => {
    // Acquire a pessimistic row-level lock
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "organizationId" = ${organizationId}::uuid FOR UPDATE`;

    // 1. Calculate and auto-commit any pending unbilled charges BEFORE recharge
    let wallet = await reconcileUnbilledUsage(organizationId, tx);

    // 2. Process the actual Recharge
    const openingBalance = wallet.availableBalance;
    const closingBalance = Decimal.add(openingBalance, amount);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: amount },
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        organizationId,
        transactionType: 'RECHARGE',
        amount,
        openingBalance,
        closingBalance,
        referenceId,
        description,
      },
    });

    return updatedWallet;
  });
}

/**
 * Direct Wallet Debit Function (Supports overdraft negative balance)
 */
export async function deductDirectWalletBalance(
  organizationId: string,
  amountNumber: number,
  referenceId: string,
  description: string
) {
  const amount = new Prisma.Decimal(amountNumber);

  return await prisma.$transaction(async (tx) => {
    // Acquire a pessimistic row-level lock
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "organizationId" = ${organizationId}::uuid FOR UPDATE`;

    let wallet = await tx.wallet.findUnique({
      where: { organizationId },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          organizationId,
          availableBalance: new Prisma.Decimal(0.0),
          reservedBalance: new Prisma.Decimal(0.0),
        },
      });
    }

    const openingBalance = wallet.availableBalance;
    const closingBalance = Decimal.sub(openingBalance, amount);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: closingBalance,
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        organizationId,
        transactionType: 'DEBIT',
        amount,
        openingBalance,
        closingBalance,
        referenceId,
        description,
      },
    });

    return updatedWallet;
  });
}

class Decimal {
  static sub(a: Prisma.Decimal, b: Prisma.Decimal) {
    return a.sub(b);
  }
  static add(a: Prisma.Decimal, b: Prisma.Decimal) {
    return a.add(b);
  }
}

export function getPerMessageRate(category: string): number {
  switch (category?.toUpperCase()) {
    case 'MARKETING':
      return 1.00; // Meta base ₹0.8631 + Prowexa profit margin
    case 'UTILITY':
      return 0.20; // Meta base ₹0.1150 + Prowexa profit margin
    case 'AUTHENTICATION':
      return 0.25; // Meta base ₹0.1150 + Prowexa profit margin
    case 'AUTHENTICATION_INTL':
      return 3.00; // Meta base ₹2.4971 + Prowexa profit margin
    case 'SERVICE':
    default:
      return 0.00; // Free / 24h session
  }
}
