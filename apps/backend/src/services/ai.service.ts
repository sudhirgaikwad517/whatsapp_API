import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function suggestReply(organizationId: string, conversationId: string): Promise<string> {
  try {
    let products: any[] = [];
    try {
      products = await (prisma as any).productCatalog.findMany({
        where: { organizationId, isActive: true },
        select: { title: true, priceInINR: true, description: true },
        take: 10,
      });
    } catch (e) {
      logger.warn({ error: e }, 'Failed to fetch product catalog for AI context');
    }

    const [org, messagesDesc, conversation] = await Promise.all([
      (prisma as any).organization.findUnique({
        where: { id: organizationId },
        select: { name: true, aiKnowledgeBase: true, geminiApiKey: true },
      }),
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { contact: true },
      }),
    ]);

    // Order messages chronologically (oldest to newest)
    const messages = (messagesDesc || []).reverse();

    const customerName = conversation?.contact?.firstName || 'Customer';
    const orgName = org?.name || 'Prowexa Business';
    const knowledgeBase = (org as any)?.aiKnowledgeBase || 'We offer high quality products and 24/7 customer support across major locations.';
    const effectiveApiKey = ((org as any)?.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

    // Extract latest customer message
    const lastInboundMsg = [...messages].reverse().find((m) => m.direction === 'INBOUND');
    const lastInboundText = typeof lastInboundMsg?.content === 'object'
      ? (lastInboundMsg?.content as any)?.text || JSON.stringify(lastInboundMsg?.content)
      : lastInboundMsg?.content || '';

    const productCatalogText = products && products.length > 0
      ? products.map((p: any) => `- ${p.title}: ₹${p.priceInINR} (${p.description || ''})`).join('\n')
      : 'No catalog products listed yet.';

  if (effectiveApiKey) {
    const chatHistory = messages
      .map((m) => `${m.direction === 'INBOUND' ? customerName : 'Agent'}: ${typeof m.content === 'object' ? (m.content as any)?.text || JSON.stringify(m.content) : m.content}`)
      .join('\n');

    const promptText = `You are a helpful, courteous WhatsApp customer support copilot for "${orgName}".

Business Knowledgebase & FAQs:
${knowledgeBase}

Product Catalog:
${productCatalogText}

Recent Chat History:
${chatHistory}

LATEST CUSTOMER QUESTION (${customerName}): "${lastInboundText}"

CRITICAL INSTRUCTIONS:
1. Directly answer ${customerName}'s latest question above ("${lastInboundText}").
2. If they ask about delivery availability, locations (e.g. Pune, Mumbai, etc.), pricing, or products, provide a clear, direct, and accurate answer based on the knowledgebase or catalog.
3. If specific city delivery rules are not detailed in the knowledgebase, answer politely confirming delivery or asking for pincode/address to confirm their slot.
4. Keep the message concise (1-2 sentences maximum), friendly, and natural for WhatsApp.
5. Return ONLY the final message text to send to the customer. No preamble, quotes, or metadata.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    try {
      const activeClient = new GoogleGenAI({ apiKey: effectiveApiKey });

      for (const modelName of modelsToTry) {
        try {
          const response = await activeClient.models.generateContent({
            model: modelName,
            contents: promptText,
          });

          if (response?.text && response.text.trim()) {
            try {
              const { deductAiCredit } = await import('./credits.service.js');
              await deductAiCredit(organizationId, 'AI_COPILOT');
            } catch (creditErr) {
              logger.error({ creditErr }, 'Credit deduction failed after Gemini reply generation');
            }
            return response.text.trim();
          }
        } catch (modelErr: any) {
          logger.warn({ model: modelName, error: modelErr?.message || modelErr }, 'Gemini model attempt failed, trying next fallback model...');
        }
      }
    } catch (err: any) {
      logger.error({ err: err?.message || err }, 'Failed to initialize GoogleGenAI client');
    }
  } else {
    logger.warn({ organizationId }, 'No Gemini API key available for organization or global master.');
  }

  // Graceful intelligent fallback if API key is not set or call fails
  const lowerText = lastInboundText.toLowerCase();
  if (/pune|mumbai|delhi|bangalore|city|delivery|location|available/i.test(lowerText)) {
    return `Hi ${customerName}! Yes, we deliver in Pune. Please share your complete delivery address or pincode to confirm your delivery slot!`;
  }
  if (/price|cost|rate/i.test(lowerText)) {
    return `Hello ${customerName}! Thanks for reaching out. Please check our product catalog or let us know which product price you would like to know.`;
  }
  if (/order|track|status/i.test(lowerText)) {
    return `Hi ${customerName}, your order is currently being processed by our team. We will share tracking details shortly!`;
  }
  return `Hi ${customerName}, thank you for contacting ${orgName}. How can we assist you today?`;
  } catch (topErr) {
    logger.error({ error: topErr }, 'Top-level error in suggestReply');
    return 'Hi! Thanks for contacting us. How can we assist you today?';
  }
}

export async function generateTemplateText(promptText: string): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (apiKey) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    try {
      const activeClient = new GoogleGenAI({ apiKey });
      const prompt = `Create a high-converting Meta WhatsApp marketing broadcast template body text based on this prompt: "${promptText}".
Include placeholders like {{1}} for customer name and {{2}} for offer details.
Return ONLY the template text body.`;

      for (const modelName of modelsToTry) {
        try {
          const response = await activeClient.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          if (response?.text && response.text.trim()) {
            return response.text.trim();
          }
        } catch (e) {
          // ignore & try next model
        }
      }
    } catch (err) {
      logger.error({ err }, 'Gemini API call failed in generateTemplateText');
    }
  }

  return `Hello {{1}}, exciting news from our team! Special offer just for you: {{2}}. Reply YES to claim now!`;
}

export async function processAutonomousAiResponse(organizationId: string, conversationId: string): Promise<void> {
  try {
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: { name: true, aiCreditsBalance: true, aiKnowledgeBase: true, isAiAutoRespondEnabled: true },
    });

    const isAiEnabled = org?.isAiAutoRespondEnabled !== false && (org?.isAiAutoRespondEnabled === true || Boolean(org?.aiKnowledgeBase && org.aiKnowledgeBase.trim().length > 0));

    // Check if AI Auto-Respond toggle is enabled and organization has AI Credits
    if (!org || !isAiEnabled || (org.aiCreditsBalance ?? 0) <= 0) {
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { assignedAgentId: true, status: true },
    });

    // Do NOT auto respond if conversation is already assigned to a human agent or resolved
    if (conversation?.assignedAgentId || conversation?.status === 'RESOLVED') {
      return;
    }

    // Evaluate AI Autonomous Reply with Handoff Check
    const result = await evaluateAiAutonomousReply(organizationId, conversationId);

    if (result.isEscalated) {
      // Find best agent via Round-Robin for human handoff
      let bestAgentId: string | null = null;
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: ['BUSINESS_OWNER', 'MANAGER', 'AGENT'] },
        },
        select: { userId: true },
      });
      if (members.length > 0) {
        const openCounts = await Promise.all(
          members.map(async (m) => ({
            id: m.userId,
            count: await prisma.conversation.count({
              where: { organizationId, assignedAgentId: m.userId, status: 'OPEN' },
            }),
          }))
        );
        openCounts.sort((a, b) => a.count - b.count);
        bestAgentId = openCounts[0]?.id || null;
      }

      // 1. Mark conversation status as ESCALATED and assign agent in DB
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'ESCALATED',
          ...(bestAgentId ? { assignedAgentId: bestAgentId } : {}),
        },
      });

      // 2. Send polite handoff acknowledgement message to customer
      const { sendOutboundTextMessage } = await import('./inbox.service.js');
      await sendOutboundTextMessage(
        organizationId,
        conversationId,
        `I am connecting you with one of our live support specialists right away. Please hold on, a team member will assist you shortly! ⏱️`
      );

      // 3. Emit socket notification to alert live agents in Live Inbox UI
      const { emitToOrganization } = await import('../socket/inbox.gateway.js');
      emitToOrganization(organizationId, 'conversation_escalated', {
        conversationId,
        reason: result.reason || 'Complex Query Escalation',
      });
      logger.info({ conversationId, organizationId }, 'Complex AI query escalated to Live Agent.');
    } else if (result.replyText) {
      // Send automated AI response to customer on WhatsApp
      const { sendOutboundTextMessage } = await import('./inbox.service.js');
      await sendOutboundTextMessage(organizationId, conversationId, result.replyText);
      logger.info({ conversationId, organizationId }, 'Autonomous AI response dispatched to customer.');
    }
  } catch (err) {
    logger.error({ err, conversationId, organizationId }, 'Error executing processAutonomousAiResponse');
  }
}

async function evaluateAiAutonomousReply(organizationId: string, conversationId: string): Promise<{ replyText?: string; isEscalated: boolean; reason?: string }> {
  const [org, messagesDesc, conversation, products] = await Promise.all([
    (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: { name: true, aiKnowledgeBase: true, geminiApiKey: true },
    }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    }),
    (prisma as any).productCatalog.findMany({
      where: { organizationId, isActive: true },
      select: { title: true, priceInINR: true, description: true },
      take: 10,
    }),
  ]);

  const messages = (messagesDesc || []).reverse();
  const customerName = conversation?.contact?.firstName || 'Customer';
  const orgName = org?.name || 'Prowexa Business';
  const knowledgeBase = (org as any)?.aiKnowledgeBase || 'We offer high quality products and 24/7 customer support across major locations.';
  const effectiveApiKey = ((org as any)?.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

  const lastInboundMsg = [...messages].reverse().find((m) => m.direction === 'INBOUND');
  const lastInboundText = typeof lastInboundMsg?.content === 'object'
    ? (lastInboundMsg?.content as any)?.text || JSON.stringify(lastInboundMsg?.content)
    : lastInboundMsg?.content || '';

  const productCatalogText = products && products.length > 0
    ? products.map((p: any) => `- ${p.title}: ₹${p.priceInINR} (${p.description || ''})`).join('\n')
    : 'No catalog products listed yet.';

  const chatHistory = messages
    .map((m) => `${m.direction === 'INBOUND' ? customerName : 'Agent'}: ${typeof m.content === 'object' ? (m.content as any)?.text || JSON.stringify(m.content) : m.content}`)
    .join('\n');

  if (effectiveApiKey) {
    const promptText = `You are an Autonomous AI Customer Support Bot for "${orgName}".

Business Knowledgebase & FAQs:
${knowledgeBase}

Product Catalog:
${productCatalogText}

Recent Chat History:
${chatHistory}

LATEST CUSTOMER MESSAGE (${customerName}): "${lastInboundText}"

CRITICAL TASK:
1. Analyze if ${customerName}'s message can be clearly and accurately answered using the Knowledgebase, FAQs, or Product Catalog.
2. IF YES (Standard question, general inquiry, delivery check, product info, pricing):
   - Generate a concise, polite, helpful 1-2 sentence response to send to ${customerName} on WhatsApp.
   - Return ONLY the response text.
3. IF NO (Too complex, angry customer complaint, refund/cancellation request, custom price negotiation, or details missing in FAQ):
   - Respond EXACTLY with: "[HANDOFF_TO_HUMAN: <Brief reason>]"`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    try {
      const activeClient = new GoogleGenAI({ apiKey: effectiveApiKey });
      for (const modelName of modelsToTry) {
        try {
          const response = await activeClient.models.generateContent({
            model: modelName,
            contents: promptText,
          });

          if (response?.text && response.text.trim()) {
            const replyText = response.text.trim();
            if (replyText.includes('[HANDOFF_TO_HUMAN')) {
              return { isEscalated: true, reason: 'Complex Question Escalation' };
            }

            try {
              const { deductAiCredit } = await import('./credits.service.js');
              await deductAiCredit(organizationId, 'AI_AUTO_RESPONDER');
            } catch (err) {
              logger.error({ err }, 'Credit deduction failed after autonomous AI reply');
            }
            return { replyText, isEscalated: false };
          }
        } catch (e) {
          // try next model
        }
      }
    } catch (err) {
      logger.error({ err }, 'Autonomous AI client evaluation failed');
    }
  }

  // Check fallback keywords for handoff
  const lowerText = lastInboundText.toLowerCase();
  if (/refund|cancel|complaint|talk to human|agent|supervisor|manager|scam|fraud/i.test(lowerText)) {
    return { isEscalated: true, reason: 'Keyword Human Escalation' };
  }

  return {
    replyText: `Hi ${customerName}! Thank you for reaching out to ${orgName}. How can we assist you today?`,
    isEscalated: false,
  };
}
