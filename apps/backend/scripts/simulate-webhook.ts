import crypto from 'crypto';
import { env } from '../src/config/env.js';

const PORT = env.PORT || 5050;
const WEBHOOK_URL = `http://localhost:${PORT}/api/v1/webhooks/whatsapp`;
const APP_SECRET = env.META_APP_SECRET || 'your_meta_app_secret_here';

function sendSimulatedWebhook(payload: object) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex');

  return fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': `sha256=${signature}`,
    },
    body: rawBody,
  });
}

async function runSimulation() {
  console.log('🚀 Starting Meta WhatsApp Cloud API Webhook Event Simulation...');

  // 1. Simulate Inbound Text Message from Customer
  const textPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba_109823471293847',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+15556677453',
                phone_number_id: '1181142285092556',
              },
              contacts: [
                {
                  profile: { name: 'Sudhir Gaikwad' },
                  wa_id: '917666130611',
                },
              ],
              messages: [
                {
                  from: '917666130611',
                  id: `wamid.simulated_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: 'Hello Prowexa! This is a test message from +917666130611.' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  try {
    const res = await sendSimulatedWebhook(textPayload);
    const text = await res.text();
    console.log(`✅ Text Message Webhook sent — HTTP ${res.status}: ${text}`);
  } catch (err: any) {
    console.error('❌ Failed to send webhook simulation:', err.message);
  }
}

runSimulation();
