import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { mediaQueue, autoResponderQueue } from '../queues/index.js';
import { emitToOrganization } from '../socket/inbox.gateway.js';
import type { MetaWebhookEntry } from '@prowexa/shared-types';

const DEDUP_TTL_SECONDS = 86400; // 24 hours

/**
 * BullMQ Worker: Processes all incoming Meta webhook events.
 * Runs as a SEPARATE process from the HTTP server to avoid resource contention.
 * Handles: inbound messages, delivery status updates, template status updates.
 */
export const webhookWorker = new Worker(
  'webhook-processing',
  async (job: Job) => {
    const entry = job.data as MetaWebhookEntry;
    logger.debug({ jobId: job.id }, 'Processing webhook entry');

    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const { value } = change;
      const phoneNumberId = value.metadata.phone_number_id;

      // Resolve the WhatsApp account for this phone number. Deliberately no
      // fallback to "any connected account" — guessing a tenant here would
      // attribute a message (and any auto-reply/billing it triggers) to the
      // wrong organization.
      const waAccount = await prisma.whatsappAccount.findUnique({
        where: { phoneNumberId },
      });

      if (!waAccount) {
        logger.warn({ phoneNumberId }, 'Received webhook for unknown phoneNumberId — skipping.');
        continue;
      }

      // ── Process Inbound Messages ───────────────────────────────────────────
      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          // Deduplication check using Redis atomic SETNX
          const dedupKey = `dedup:wamid:${msg.id}`;
          const isNew = await redis.set(dedupKey, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
          if (!isNew) {
            logger.debug({ wamid: msg.id }, 'Duplicate webhook event — skipping.');
            continue;
          }

          const digitsOnly = msg.from.replace(/\D/g, '');
          const tenDigits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
          const formattedPhone = `+${digitsOnly}`;
          const senderName = value.contacts?.find((c: { wa_id: string; profile: { name: string } }) => c.wa_id === msg.from)?.profile?.name;

          // Robust contact matching (find existing contact regardless of spaces or country code prefix)
          let contact = await prisma.contact.findFirst({
            where: {
              organizationId: waAccount.organizationId,
              OR: [
                { phoneNumber: { contains: tenDigits } },
                { phoneNumber: formattedPhone },
                { phoneNumber: digitsOnly },
              ],
            },
          });

          if (!contact) {
            contact = await prisma.contact.create({
              data: {
                organizationId: waAccount.organizationId,
                phoneNumber: formattedPhone,
                firstName: senderName,
              },
            });
          } else if (senderName && !contact.firstName) {
            contact = await prisma.contact.update({
              where: { id: contact.id },
              data: { firstName: senderName },
            });
          }

          // Upsert conversation (24-hour window)
          const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          // Check existing conversation & assign via Round-Robin if unassigned
          const existingConv = await prisma.conversation.findUnique({
            where: {
              whatsappAccountId_contactId: {
                whatsappAccountId: waAccount.id,
                contactId: contact.id,
              },
            },
          });

          const orgInfo = await prisma.organization.findUnique({
            where: { id: waAccount.organizationId },
            select: { aiKnowledgeBase: true, isAiAutoRespondEnabled: true },
          });

          const isAiEnabled = orgInfo?.isAiAutoRespondEnabled !== false && (orgInfo?.isAiAutoRespondEnabled === true || Boolean(orgInfo?.aiKnowledgeBase && orgInfo.aiKnowledgeBase.trim().length > 0));

          let assignedAgentId = existingConv?.assignedAgentId || null;

          if (isAiEnabled) {
            // When AI Auto-Responder is ON:
            // Unless chat is actively ESCALATED for human intervention, clear assignedAgentId to null so AI handles the message 24/7!
            if (!existingConv || existingConv.status !== 'ESCALATED') {
              assignedAgentId = null;
            }
          } else {
            // Only auto-assign agent on new incoming conversation if AI Auto-Responder is OFF
            if (!existingConv || !assignedAgentId) {
              const members = await prisma.organizationMember.findMany({
                where: {
                  organizationId: waAccount.organizationId,
                  role: { in: ['BUSINESS_OWNER', 'MANAGER', 'AGENT'] },
                },
                select: { userId: true },
              });
              if (members.length > 0) {
                const memberIds = members.map((m) => m.userId);
                const groupedCounts = await prisma.conversation.groupBy({
                  by: ['assignedAgentId'],
                  where: {
                    organizationId: waAccount.organizationId,
                    assignedAgentId: { in: memberIds },
                    status: 'OPEN',
                  },
                  _count: { id: true },
                });

                const countMap = new Map(memberIds.map((id) => [id, 0]));
                groupedCounts.forEach((g) => {
                  if (g.assignedAgentId) {
                    countMap.set(g.assignedAgentId, g._count.id);
                  }
                });

                const openCounts = Array.from(countMap.entries()).map(([id, count]) => ({ id, count }));
                openCounts.sort((a, b) => a.count - b.count);
                assignedAgentId = openCounts[0]?.id || null;
              }
            }
          }

          const conversation = await prisma.conversation.upsert({
            where: {
              whatsappAccountId_contactId: {
                whatsappAccountId: waAccount.id,
                contactId: contact.id,
              },
            },
            update: {
              windowExpiresAt,
              status: existingConv?.status === 'ESCALATED' ? 'ESCALATED' : 'OPEN',
              ...(isAiEnabled && existingConv?.status !== 'ESCALATED' ? { assignedAgentId: null } : {}),
              ...(!isAiEnabled && assignedAgentId && !existingConv?.assignedAgentId ? { assignedAgentId } : {}),
            },
            create: {
              organizationId: waAccount.organizationId,
              whatsappAccountId: waAccount.id,
              contactId: contact.id,
              assignedAgentId,
              unreadCount: 0,
              windowExpiresAt,
            },
          });

          // Extract text for all inbound message types (text, button quick reply, interactive list/button)
          const rawMsg = msg as any;
          let extractedText: string | null = null;
          if (msg.type === 'text' && msg.text) {
            extractedText = msg.text.body;
          } else if (msg.type === 'button' && rawMsg.button) {
            extractedText = rawMsg.button.text || rawMsg.button.payload;
          } else if (msg.type === 'interactive' && rawMsg.interactive) {
            if (rawMsg.interactive.type === 'button_reply') {
              extractedText = rawMsg.interactive.button_reply?.title || rawMsg.interactive.button_reply?.id;
            } else if (rawMsg.interactive.type === 'list_reply') {
              extractedText = rawMsg.interactive.list_reply?.title || rawMsg.interactive.list_reply?.id;
            }
          }

          // Build content payload
          const content: Record<string, any> = {};
          if (extractedText) content.text = extractedText;
          if (msg.type === 'image' && msg.image) content.mediaId = msg.image.id;
          if (msg.type === 'audio' && msg.audio) content.mediaId = msg.audio.id;
          if (msg.type === 'video' && msg.video) content.mediaId = msg.video.id;
          if (msg.type === 'document' && msg.document) {
            content.mediaId = msg.document.id;
            content.filename = msg.document.filename;
          }
          if (msg.type === 'location' && msg.location) content.location = msg.location;

          // Save message to database
          const msgTypeStr = ['text', 'button', 'interactive'].includes(msg.type) ? 'TEXT' : msg.type.toUpperCase();

          const savedMessage = await prisma.message.create({
            data: {
              organizationId: waAccount.organizationId,
              conversationId: conversation.id,
              wamid: msg.id,
              direction: 'INBOUND',
              type: msgTypeStr as any,
              content,
              status: 'DELIVERED',
            },
          });

          // Update conversation snippet and increment unread message counter
          const lastSnippet = extractedText ? extractedText.slice(0, 100) : `[${msg.type}]`;
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageSnippet: lastSnippet,
              lastMessageAt: new Date(),
              unreadCount: { increment: 1 },
            },
          });

          // Queue media download if needed
          if (['image', 'audio', 'video', 'document'].includes(msg.type) && content.mediaId) {
            await mediaQueue.add('download-media', {
              messageId: savedMessage.id,
              mediaId: content.mediaId,
              accessToken: waAccount.encryptedAccessToken,
              organizationId: waAccount.organizationId,
            });
          }

          logger.info(
            { wamid: msg.id, conversationId: conversation.id, type: msg.type, extractedText },
            'Inbound message processed and saved.'
          );

          // Realtime Broadcast new message to live agents via Socket.IO
          emitToOrganization(waAccount.organizationId, 'new_message', {
            conversationId: conversation.id,
            message: savedMessage,
          });

          // ── Automated Multi-Tenant Keyword Auto-Responder & Flow Engine ────────────────────────
          if (extractedText) {
            const textBody = extractedText.trim();
            const cleanTextLower = textBody.toLowerCase();

            // 0. Autonomous Commerce Engine (Auto-Product & Auto-Payment Bot)
            const matchedProduct = await prisma.productCatalog.findFirst({
              where: {
                organizationId: waAccount.organizationId,
                isActive: true,
                OR: [
                  { title: { contains: cleanTextLower, mode: 'insensitive' } },
                  { description: { contains: cleanTextLower, mode: 'insensitive' } },
                  { sku: { equals: cleanTextLower, mode: 'insensitive' } },
                ],
              },
            });

            if (matchedProduct && cleanTextLower.length >= 3 && !/^(hi|hello|hey|start)$/i.test(cleanTextLower)) {
              await autoResponderQueue.add(
                'commerce-link',
                {
                  type: 'commerce',
                  organizationId: waAccount.organizationId,
                  conversationId: conversation.id,
                  priceInINR: Number(matchedProduct.priceInINR),
                  title: matchedProduct.title,
                },
                { delay: 1000 }
              );
            } else {
              // 1. Check Visual Chatbot Flow Engine
              const { evaluateInboundFlow } = await import('../services/flow.service.js');
              const matchedFlow = await evaluateInboundFlow(waAccount.organizationId, textBody);

            if (matchedFlow) {
              const nodes = (matchedFlow.definition as any)?.nodes || [];
              const replyNode = nodes.find((n: any) => n.id !== '1' && n.data?.label);
              let flowReplyText = replyNode ? (replyNode.data.label as string) : null;
              if (flowReplyText) {
                // Clean node type prefix e.g. "💬 Send Message: "
                flowReplyText = flowReplyText.replace(/^(💬 Send Message:|🔘 Interactive Buttons:|🔀 Condition:|👤 Assign Agent:)\s*/i, '').trim();
                await autoResponderQueue.add(
                  'flow-reply',
                  {
                    type: 'flow',
                    organizationId: waAccount.organizationId,
                    conversationId: conversation.id,
                    text: flowReplyText,
                  },
                  { delay: 1000 }
                );
              }
            } else {
              // 2. Autonomous AI Auto-Responder Engine OR Keyword Auto-Responder
              const org = await prisma.organization.findUnique({
                where: { id: waAccount.organizationId },
                select: { name: true, isAiAutoRespondEnabled: true },
              });

              if (org?.isAiAutoRespondEnabled) {
                // Autonomous AI Auto-Responder Engine (Uses Organization Knowledgebase + FAQ + Catalog)
                await autoResponderQueue.add(
                  'ai-reply',
                  {
                    type: 'ai',
                    organizationId: waAccount.organizationId,
                    conversationId: conversation.id,
                  },
                  { delay: 1000 }
                );
              } else {
                // Keyword Auto-Responder Engine (Fallback when AI Auto-Responder is OFF)
                const { findMatchingAutoReply } = await import('../services/auto-responder.service.js');
                let autoReplyText = await findMatchingAutoReply(waAccount.organizationId, textBody);

                if (!autoReplyText && /^(hi|hello|hey|start|hi+)$/i.test(textBody)) {
                  const orgName = org?.name || 'our business';
                  autoReplyText = `👋 Hello ${contact.firstName || 'there'}! Welcome to *${orgName}*.\n\nThank you for reaching out! Our support team has received your message and will assist you shortly.`;
                }

                if (autoReplyText) {
                  // Dispatched as a durable, delayed BullMQ job (not a detached
                  // setTimeout) so a process restart within the delay window
                  // doesn't silently drop the reply.
                  await autoResponderQueue.add(
                    'keyword-reply',
                    {
                      type: 'flow',
                      organizationId: waAccount.organizationId,
                      conversationId: conversation.id,
                      text: autoReplyText,
                    },
                    { delay: 1000 }
                  );
                }
              }
            }
          }
        }
          // Track Campaign Reply Attribution
          try {
            const recentRecipient = await prisma.campaignRecipient.findFirst({
              where: {
                contactId: contact.id,
                status: { in: ['SENT', 'DELIVERED', 'READ'] },
                updatedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
              },
              orderBy: { updatedAt: 'desc' },
            });

            if (recentRecipient) {
              await prisma.campaignRecipient.update({
                where: { id: recentRecipient.id },
                data: {
                  status: 'REPLIED' as any,
                  repliedAt: new Date(),
                },
              });

              await prisma.campaign.update({
                where: { id: recentRecipient.campaignId },
                data: { repliedCount: { increment: 1 } },
              });

              await prisma.contactTimeline.create({
                data: {
                  organizationId: waAccount.organizationId,
                  contactId: contact.id,
                  type: 'CAMPAIGN_REPLIED',
                  title: 'Replied to Campaign Broadcast',
                  description: `Customer replied: "${extractedText ? extractedText.slice(0, 100) : 'Media reply'}"`,
                  metadata: { campaignId: recentRecipient.campaignId, text: extractedText },
                },
              });
            } else {
              await prisma.contactTimeline.create({
                data: {
                  organizationId: waAccount.organizationId,
                  contactId: contact.id,
                  type: 'INBOUND_MESSAGE',
                  title: 'Received Inbound Message',
                  description: extractedText ? extractedText.slice(0, 100) : 'Incoming media message',
                  metadata: { messageType: msg.type },
                },
              });
            }
          } catch (timelineErr) {
            logger.warn({ timelineErr }, 'Failed to record inbound timeline event');
          }
        }
      }

      // ── Process Delivery Status Updates ───────────────────────────────────
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          logger.info({ statusId: status.id, status: status.status, recipient: status.recipient_id }, 'Processing Meta Status Update Webhook');

          const dedupKey = `dedup:status:${status.id}:${status.status}`;
          const isNew = await redis.set(dedupKey, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
          if (!isNew) continue;

          const statusMap: Record<string, string> = {
            sent: 'SENT',
            delivered: 'DELIVERED',
            read: 'READ',
            failed: 'FAILED',
          };

          const updateData: Record<string, any> = {
            status: statusMap[status.status] ?? 'SENT',
          };

          if (status.status === 'sent') updateData.sentAt = new Date();
          if (status.status === 'delivered') updateData.deliveredAt = new Date();
          if (status.status === 'read') updateData.readAt = new Date();
          if (status.status === 'failed' && status.errors?.[0]) {
            updateData.errorCode = String(status.errors[0].code);
            updateData.errorMessage = status.errors[0].title;
          }

          await prisma.message.updateMany({
            where: { wamid: status.id },
            data: updateData,
          });

          // Also update campaign recipient and campaign counters if applicable
          let recipient = await prisma.campaignRecipient.findFirst({
            where: { wamid: status.id },
            select: { id: true, campaignId: true, contactId: true, status: true },
          });

          // Fallback: If not found by WAMID (race condition), match by recipient phone number & WABA
          if (!recipient && status.recipient_id) {
            const rawPhone = String(status.recipient_id);
            const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

            const matchedContact = await prisma.contact.findFirst({
              where: {
                organizationId: waAccount.organizationId,
                phoneNumber: { in: [formattedPhone, rawPhone] },
              },
            });

            if (matchedContact) {
              recipient = await prisma.campaignRecipient.findFirst({
                where: {
                  contactId: matchedContact.id,
                  campaign: { organizationId: waAccount.organizationId },
                },
                orderBy: { updatedAt: 'desc' },
                select: { id: true, campaignId: true, contactId: true, status: true },
              });

              if (recipient) {
                // Link WAMID to recipient for future status updates
                await prisma.campaignRecipient.update({
                  where: { id: recipient.id },
                  data: { wamid: status.id },
                });
              }
            }
          }

          if (recipient) {
            const recipientUpdateData: Record<string, any> = {};

            // Do NOT downgrade/overwrite REPLIED status with late READ or DELIVERED status webhooks
            if (String(recipient.status) !== 'REPLIED') {
              recipientUpdateData.status = statusMap[status.status] as any;
            }

            if (status.status === 'sent') recipientUpdateData.sentAt = new Date();
            if (status.status === 'delivered') recipientUpdateData.deliveredAt = new Date();
            if (status.status === 'read') recipientUpdateData.readAt = new Date();
            if (status.status === 'failed' && status.errors?.[0]) {
              recipientUpdateData.status = 'FAILED';
              recipientUpdateData.errorCode = String(status.errors[0].code);
              recipientUpdateData.errorMessage = status.errors[0].title || 'Meta API Error';
            }

            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: recipientUpdateData,
            });

            const prevStatus = String(recipient.status);

            if (status.status === 'delivered' && prevStatus !== 'DELIVERED' && prevStatus !== 'READ' && prevStatus !== 'REPLIED') {
              await prisma.campaign.update({
                where: { id: recipient.campaignId },
                data: { deliveredCount: { increment: 1 } },
              });
              await prisma.contactTimeline.create({
                data: {
                  organizationId: waAccount.organizationId,
                  contactId: recipient.contactId,
                  type: 'CAMPAIGN_DELIVERED',
                  title: 'Campaign Message Delivered',
                  description: `Broadcast message delivered to customer device. WAMID: ${status.id}`,
                  metadata: { campaignId: recipient.campaignId, wamid: status.id },
                },
              });
            } else if (status.status === 'read' && prevStatus !== 'READ' && prevStatus !== 'REPLIED') {
              const campUpdate: any = { readCount: { increment: 1 } };
              if (prevStatus !== 'DELIVERED') {
                campUpdate.deliveredCount = { increment: 1 };
              }
              await prisma.campaign.update({
                where: { id: recipient.campaignId },
                data: campUpdate,
              });
              await prisma.contactTimeline.create({
                data: {
                  organizationId: waAccount.organizationId,
                  contactId: recipient.contactId,
                  type: 'CAMPAIGN_READ',
                  title: 'Campaign Message Read',
                  description: `Customer opened and read the broadcast message. WAMID: ${status.id}`,
                  metadata: { campaignId: recipient.campaignId, wamid: status.id },
                },
              });
            } else if (status.status === 'failed' && prevStatus !== 'FAILED') {
              await prisma.campaign.update({
                where: { id: recipient.campaignId },
                data: { failedCount: { increment: 1 } },
              });
              await prisma.contactTimeline.create({
                data: {
                  organizationId: waAccount.organizationId,
                  contactId: recipient.contactId,
                  type: 'CAMPAIGN_FAILED',
                  title: 'Campaign Message Delivery Failed',
                  description: status.errors?.[0]?.title || 'Meta API delivery failure',
                  metadata: { campaignId: recipient.campaignId, errorCode: status.errors?.[0]?.code },
                },
              });
            }
          }

          // Broadcast status change to live agents
          emitToOrganization(waAccount.organizationId, 'message_status_update', {
            wamid: status.id,
            status: statusMap[status.status],
          });

          logger.debug({ wamid: status.id, status: status.status }, 'Message status updated.');
        }
      }
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 50,
    limiter: {
      max: 200,
      duration: 1000, // Max 200 webhook jobs per second
    },
  }
);

webhookWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Webhook job completed.');
});

webhookWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Webhook job FAILED.');
});
