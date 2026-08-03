import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';

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
 * 2-PHASE COMMIT STEP 1: Reserve funds before dispatch
 */
export async function reserveWalletFunds(
  organizationId: string,
  amountNumber: number,
  messageReferenceId: string
) {
  const amount = new Prisma.Decimal(amountNumber);

  return await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({
      where: { organizationId },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          organizationId,
          availableBalance: new Prisma.Decimal(500.0),
          reservedBalance: new Prisma.Decimal(0.0),
        },
      });
    }

    if (wallet.isFrozen) {
      throw new AppError('Wallet is frozen due to policy or administrative hold.', 403, 'WALLET_FROZEN');
    }

    const spendable = Decimal.sub(wallet.availableBalance, wallet.reservedBalance);
    if (spendable.lessThan(amount)) {
      throw new AppError(
        `Insufficient Wallet Balance. Required: ₹${amountNumber}, Spendable: ₹${spendable.toString()}`,
        402,
        'INSUFFICIENT_FUNDS'
      );
    }

    // Lock funds: Increase reserved balance
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        reservedBalance: { increment: amount },
      },
    });

    // Expiry: 15 mins lock window
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const reservation = await tx.walletReservation.create({
      data: {
        walletId: wallet.id,
        organizationId,
        messageReferenceId,
        reservedAmount: amount,
        status: 'HELD',
        expiresAt,
      },
    });

    logger.info(
      { organizationId, messageReferenceId, amount: amountNumber, spendableRemaining: Decimal.sub(updatedWallet.availableBalance, updatedWallet.reservedBalance).toString() },
      '2-Phase Wallet Reservation HELD successfully.'
    );

    return reservation;
  });
}

/**
 * 2-PHASE COMMIT STEP 2A: Commit reservation on delivery/accepted
 */
export async function commitWalletReservation(
  organizationId: string,
  messageReferenceId: string
) {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.walletReservation.findUnique({
      where: { messageReferenceId },
    });

    if (!reservation || reservation.status !== 'HELD') {
      return null; // Already committed or released
    }

    const wallet = await tx.wallet.findUnique({
      where: { id: reservation.walletId },
    });

    if (!wallet) return null;

    const openingBalance = wallet.availableBalance;
    const closingBalance = Decimal.sub(openingBalance, reservation.reservedAmount);

    // Update Wallet: Decrement both available and reserved balances
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: reservation.reservedAmount },
        reservedBalance: { decrement: reservation.reservedAmount },
      },
    });

    // Mark reservation as COMPLETED
    await tx.walletReservation.update({
      where: { id: reservation.id },
      data: { status: 'COMPLETED' },
    });

    // Append immutable Ledger record
    const ledger = await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        organizationId,
        transactionType: 'DEBIT',
        amount: reservation.reservedAmount,
        openingBalance,
        closingBalance,
        referenceId: messageReferenceId,
        description: `Message Dispatch Fee Deduction`,
      },
    });

    logger.info(
      { organizationId, messageReferenceId, amount: reservation.reservedAmount.toString(), closingBalance: closingBalance.toString() },
      '2-Phase Wallet Reservation COMMITTED & DEBITED.'
    );

    return ledger;
  });
}

/**
 * 2-PHASE COMMIT STEP 2B: Release reservation on failed dispatch
 */
export async function releaseWalletReservation(
  organizationId: string,
  messageReferenceId: string,
  reason: string
) {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.walletReservation.findUnique({
      where: { messageReferenceId },
    });

    if (!reservation || reservation.status !== 'HELD') {
      return null; // Already committed or released
    }

    // Decrement reserved balance back to spendable
    await tx.wallet.update({
      where: { id: reservation.walletId },
      data: {
        reservedBalance: { decrement: reservation.reservedAmount },
      },
    });

    // Mark reservation RELEASED
    await tx.walletReservation.update({
      where: { id: reservation.id },
      data: { status: 'RELEASED' },
    });

    logger.info(
      { organizationId, messageReferenceId, reason, amount: reservation.reservedAmount.toString() },
      '2-Phase Wallet Reservation RELEASED.'
    );

    return true;
  });
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
    let wallet = await tx.wallet.findUnique({
      where: { organizationId },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { organizationId, availableBalance: new Prisma.Decimal(0) },
      });
    }

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

class Decimal {
  static sub(a: Prisma.Decimal, b: Prisma.Decimal) {
    return new Prisma.Decimal(a.toNumber() - b.toNumber());
  }
  static add(a: Prisma.Decimal, b: Prisma.Decimal) {
    return new Prisma.Decimal(a.toNumber() + b.toNumber());
  }
}
