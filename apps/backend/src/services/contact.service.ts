import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export interface CreateContactInput {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  customAttributes?: Record<string, any>;
  tags?: string[]; // Tag IDs
}

export async function listContacts(
  organizationId: string,
  options: { page?: number; limit?: number; search?: string; tagId?: string }
) {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = { organizationId, deletedAt: null };

  if (options.search) {
    where.OR = [
      { firstName: { contains: options.search, mode: 'insensitive' } },
      { lastName: { contains: options.search, mode: 'insensitive' } },
      { phoneNumber: { contains: options.search } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options.tagId) {
    where.tags = { some: { tagId: options.tagId } };
  }

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      skip,
      take: limit,
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    contacts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function cleanPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  // Indian domestic trunk-prefix format (a leading 0 before the real
  // 10-digit number — common when pasted from a phone's call log). Without
  // stripping it, this fell straight through to the `+${cleanDigits}`
  // return below untouched, producing an invalid `+0XXXXXXXXXX` MSISDN that
  // Meta's WhatsApp API rejects or silently fails to deliver to.
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const cleanDigits = digits.length === 10 ? `91${digits}` : digits;
  return `+${cleanDigits}`;
}

export async function createContact(organizationId: string, input: CreateContactInput) {
  const formattedPhone = cleanPhone(input.phoneNumber);

  const existing = await prisma.contact.findUnique({
    where: {
      organizationId_phoneNumber: {
        organizationId,
        phoneNumber: formattedPhone,
      },
    },
  });

  if (existing) {
    throw new AppError('Contact with this phone number already exists.', 409, 'CONTACT_ALREADY_EXISTS');
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId,
      phoneNumber: formattedPhone,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      customAttributes: input.customAttributes || {},
      tags: input.tags?.length
        ? { create: input.tags.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return contact;
}

export async function bulkImportContacts(organizationId: string, contacts: CreateContactInput[]) {
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of contacts) {
    try {
      // Without this, a CSV row's raw phone format (whatever the file
      // happened to contain — with or without +91, spaces, a leading 0)
      // never matched an existing contact created via the single-add form
      // (which does normalize), so the same real number imported in a
      // different raw format created a duplicate contact instead of
      // updating the existing one.
      const formattedPhone = cleanPhone(item.phoneNumber);
      await prisma.contact.upsert({
        where: {
          organizationId_phoneNumber: {
            organizationId,
            phoneNumber: formattedPhone,
          },
        },
        update: {
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
        },
        create: {
          organizationId,
          phoneNumber: formattedPhone,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
        },
      });
      createdCount++;
    } catch {
      skippedCount++;
    }
  }

  return { createdCount, skippedCount, totalProcessed: contacts.length };
}

export async function listTags(organizationId: string) {
  return prisma.tag.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
}

export async function createTag(organizationId: string, name: string, color?: string) {
  return prisma.tag.create({
    data: {
      organizationId,
      name,
      color: color || '#10b981',
    },
  });
}

export async function toggleOptStatus(organizationId: string, contactId: string, isOptedIn: boolean) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
  });

  if (!contact) throw new AppError('Contact not found.', 404, 'CONTACT_NOT_FOUND');

  return prisma.contact.update({
    where: { id: contactId },
    data: {
      isOptedIn,
      optedInAt: isOptedIn ? new Date() : null,
    },
  });
}

export async function deleteContact(organizationId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
  });

  if (!contact) throw new AppError('Contact not found.', 404, 'CONTACT_NOT_FOUND');

  return prisma.contact.update({
    where: { id: contactId },
    data: { deletedAt: new Date() },
  });
}

export async function getContactTimeline(organizationId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
  });

  if (!contact) {
    throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
  }

  const timeline = await prisma.contactTimeline.findMany({
    where: { organizationId, contactId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return {
    contact,
    timeline,
  };
}
