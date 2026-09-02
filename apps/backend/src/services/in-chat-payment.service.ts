import axios from 'axios';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { sendOutboundTextMessage } from './inbox.service.js';
import { safeDecryptToken } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

export async function createRazorpayInChatPaymentLink(
  organizationId: string,
  conversationId: string,
  amountInINR: number,
  description: string
) {
  const [conversation, org] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { contact: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { razorpayKeyId: true, razorpayKeySecret: true },
    }),
  ]);

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  const razorpayKeyId = org?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = safeDecryptToken(org?.razorpayKeySecret) || process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new AppError(
      'Razorpay Payment Gateway credentials not configured. Please enter your Razorpay Key ID & Secret in Organization Settings.',
      400,
      'RAZORPAY_NOT_CONFIGURED'
    );
  }

  const amountInPaise = Math.round(amountInINR * 100);
  const authHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

  let paymentLink: string;
  let shortUrl: string;
  let gatewayOrderId: string;

  try {
    const rzpResponse = await axios.post(
      'https://api.razorpay.com/v1/payment_links',
      {
        amount: amountInPaise,
        currency: 'INR',
        accept_partial: false,
        description: description || 'Payment for Order',
        customer: {
          name: `${conversation.contact.firstName || 'Customer'} ${conversation.contact.lastName || ''}`.trim(),
          contact: conversation.contact.phoneNumber,
          email: conversation.contact.email || undefined,
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    gatewayOrderId = rzpResponse.data.id;
    paymentLink = rzpResponse.data.short_url || rzpResponse.data.url;
    shortUrl = paymentLink;
  } catch (err: any) {
    // The gateway call genuinely failed — surface it rather than fabricating a
    // fake rzp.io link that would silently never actually collect payment.
    logger.error(
      { organizationId, conversationId, err: err.response?.data || err.message },
      'Razorpay payment link creation failed.'
    );
    throw new AppError(
      `Failed to create payment link: ${err.response?.data?.error?.description || err.message}`,
      502,
      'RAZORPAY_PAYMENT_LINK_FAILED'
    );
  }

  // Create PaymentOrder record in database
  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      organizationId,
      contactId: conversation.contact.id,
      gatewayOrderId,
      gatewayName: 'RAZORPAY',
      amount: amountInINR,
      taxAmount: 0,
      totalAmount: amountInINR,
      paymentLink,
      shortUrl,
      status: 'CREATED',
    },
  });

  // Dispatch payment card into WhatsApp conversation!
  const whatsappMessageText = `💳 *Payment Request from Business*\n\n📌 *Order Description:* ${description}\n💰 *Amount Due:* ₹${amountInINR.toFixed(2)}\n\n👉 *Pay Securely via UPI / Card / NetBanking:* ${shortUrl}\n\n_Thank you for doing business with us!_`;

  await sendOutboundTextMessage(organizationId, conversationId, whatsappMessageText);

  return {
    paymentOrder,
    paymentLink: shortUrl,
    whatsappMessageText,
  };
}
