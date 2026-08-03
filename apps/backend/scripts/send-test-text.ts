import { sendOutboundTextMessage } from '../src/services/inbox.service.js';
import { prisma } from '../src/config/database.js';

async function testSend() {
  const conv = await prisma.conversation.findFirst({
    where: { contact: { phoneNumber: { contains: '7666130611' } } },
    include: { contact: true },
  });

  if (!conv) {
    console.error('No conversation found for 7666130611');
    return;
  }

  console.log(`Sending test outbound message to ${conv.contact.phoneNumber}...`);
  const msg = await sendOutboundTextMessage(conv.organizationId, conv.id, 'Hello Sudhir! This is a live outbound test from Prowexa engine. Reply to this message!');
  console.log('✅ Sent successfully! Message ID:', msg.id);
}

testSend()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
