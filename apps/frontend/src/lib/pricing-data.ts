// Mirrors wabtic-website/src/lib/initial-data.ts's INITIAL_PRICING_PLANS /
// ADDON_CREDIT_PACKS / AI_CREDIT_CONSUMPTION_METRICS — kept in sync manually
// since the two apps don't share a package for this static marketing content.

export interface PricingPlan {
  id: string;
  title: string;
  monthlyPrice: string;
  monthlyOriginalPrice?: string;
  annualPrice: string;
  annualOriginalPrice?: string;
  subtitle: string;
  agentSeats: string;
  agentSeatsCount: number;
  expansionCost: string;
  expansionCostValue: number;
  aiCredits: string;
  aiCreditsCount: number;
  wabaAccounts: string;
  featuresHeader?: string;
  features: string[];
  excludedFeatures?: string[];
  active: boolean;
  highlight: boolean;
  badge?: string;
  cardColor: string;
}

export interface CreditPack {
  id: string;
  price: string;
  priceValue: number;
  credits: string;
  creditsCount: number;
  perCreditRate: string;
  highlight?: boolean;
  badge?: string;
}

export interface CreditConsumptionRule {
  icon: string;
  title: string;
  description: string;
  rate: string;
}

export const PRICING_PLANS: PricingPlan[] = [
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
      'Sharp.js High-Performance Image Compression (WebP)',
    ],
    excludedFeatures: ['Gemini 1.5 Smart AI Assistant Copilot', 'Round-Robin Multi-Agent Auto Assignment'],
    active: true,
    highlight: false,
    cardColor: 'sky',
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
      'Quick Reply Snippets (/ shortcut autocomplete)',
    ],
    active: true,
    highlight: true,
    badge: 'Most Popular',
    cardColor: 'emerald',
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
      '99.9% Uptime Service Level Agreement (SLA)',
    ],
    active: true,
    highlight: false,
    badge: 'Custom Scale',
    cardColor: 'purple',
  },
];

export const ADDON_CREDIT_PACKS: CreditPack[] = [
  { id: 'pack-1', price: '₹500', priceValue: 500, credits: '1,000 Credits', creditsCount: 1000, perCreditRate: '₹0.50 / credit' },
  {
    id: 'pack-2',
    price: '₹1,500',
    priceValue: 1500,
    credits: '3,500 Credits',
    creditsCount: 3500,
    perCreditRate: '₹0.42 / credit',
    highlight: true,
    badge: 'Best Value',
  },
  { id: 'pack-3', price: '₹3,500', priceValue: 3500, credits: '10,000 Credits', creditsCount: 10000, perCreditRate: '₹0.35 / credit' },
];

export const AI_CREDIT_CONSUMPTION_METRICS: CreditConsumptionRule[] = [
  {
    icon: 'Sparkles',
    title: 'AI Copilot Response',
    description: 'Generates real-time suggested response for agent in Live Shared Inbox',
    rate: '1 AI Credit',
  },
  {
    icon: 'Bot',
    title: 'AI Agent Action',
    description: 'Autonomous actions like product catalog lookup or payment link dispatch',
    rate: '1 AI Credit',
  },
  {
    icon: 'GitFork',
    title: 'AI Workflow Execution',
    description: 'Executes 1 complete automated interactive visual chatbot workflow run',
    rate: '1 AI Credit',
  },
  {
    icon: 'Sparkles',
    title: 'AI Content Generation',
    description: 'AI-powered response/action',
    rate: 'applicable AI Credit',
  },
];
