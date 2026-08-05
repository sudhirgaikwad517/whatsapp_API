import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/database.js';

let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey.trim()) {
  try {
    aiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

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
  const effectiveApiKey = (org as any)?.geminiApiKey || process.env.GEMINI_API_KEY;

  const chatHistory = messages
    .map((m) => `${m.direction === 'INBOUND' ? customerName : 'Agent'}: ${typeof m.content === 'object' ? (m.content as any)?.text || JSON.stringify(m.content) : m.content}`)
    .join('\n');

  let activeClient = aiClient;
  if (effectiveApiKey && effectiveApiKey.trim()) {
    try {
      activeClient = new GoogleGenAI({ apiKey: effectiveApiKey.trim() });
    } catch (e) {
      // fallback
    }
  }

  if (activeClient) {
    try {
      const response = await activeClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          `You are an AI support copilot for "${orgName}".
Knowledgebase & FAQs:
${knowledgeBase}

Recent Chat History:
${chatHistory}

Task: Suggest a concise, polite, helpful 1-2 sentence response to send to ${customerName} on WhatsApp. Respond with ONLY the message text, no quotes or metadata.`,
        ],
      });

      if (response.text && response.text.trim()) {
        try {
          const { deductAiCredit } = await import('./credits.service.js');
          await deductAiCredit(organizationId, 'AI_COPILOT');
        } catch (err) {
          console.error('Credit deduction failed:', err);
        }
        return response.text.trim();
      }
    } catch (err) {
      console.error('Gemini API call failed in suggestReply:', err);
    }
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
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          `Create a high-converting Meta WhatsApp marketing broadcast template body text based on this prompt: "${promptText}".
Include placeholders like {{1}} for customer name and {{2}} for offer details.
Return ONLY the template text body.`,
        ],
      });

      if (response.text && response.text.trim()) {
        return response.text.trim();
      }
    } catch (err) {
      console.error('Gemini API call failed in generateTemplateText:', err);
    }
  }

  return `Hello {{1}}, exciting news from our team! Special offer just for you: {{2}}. Reply YES to claim now!`;
}
