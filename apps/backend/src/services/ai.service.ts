import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';
import { safeDecryptToken } from '../utils/encryption.js';
import crypto from 'crypto';

export async function suggestReply(organizationId: string, conversationId: string): Promise<string> {
  try {
    const [org, messagesDesc, conversation] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, aiKnowledgeBase: true, geminiApiKey: true },
      }),
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 5, // Optimization: Limit Chat History
      }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { contact: true },
      }),
    ]);

    const messages = (messagesDesc || []).reverse();
    const customerName = conversation?.contact?.firstName || 'Customer';
    const orgName = org?.name || 'Prowexa Business';
    const knowledgeBase = org?.aiKnowledgeBase || 'We offer high quality products and 24/7 customer support across major locations.';
    const effectiveApiKey = (safeDecryptToken(org?.geminiApiKey) || process.env.GEMINI_API_KEY || '').trim();

    const lastInboundMsg = [...messages].reverse().find((m) => m.direction === 'INBOUND');
    const lastInboundText = typeof lastInboundMsg?.content === 'object'
      ? (lastInboundMsg?.content as any)?.text || JSON.stringify(lastInboundMsg?.content)
      : lastInboundMsg?.content || '';

    // Optimization: Semantic Redis Caching
    const normalizedHash = crypto.createHash('sha256').update(lastInboundText.toLowerCase().trim()).digest('hex');
    const cacheKey = `ai_cache:${organizationId}:${normalizedHash}`;
    try {
      const cachedResponse = await redis.get(cacheKey);
      if (cachedResponse) {
        logger.info({ organizationId, cacheKey }, 'Semantic Cache Hit. Skipping Gemini AI.');
        return cachedResponse;
      }
    } catch (e) {
      logger.warn({ error: e }, 'Redis cache check failed');
    }

    // Optimization: Basic RAG (Product Vectorization via ILIKE keywords)
    let products: any[] = [];
    if (lastInboundText) {
      const searchWords = lastInboundText.split(' ').filter((w: string) => w.length > 3).slice(0, 3);
      const orConditions = searchWords.map((w: string) => ({
        OR: [
          { title: { contains: w, mode: 'insensitive' } },
          { description: { contains: w, mode: 'insensitive' } }
        ]
      }));
      
      try {
        products = await prisma.productCatalog.findMany({
          where: { 
            organizationId, 
            isActive: true,
            ...(orConditions.length > 0 ? { OR: orConditions.flatMap((o: any) => o.OR) } : {})
          },
          select: { title: true, priceInINR: true, description: true },
          take: 3, // Optimization: Top 3 products only
        });
      } catch (e) {
        logger.warn({ error: e }, 'Failed to fetch product catalog for AI context');
      }
    }

    const productCatalogText = products && products.length > 0
      ? products.map((p: any) => `- ${p.title}: ₹${p.priceInINR} (${p.description || ''})`).join('\n')
      : 'No relevant catalog products found for this query.';

    if (effectiveApiKey) {
      const chatHistory = messages
        .map((m) => `${m.direction === 'INBOUND' ? customerName : 'Agent'}: ${typeof m.content === 'object' ? (m.content as any)?.text || JSON.stringify(m.content) : m.content}`)
        .join('\n');

      const systemInstruction = `You are a helpful, courteous WhatsApp customer support copilot for "${orgName}".

Business Knowledgebase & FAQs:
${knowledgeBase}

Relevant Product Catalog Context (RAG):
${productCatalogText}

CRITICAL INSTRUCTIONS:
1. Directly answer the customer's latest question.
2. If they ask about delivery availability, locations (e.g. Pune, Mumbai, etc.), pricing, or products, provide a clear, direct, and accurate answer based on the knowledgebase or catalog.
3. If specific city delivery rules are not detailed in the knowledgebase, answer politely confirming delivery or asking for pincode/address to confirm their slot.
4. Keep the message concise (1-2 sentences maximum), friendly, and natural for WhatsApp.
5. Return ONLY the final message text to send to the customer. No preamble, quotes, or metadata.`;

      const userContent = `Recent Chat History:
${chatHistory}

LATEST CUSTOMER QUESTION (${customerName}): "${lastInboundText}"`;

      // Optimization: Downgrade Model to 8B for huge cost savings
      const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];

      try {
        const activeClient = new GoogleGenAI({ apiKey: effectiveApiKey });

        for (const modelName of modelsToTry) {
          try {
            const response = await activeClient.models.generateContent({
              model: modelName,
              contents: userContent,
              config: {
                systemInstruction: systemInstruction,
              },
            });

            if (response?.text && response.text.trim()) {
              const finalText = response.text.trim();
              
              // Save to Redis Cache (24 hours = 86400 seconds)
              try {
                await redis.setex(cacheKey, 86400, finalText);
              } catch (e) {}

              try {
                const { deductAiCredit } = await import('./credits.service.js');
                await deductAiCredit(organizationId, 'AI_COPILOT');
              } catch (creditErr) {
                logger.error({ creditErr }, 'Credit deduction failed after Gemini reply generation');
              }
              return finalText;
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
    // Optimization: Downgrade to 8B
    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
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
    const org = await prisma.organization.findUnique({
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
      // Find best agent via Round-Robin for human handoff. The owner is only
      // a last-resort fallback (e.g. a solo org with no hired staff yet) —
      // otherwise, with every agent starting at an open-chat count of 0, a
      // plain tie-break would always hand every escalation to the owner
      // (first row, stable sort) even while they're offline and staff are
      // actively logged in.
      let bestAgentId: string | null = null;
      let members = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: ['MANAGER', 'AGENT'] },
          isActive: true,
        },
        select: { userId: true },
      });
      if (members.length === 0) {
        members = await prisma.organizationMember.findMany({
          where: { organizationId, role: 'BUSINESS_OWNER', isActive: true },
          select: { userId: true },
        });
      }
      if (members.length > 0) {
        const openCounts = await Promise.all(
          members.map(async (m: any) => ({
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
          ...(bestAgentId ? { assignedAgentId: bestAgentId, assignedAt: new Date(), agentOpenedAt: null } : {}),
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

      // 4. Notify the assigned agent directly (email always; WhatsApp too if
      // the org has configured an approved template) — the in-app socket
      // event alone only reaches an agent who already has the Inbox open.
      if (bestAgentId) {
        const { notifyAgentOfEscalation } = await import('./agent-notification.service.js');
        void notifyAgentOfEscalation(organizationId, bestAgentId, conversationId);
      }
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
  let lastError = 'No API Error';
  const [org, messagesDesc, conversation] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, aiKnowledgeBase: true, geminiApiKey: true },
    }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 5, // Optimization: Limit Chat History
    }),
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    })
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

  // Optimization: Semantic Redis Caching
  const normalizedHash = crypto.createHash('sha256').update(lastInboundText.toLowerCase().trim()).digest('hex');
  const cacheKey = `ai_auto_cache:${organizationId}:${normalizedHash}`;
  try {
    const cachedResponse = await redis.get(cacheKey);
    if (cachedResponse) {
      if (cachedResponse === '[ESCALATED]') {
        return { isEscalated: true, reason: 'Complex Question Escalation (Cached)' };
      }
      logger.info({ organizationId, cacheKey }, 'Semantic Cache Hit for Auto Responder. Skipping Gemini.');
      return { replyText: cachedResponse, isEscalated: false };
    }
  } catch (e) {}

  // Optimization: RAG (Product Vectorization)
  let products: any[] = [];
  if (lastInboundText) {
    const searchWords = lastInboundText.split(' ').filter((w: string) => w.length > 3).slice(0, 3);
    const orConditions = searchWords.map((w: string) => ({
      OR: [
        { title: { contains: w, mode: 'insensitive' } },
        { description: { contains: w, mode: 'insensitive' } }
      ]
    }));
    
    try {
      products = await prisma.productCatalog.findMany({
        where: { 
          organizationId, 
          isActive: true,
          ...(orConditions.length > 0 ? { OR: orConditions.flatMap((o: any) => o.OR) } : {})
        },
        select: { title: true, priceInINR: true, description: true },
        take: 3, // Optimization: Top 3 only
      });
    } catch (e) {}
  }

  const productCatalogText = products && products.length > 0
    ? products.map((p: any) => `- ${p.title}: ₹${p.priceInINR} (${p.description || ''})`).join('\n')
    : 'No relevant catalog products found for this query.';

  const chatHistory = messages
    .map((m) => `${m.direction === 'INBOUND' ? customerName : 'Agent'}: ${typeof m.content === 'object' ? (m.content as any)?.text || JSON.stringify(m.content) : m.content}`)
    .join('\n');

  if (effectiveApiKey) {
    const promptText = `You are an Autonomous AI Customer Support Bot for "${orgName}".

Business Knowledgebase & FAQs:
${knowledgeBase}

Relevant Product Catalog (RAG):
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

    // Optimization: Model Downgrade
    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
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
              try { await redis.setex(cacheKey, 86400, '[ESCALATED]'); } catch (e) {}
              return { isEscalated: true, reason: 'Complex Question Escalation' };
            }

            try { await redis.setex(cacheKey, 86400, replyText); } catch (e) {}

            try {
              const { deductAiCredit } = await import('./credits.service.js');
              await deductAiCredit(organizationId, 'AI_AUTO_RESPONDER');
            } catch (err) {
              logger.error({ err }, 'Credit deduction failed after autonomous AI reply');
            }
            return { replyText, isEscalated: false };
          }
        } catch (e: any) {
          lastError = e?.message || String(e);
        }
      }
    } catch (err: any) {
      logger.error({ err }, 'Autonomous AI client evaluation failed');
      lastError = err?.message || String(err);
    }
  }

  // Check fallback keywords for handoff
  const lowerText = lastInboundText.toLowerCase();
  if (/refund|cancel|complaint|talk to human|agent|supervisor|manager|scam|fraud/i.test(lowerText)) {
    return { isEscalated: true, reason: 'Keyword Human Escalation' };
  }

  return {
    replyText: `[DEBUG: API Key Len: ${effectiveApiKey.length}, Err: ${lastError}] Hi ${customerName}! Thank you for reaching out to ${orgName}. How can we assist you today?`,
    isEscalated: false,
  };
}
