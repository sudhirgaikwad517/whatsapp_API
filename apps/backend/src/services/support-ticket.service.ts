import { prisma } from '../config/database.js';
import { TicketPriority } from '@prisma/client';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';

export async function createSupportTicket(
  organizationId: string,
  userId: string,
  data: { subject: string; priority?: string; category?: string; description: string }
) {
  const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

  if (data.priority && !Object.values(TicketPriority).includes(data.priority as TicketPriority)) {
    throw new AppError(
      `Invalid ticket priority "${data.priority}". Must be one of: ${Object.values(TicketPriority).join(', ')}.`,
      400,
      'INVALID_PRIORITY'
    );
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      organizationId,
      subject: data.subject,
      priority: (data.priority as TicketPriority) || 'MEDIUM',
      status: 'OPEN',
      messages: {
        create: {
          senderType: 'USER',
          senderId: userId,
          message: data.description,
        },
      },
    },
    include: {
      messages: true,
      organization: { select: { name: true } },
    },
  });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } });
    if (user) {
      const { sendMail, buildSupportTicketReceivedEmail } = await import('../utils/mailer.js');
      await sendMail({
        to: user.email,
        subject: `Support Ticket Received — ${ticketNumber}`,
        html: buildSupportTicketReceivedEmail({ fullName: user.fullName, ticketNumber, subject: data.subject }),
      });
    }
  } catch (err) {
    logger.error({ organizationId, ticketNumber, err }, 'Failed to send support ticket confirmation email.');
  }

  return ticket;
}

export async function listClientSupportTickets(organizationId: string) {
  return prisma.supportTicket.findMany({
    where: { organizationId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addMessageToTicket(
  organizationId: string,
  userId: string,
  ticketId: string,
  messageText: string
) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, organizationId },
  });

  if (!ticket) {
    throw new AppError('Support ticket not found', 404, 'NOT_FOUND');
  }

  const msg = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderType: 'USER',
      senderId: userId,
      message: messageText,
    },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: 'OPEN', updatedAt: new Date() },
  });

  return msg;
}
