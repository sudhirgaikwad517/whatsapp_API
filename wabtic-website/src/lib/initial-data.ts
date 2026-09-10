import { DemoRequest, ContactMessage, PricingPlan, ApiEndpoint, CreditPack, CreditConsumptionRule } from '@/types';

export const INITIAL_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    title: 'Starter Plan',
    monthlyPrice: '₹1,499',
    monthlyOriginalPrice: '₹1,899',
    annualPrice: '₹1,199',
    annualOriginalPrice: '₹1,499',
    subtitle: 'Essential automation & shared inbox tools for small support and sales teams starting out.',
    agentSeats: '2 Agents (AGENT role)',
    agentSeatsCount: 2,
    expansionCost: '₹499 / agent / month',
    expansionCostValue: 499,
    aiCredits: '500 AI Credits / mo',
    aiCreditsCount: 500,
    wabaAccounts: '1 Official WhatsApp Number',
    featuresHeader: 'Core Features Included',
    features: [
      'Live Shared Inbox with Real-Time Customer Chat',
      'Basic Keyword Auto-Responder Rules',
      '2 Active Visual Drag-and-Drop Chatbot Flows (ReactFlow)',
      'Product Catalog Management (Up to 20 Products)',
      'In-Chat Razorpay Payment Link Generator',
      'Dynamic CSV Broadcast Variable Mapper ({{1}}, {{2}}, {{3}})',
      'Sharp.js High-Performance Image Compression (WebP)'
    ],
    excludedFeatures: [
      'Gemini 1.5 Smart AI Assistant Copilot',
      'Round-Robin Multi-Agent Auto Assignment'
    ],
    active: true,
    highlight: false,
    cardColor: 'sky'
  },
  {
    id: 'pro',
    title: 'Pro Plan',
    monthlyPrice: '₹3,999',
    monthlyOriginalPrice: '₹4,999',
    annualPrice: '₹3,199',
    annualOriginalPrice: '₹3,999',
    subtitle: 'Autonomous AI copilot, unlimited chatbot flows & advanced SLA analytics to scale revenue.',
    agentSeats: '5 Agents (AGENT or ADMIN roles)',
    agentSeatsCount: 5,
    expansionCost: '₹399 / agent / month',
    expansionCostValue: 399,
    aiCredits: '2,500 AI Credits / mo',
    aiCreditsCount: 2500,
    wabaAccounts: '1 Official WhatsApp Number',
    featuresHeader: 'Everything in Starter, plus:',
    features: [
      'Gemini 1.5 AI Smart Copilot & Automated FAQ Assistant',
      'Autonomous E-Commerce Bot (Auto Product Lookup + Auto Razorpay Payment Link Dispatch)',
      'Multi-Agent Round-Robin Auto Assignment',
      'Agent SLA Performance Analytics & First Response Time (FRT) Leaderboard',
      'Unlimited Active Visual Chatbot Flows',
      'Unlimited Product Catalog Items',
      'Broadcast Campaign Analytics (Sent, Delivered, Read, Replied Attribution)',
      'Quick Reply Snippets (/ shortcut autocomplete)'
    ],
    active: true,
    highlight: true,
    badge: 'Most Popular',
    cardColor: 'emerald'
  },
  {
    id: 'enterprise',
    title: 'Enterprise Plan',
    monthlyPrice: '₹8,999',
    monthlyOriginalPrice: '₹11,249',
    annualPrice: '₹7,199',
    annualOriginalPrice: '₹8,999',
    subtitle: 'High-volume infrastructure with custom AI fine-tuning, webhook integrations & dedicated SLA.',
    agentSeats: '15 Agents included',
    agentSeatsCount: 15,
    expansionCost: '₹299 / agent / month',
    expansionCostValue: 299,
    aiCredits: '10,000 AI Credits / mo',
    aiCreditsCount: 10000,
    wabaAccounts: 'Up to 3 WhatsApp Numbers',
    featuresHeader: 'Everything in Pro, plus:',
    features: [
      'Dedicated Account Manager & Priority WhatsApp Support',
      'Custom AI Knowledgebase Fine-Tuning & Prompt Customization',
      'Webhook Workflows & Third-Party System Integration (Shopify/WooCommerce/Custom CRM)',
      'Advanced SLA Breach Escalation Alerts',
      '99.9% Uptime Service Level Agreement (SLA)'
    ],
    active: true,
    highlight: false,
    badge: 'Custom Scale',
    cardColor: 'purple'
  }
];

export const ADDON_CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack-1',
    price: '₹500',
    priceValue: 500,
    credits: '1,000 Credits',
    creditsCount: 1000,
    perCreditRate: '₹0.50 / credit'
  },
  {
    id: 'pack-2',
    price: '₹1,500',
    priceValue: 1500,
    credits: '3,500 Credits',
    creditsCount: 3500,
    perCreditRate: '₹0.42 / credit',
    highlight: true,
    badge: 'Best Value'
  },
  {
    id: 'pack-3',
    price: '₹3,500',
    priceValue: 3500,
    credits: '10,000 Credits',
    creditsCount: 10000,
    perCreditRate: '₹0.35 / credit'
  }
];

export const AI_CREDIT_CONSUMPTION_METRICS: CreditConsumptionRule[] = [
  {
    icon: 'Sparkles',
    title: 'AI Copilot Response',
    description: 'Generates real-time suggested response for agent in Live Shared Inbox',
    rate: '1 AI Credit'
  },
  {
    icon: 'Bot',
    title: 'AI Agent Action',
    description: 'Autonomous actions like product catalog lookup or payment link dispatch',
    rate: '1 AI Credit'
  },
  {
    icon: 'GitFork',
    title: 'AI Workflow Execution',
    description: 'Executes 1 complete automated interactive visual chatbot workflow run',
    rate: '1 AI Credit'
  },
  {
    icon: 'Sparkles',
    title: 'AI Content Generation',
    description: 'AI-powered response/action',
    rate: 'applicable AI Credit'
  }
];

export const WATI_FAQS = [
  {
    q: 'Is Wabtic an official WhatsApp API platform?',
    a: 'Yes. Wabtic is built around the official Meta WhatsApp Business Platform and is designed for policy-compliant business messaging, automation and customer communication.'
  },
  {
    q: 'How is Wabtic different from WATI?',
    a: 'Wabtic combines official WhatsApp Business Platform connectivity, Shared Inbox, visual workflows, automation, AI tools, analytics and integrations in one platform with a simple and transparent pricing structure. Wabtic is designed to give businesses separate AI and Messaging Credit systems with clear usage-based pricing and without unnecessary platform complexity.'
  },
  {
    q: 'Do I pay separately for WhatsApp messaging and AI?',
    a: 'Yes. Wabtic uses two completely separate credit systems. AI Credits are used for AI-powered features. Messaging Credits are used exclusively for eligible WhatsApp messaging. AI Credits cannot be used for messaging, and Messaging Credits cannot be used for AI features.'
  },
  {
    q: 'What are AI Credits and Messaging Credits?',
    a: 'AI Credits are usage units for Wabtic\'s AI-powered features (like Copilots and Workflows). Messaging Credits are separate usage units for eligible WhatsApp messaging, and usage depends on message category, recipient country, and Meta pricing.'
  },
  {
    q: 'Are there any hidden charges?',
    a: 'Wabtic clearly displays applicable subscription plans, credit requirements and additional usage charges. Customers can review the applicable plan, credit pricing and messaging requirements before making a purchase.'
  },
  {
    q: 'What happens if I run out of credits?',
    a: 'Your core platform and manual agent functionality continue according to your subscription plan. New chargeable WhatsApp messaging requires sufficient Messaging Credits, and AI features require AI Credits. You can purchase additional credits whenever required.'
  },
  {
    q: 'Do unused AI or Messaging Credits expire?',
    a: 'Unused credits may remain available for future eligible Wabtic services while the customer\'s account remains active and in good standing, subject to any validity rules displayed at the time of purchase. Unused credits are not refundable.'
  },
  {
    q: 'Can I connect my existing WhatsApp Business number?',
    a: 'Eligible WhatsApp Business numbers may be connected depending on Meta\'s requirements and the customer\'s current WhatsApp Business setup. Wabtic provides the applicable onboarding flow for connecting WhatsApp Business Platform services.'
  },
  {
    q: 'How quickly is my account activated after payment?',
    a: 'Subscription and applicable credit allocations are normally activated automatically after successful payment confirmation. WhatsApp Business Platform onboarding, verification or approval may require additional steps depending on the customer\'s Meta account and Meta\'s requirements.'
  }
];


export const INITIAL_DEMO_REQUESTS: DemoRequest[] = [
  {
    id: 'lead-101',
    name: 'Sarah Jenkins',
    company: 'Apex Retail Commerce',
    email: 'sarah.j@apexretail.io',
    phone: '+1 (555) 234-5678',
    industry: 'E-commerce',
    messageVolume: '50k-250k',
    requirements: 'Looking for WhatsApp Marketing, Bulk Message Sending, and AI Automation Reply Bots.',
    status: 'New',
    createdAt: '2026-08-04T14:30:00.000Z'
  }
];

export const INITIAL_CONTACT_MESSAGES: ContactMessage[] = [
  {
    id: 'msg-201',
    name: 'David Miller',
    email: 'david.m@techstart.io',
    phone: '+1 (555) 444-3322',
    message: 'Hello! I would like to know more about Wabtic AI automation reply bots and campaign scheduling.',
    resolved: false,
    createdAt: '2026-08-04T12:00:00.000Z'
  }
];

export const API_DOCS_DATA: ApiEndpoint[] = [
  {
    id: 'auth',
    category: 'Authentication',
    title: 'API Authentication',
    description: 'Authenticate your requests by including your bearer token in the HTTP Authorization header of every API call.',
    method: 'GET',
    endpoint: '/v1/auth/verify',
    headers: {
      'Authorization': 'Bearer wabtic_live_sk_9f8d7c6b5a4e3d2c1b0a',
      'Content-Type': 'application/json'
    },
    bodyParams: [],
    samplePayload: null,
    sampleResponses: [
      {
        status: 200,
        title: 'Authentication Successful',
        body: {
          status: 'success',
          account_id: 'acc_wabtic_8839201',
          business_name: 'Wabtic Automation',
          phone_number: '+1 (800) 555-0199',
          quality_rating: 'GREEN',
          messaging_tier: 'TIER_250K',
          verified: true
        }
      }
    ],
    codeSamples: {
      node: `const axios = require('axios');

async function verifyAuth() {
  const response = await axios.get('https://api.wabtic.com/v1/auth/verify', {
    headers: { 'Authorization': 'Bearer WABTIC_API_KEY' }
  });
  console.log(response.data);
}
verifyAuth();`,
      python: `import requests

res = requests.get("https://api.wabtic.com/v1/auth/verify", headers={"Authorization": "Bearer WABTIC_API_KEY"})
print(res.json())`,
      php: `<?php
$ch = curl_init('https://api.wabtic.com/v1/auth/verify');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer WABTIC_API_KEY']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
?>`,
      curl: `curl -X GET "https://api.wabtic.com/v1/auth/verify" -H "Authorization: Bearer WABTIC_API_KEY"`
    }
  },
  {
    id: 'send-message',
    category: 'Messages',
    title: 'Send Text Message',
    description: 'Dispatch a WhatsApp bulk marketing or campaign message.',
    method: 'POST',
    endpoint: '/v1/messages/text',
    headers: {
      'Authorization': 'Bearer wabtic_live_sk_9f8d7c6b5a4e3d2c1b0a',
      'Content-Type': 'application/json'
    },
    bodyParams: [
      { name: 'to', type: 'string', required: true, description: 'Recipient phone number in E.164 format' },
      { name: 'text', type: 'string', required: true, description: 'Message body text' }
    ],
    samplePayload: {
      to: '+14155552671',
      text: 'Hi Alex! Sent via Wabtic Automation.'
    },
    sampleResponses: [
      {
        status: 200,
        title: 'Message Queued',
        body: { success: true, message_id: 'wamid.HBgLMTQxNTU1NTI2NzEVAg==' }
      }
    ],
    codeSamples: {
      node: `const axios = require('axios');
axios.post('https://api.wabtic.com/v1/messages/text', { to: '+14155552671', text: 'Hello from Wabtic!' }, { headers: { 'Authorization': 'Bearer WABTIC_KEY' } });`,
      python: `import requests
requests.post('https://api.wabtic.com/v1/messages/text', json={'to': '+14155552671', 'text': 'Hello from Wabtic!'}, headers={'Authorization': 'Bearer WABTIC_KEY'})`,
      php: `<?php echo "curl request to wabtic"; ?>`,
      curl: `curl -X POST "https://api.wabtic.com/v1/messages/text" -H "Authorization: Bearer WABTIC_KEY" -d '{"to":"+14155552671","text":"Hello"}'`
    }
  },
  {
    id: 'pg-webhook',
    category: 'Payment Gateway Integration',
    title: 'Razorpay / Cashfree Webhook Handler',
    description: 'Receive real-time payment events from PCI-DSS v4.0.1 compliant gateways to trigger instant digital SaaS fulfillment and account credit allocations.',
    method: 'POST',
    endpoint: '/v1/payments/webhook',
    headers: {
      'X-Razorpay-Signature': '25a7a9...hmac_sha256_hash...',
      'Content-Type': 'application/json'
    },
    bodyParams: [
      { name: 'event', type: 'string', required: true, description: 'Event type (e.g. payment.captured, subscription.charged)' },
      { name: 'payload', type: 'object', required: true, description: 'Gateway payload containing payment_id, order_id, amount_in_paisa' }
    ],
    samplePayload: {
      event: 'payment.captured',
      payload: {
        payment: {
          id: 'pay_P9a8b7c6d5',
          order_id: 'order_Wabtic_9981',
          amount: 471880,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          vpa: 'user@okhdfcbank'
        }
      }
    },
    sampleResponses: [
      {
        status: 200,
        title: 'Instant Service Provisioned',
        body: {
          success: true,
          fulfillment_status: 'COMPLETED',
          activation_latency: '1.2s',
          tax_invoice_number: 'INV-2026-08-9981',
          account_credits_allocated: '10,000 AI Credits'
        }
      }
    ],
    codeSamples: {
      node: `const crypto = require('crypto');
function verifyWebhook(body, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}`,
      python: `import hmac, hashlib
def verify_sig(body, sig, secret):
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return expected == sig`,
      php: `<?php $expected = hash_hmac('sha256', $body, $secret); ?>`,
      curl: `curl -X POST "https://api.wabtic.com/v1/payments/webhook" -H "Content-Type: application/json" -d '{"event":"payment.captured"}'`
    }
  },
  {
    id: 'merchant-compliance',
    category: 'RBI & Merchant Compliance',
    title: 'Merchant Registration & Verification Info',
    description: 'Fetch official merchant identity, RBI data localization status, MCC classification, and statutory grievance details for payment gateway audits.',
    method: 'GET',
    endpoint: '/v1/compliance/merchant',
    headers: {
      'Authorization': 'Bearer wabtic_live_sk_9f8d7c6b5a4e3d2c1b0a'
    },
    bodyParams: [],
    samplePayload: null,
    sampleResponses: [
      {
        status: 200,
        title: 'Merchant Verification Data',
        body: {
          legal_entity: 'PROWEXA TECHNOLOGIES PRIVATE LIMITED',
          cin: 'U62090PN2025PTC249889',
          brand_name: 'Wabtic',
          mcc_codes: ['5734', '7372'],
          rbi_compliance: 'DATA_LOCALIZATION_COMPLIANT',
          data_localization: 'GCP_MUMBAI_ASIA_SOUTH1',
          cancellation_policy: 'CREDITS_NON_REFUNDABLE_BUSINESS_USE_ONLY',
          grievance_officer: 'Mr. Rahul Sharma (grievance@prowexa.com)'
        }
      }
    ],
    codeSamples: {
      node: `const res = await axios.get('https://api.wabtic.com/v1/compliance/merchant');`,
      python: `res = requests.get('https://api.wabtic.com/v1/compliance/merchant')`,
      php: `<?php echo "Merchant Compliance Query"; ?>`,
      curl: `curl -X GET "https://api.wabtic.com/v1/compliance/merchant"`
    }
  }
];

