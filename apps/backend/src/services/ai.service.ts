import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function suggestReply(organizationId: string, conversationId: string): Promise<string> {
  const [org, messages, conversation] = await Promise.all([
    (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: { name: true, aiKnowledgeBase: true, geminiApiKey: true },
    }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    }),
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    }),
  ]);

  const customerName = conversation?.contact?.firstName || 'Customer';
  const orgName = org?.name || 'Prowexa Business';
  const knowledgeBase = (org as any)?.aiKnowledgeBase || 'We offer high quality products and 24/7 customer support.';
  const effectiveApiKey = ((org as any)?.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

  if (effectiveApiKey) {
    const chatHistory = messages
      .map((m) => `${m.direction === 'INBOUND' ? customerName : 'Agent'}: ${typeof m.content === 'object' ? (m.content as any)?.text || JSON.stringify(m.content) : m.content}`)
      .join('\n');

    const promptText = `You are an AI support copilot for "${orgName}".
Knowledgebase & FAQs:
${knowledgeBase}

Recent Chat History:
${chatHistory}

Task: Suggest a concise, polite, helpful 1-2 sentence response to send to ${customerName} on WhatsApp. Respond with ONLY the message text, no quotes or metadata.`;

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
  const lastMsg = messages[messages.length - 1];
  const lastText = (lastMsg?.content as any)?.text || '';
  if (/price|cost|rate/i.test(lastText)) {
    return `Hello ${customerName}! Thanks for reaching out. Please check our catalog or let us know which product price you would like to know.`;
  }
  if (/order|track|status/i.test(lastText)) {
    return `Hi ${customerName}, your order is currently being processed by our team. We will share tracking details shortly!`;
  }
  return `Hi ${customerName}, thank you for contacting ${orgName}. How can we assist you today?`;
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
