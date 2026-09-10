import { Worker } from 'bullmq';
import axios from 'axios';
import { createRedisConnection } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { safeDecryptToken } from '../utils/encryption.js';
import { paymentOrderPollQueue } from '../queues/index.js';

const POLL_WINDOW_DAYS = 3;

async function pollPendingPaymentOrders(): Promise<void> {
  const windowStart = new Date(Date.now() - POLL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const pendingOrders = await prisma.paymentOrder.findMany({
    where: { status: 'CREATED', createdAt: { gte: windowStart } },
    include: { organization: { select: { razorpayKeyId: true, razorpayKeySecret: true } } },
  });

  if (pendingOrders.length === 0) return;

  // Past the poll window, a link is almost certainly abandoned — stop
  // checking it forever and let it settle into a terminal state.
  await prisma.paymentOrder.updateMany({
    where: { status: 'CREATED', createdAt: { lt: windowStart } },
    data: { status: 'EXPIRED' },
  });

  for (const order of pendingOrders) {
    const keyId = order.organization?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = safeDecryptToken(order.organization?.razorpayKeySecret) || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) continue;

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const res = await axios.get(`https://api.razorpay.com/v1/payment_links/${order.gatewayOrderId}`, {
        headers: { Authorization: `Basic ${authHeader}` },
      });

      const rzpStatus = res.data?.status;
      if (rzpStatus === 'paid') {
        // Shared with the instant "payment_link.paid" webhook path — safe to
        // call from both, whichever lands first wins (see its own comment).
        const { markPaymentOrderPaid } = await import('../services/in-chat-payment.service.js');
        await markPaymentOrderPaid(order.id);
      } else if (rzpStatus === 'expired' || rzpStatus === 'cancelled') {
        await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: rzpStatus === 'expired' ? 'EXPIRED' : 'FAILED' } });
      }
    } catch (err) {
      logger.warn({ paymentOrderId: order.id, err }, 'Failed to poll Razorpay payment link status.');
    }
  }
}

export const paymentOrderPollWorker = new Worker(
  'payment-order-poll',
  async () => {
    await pollPendingPaymentOrders();
  },
  { connection: createRedisConnection(), concurrency: 1 }
);

paymentOrderPollWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Payment order poll job failed');
});

// Schedule the repeating job once at process start. BullMQ dedupes repeatable
// jobs by their pattern/jobId, so this is safe to call on every server boot.
paymentOrderPollQueue.add('poll', {}, { repeat: { every: 3 * 60 * 1000 }, jobId: 'payment-order-poll-recurring' });
