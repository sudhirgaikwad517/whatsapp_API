import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { logger } from './utils/logger.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import paymentWebhooksRoutes from './routes/payment-webhooks.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import contactRoutes from './routes/contact.routes.js';
import inboxRoutes from './routes/inbox.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import billingRoutes from './routes/billing.routes.js';
import path from 'path';
import autoResponderRoutes from './routes/auto-responder.routes.js';
import cannedResponseRoutes from './routes/canned-response.routes.js';
import aiRoutes from './routes/ai.routes.js';
import mediaRoutes from './routes/media.routes.js';
import flowRoutes from './routes/flow.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import supportTicketRoutes from './routes/support-ticket.routes.js';
import superAdminRoutes from './routes/superadmin.routes.js';

export function createApp(): Application {
  const app = express();

  // Trust exactly one hop (the host nginx reverse proxy) so req.ip and
  // express-rate-limit read the real client IP from X-Forwarded-For instead
  // of nginx's own address — `true` would trust the header at any depth,
  // letting a client spoof its own IP by setting the header itself.
  app.set('trust proxy', 1);

  // ── Security Headers & Production CORS ─────────────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const ALLOWED_HOSTNAMES = new Set([
    'wabtic.com',
    'app.wabtic.com',
    'api.wabtic.com',
    'localhost',
    '127.0.0.1',
    ...env.ALLOWED_ORIGINS.split(',').map((h) => h.trim()).filter(Boolean),
    ...(() => {
      try {
        return [new URL(env.FRONTEND_URL).hostname];
      } catch {
        return [];
      }
    })(),
  ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like webhooks, curl, postman, mobile apps)
        if (!origin) return callback(null, true);
        try {
          const hostname = new URL(origin).hostname;
          // Exact hostname match only — a substring check here would also match
          // an attacker-controlled domain like "wabtic.com.evil.com".
          if (ALLOWED_HOSTNAMES.has(hostname)) {
            return callback(null, true);
          }
        } catch {
          // Malformed Origin header — fall through to reject.
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'development' ? 50000 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts, please try again in 15 minutes.' } },
  });

  app.use('/api/', apiLimiter);

  // ── Body Parsers ──────────────────────────────────────────────────────────
  // CRITICAL: Capture raw body buffer for Meta POST webhook HMAC signature validation
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/v1/webhooks') && req.method === 'POST') {
      express.raw({ type: '*/*' })(req, res, (err) => {
        if (err) return next(err);
        (req as any).rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
        try {
          const bodyStr = (req as any).rawBody.toString('utf8');
          req.body = bodyStr ? JSON.parse(bodyStr) : {};
        } catch {
          req.body = typeof req.body === 'object' ? req.body : {};
        }
        next();
      });
    } else {
      express.json({ limit: '5mb' })(req, res, next);
    }
  });
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Request ID Injection ──────────────────────────────────────────────────
  app.use((req, _res, next) => {
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = crypto.randomUUID();
    }
    next();
  });

  // ── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'prowexa-whatsapp-api', timestamp: new Date().toISOString() });
  });

  // ── Static Public Uploads Route ───────────────────────────────────────────
  // Deliberately public (not behind `authenticate`): WhatsApp campaign/template
  // header images and catalog product images stored here must be fetchable by
  // Meta's servers directly, which carry no tenant JWT. Access control instead
  // relies on filenames being unguessable crypto.randomUUID() values (see
  // media-compression.service.ts) — there is no directory listing, and no
  // customer-uploaded or otherwise sensitive content is stored in this
  // directory today. `dotfiles`/`index` are locked down as defense in depth.
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), { dotfiles: 'deny', index: false })
  );

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/api/v1/webhooks/payments', paymentWebhooksRoutes);
  app.use('/api/v1/organization', organizationRoutes);
  app.use('/api/v1/whatsapp', whatsappRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/inbox', inboxRoutes);
  app.use('/api/v1/campaigns', campaignRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/auto-responder', autoResponderRoutes);
  app.use('/api/v1/canned-responses', cannedResponseRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/media', mediaRoutes);
  app.use('/api/v1/flows', flowRoutes);
  app.use('/api/v1/catalog', catalogRoutes);
  app.use('/api/v1/support-tickets', supportTicketRoutes);
  app.use('/api/v1/superadmin', superAdminRoutes);


  // ── 404 Handler ───────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested API endpoint does not exist.' } });
  });

  // ── Global Error Handler ──────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
