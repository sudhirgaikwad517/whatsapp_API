# Security Notes — Manual Steps Required Before Deploying Phase 1

These are operational steps only you can safely run against the live database/environment. Nothing in this file has been executed automatically.

## 0. CORRECTION — JWT_SECRET and REFRESH_TOKEN_SECRET are ALSO the example placeholders (CRITICAL, worse than the encryption key)

An earlier check in this session only compared secret *lengths* against the placeholder and wrongly concluded `JWT_SECRET`/`REFRESH_TOKEN_SECRET` were already safe. Re-verified directly: **all three** (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ENCRYPTION_KEY`) in your live `.env` are the literal example values from `.env.example` — they were never customized.

This is more severe than the encryption-key issue: anyone who has seen `.env.example` (i.e. anyone who has seen this public-pattern repo) can forge a validly-signed JWT for **any** `userId`/`organizationId`/`role`, including `SUPER_ADMIN` — a complete authentication bypass, independent of every other fix in this pass. Treat this as the top-priority action item, above even the encryption key rotation.

```bash
openssl rand -hex 32   # run twice — JWT_SECRET and REFRESH_TOKEN_SECRET must each get a DIFFERENT random value
```

Set the two new values as `JWT_SECRET` and `REFRESH_TOKEN_SECRET` in your deployment environment. No data migration is needed for these two (unlike `ENCRYPTION_KEY`) — rotating them simply invalidates every currently-issued access/refresh token, forcing everyone to log in again, which is already an expected consequence of deploying this change.

## 1. Rotate the encryption key (URGENT — do this first)

Your live `.env` has `ENCRYPTION_KEY` set to the exact placeholder value that ships in `.env.example`. Every WhatsApp access token currently stored in the database is decryptable by anyone who has seen this repo's example file. The hardened `env.ts` now refuses to boot with that value, so this must be done before deploying.

```bash
# 1. Generate a new key
openssl rand -hex 32
# copy the output — this is your NEW ENCRYPTION_KEY

# 2. Re-encrypt every stored WhatsApp access token from the old key to the new one.
#    Dry-run first (no writes):
cd apps/backend
OLD_ENCRYPTION_KEY="<the current live ENCRYPTION_KEY>" \
ENCRYPTION_KEY="<the new key from step 1>" \
npm run rotate:encryption-key

# 3. If the dry run looks right (every account decrypted successfully), apply it:
OLD_ENCRYPTION_KEY="<the current live ENCRYPTION_KEY>" \
ENCRYPTION_KEY="<the new key from step 1>" \
npm run rotate:encryption-key -- --apply

# 4. Only after step 3 succeeds, update the deployed ENCRYPTION_KEY env var to the new key everywhere
#    (docker-compose .env, hosting provider secrets, etc.) and restart the backend.
```

If any account fails to decrypt with `OLD_ENCRYPTION_KEY`, do not proceed — that account's token was already encrypted with a different key and needs investigating before rotation.

## 2. Rotate the Super Admin credential (URGENT)

The old code auto-created a `superadmin@prowexa.com` account with password `Admin123!` the first time anyone logged in. If your app has ever been live, that account almost certainly exists in your production database right now with that exact password. The new code removes the auto-create entirely, but does **not** retroactively invalidate that existing row.

```bash
cd apps/backend
SUPERADMIN_EMAIL="you@yourcompany.com" \
SUPERADMIN_PASSWORD="a real, long, random password — 12+ chars" \
npm run seed:superadmin
```

This creates/updates **only** the email you specify. Then, separately, deactivate (or delete) the old backdoor account so it can never be used again:

```sql
UPDATE "SuperAdminUser" SET "isActive" = false WHERE email = 'superadmin@prowexa.com';
-- or, if you don't need it at all:
-- DELETE FROM "SuperAdminUser" WHERE email = 'superadmin@prowexa.com';
```

(Skip this if `you@yourcompany.com` above *is* `superadmin@prowexa.com` — the seed script will just rotate that row's password in place.)

## 3. `env.ts` will now refuse to boot until steps 0 and 1 are done

`env.ts` refuses to start if `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, or `ENCRYPTION_KEY` match the placeholder values from `.env.example`, and requires at least 32 characters for each. This is deliberate — see steps 0 and 1 above.

## 4. New required environment variables

Set these in your deployment environment (see the updated `.env.example` for the full list and comments):

- `RAZORPAY_WEBHOOK_SECRET` — from the Razorpay Dashboard, for the webhook URL `https://api.wabtic.com/api/v1/webhooks/payments/razorpay`. Payment webhooks will be rejected without this.
- `COOKIE_DOMAIN` — set to `.wabtic.com` in production so the auth cookie is shared between `app.wabtic.com` and `api.wabtic.com`. Leave blank in local dev.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — for real email verification (Phase 2).

## 5. Expect a one-time logout

The auth-cookie migration means every currently-logged-in user's old `localStorage` token stops being read once this deploys — everyone will need to log in again. Worth doing at a quiet time and giving your users a heads-up.

## 7. Fixed in this pass, no action needed from you

- `Team.tsx`'s "Invite Team Member" form used to default the initial password field to the literal string `Prowexa123!` — the same guessable password for every newly-invited agent across every tenant unless the admin remembered to change it. It now generates a random password per invite (still editable before submitting).
- `organization.service.ts`'s `inviteMember` had the same class of issue (a fixed fallback password when none was supplied) — already fixed with a random per-invite fallback.
- `Organization.geminiApiKey` and `razorpayKeySecret` are now encrypted at rest (AES-256-GCM, same scheme as `WhatsappAccount.encryptedAccessToken`) — every read/write path (`organization.service.ts`, `ai.service.ts`, `superadmin.service.ts`'s master-key functions) has been updated consistently.
- Stripe support (webhook route, controller, service function, `stripe` npm dependency, env vars) removed entirely — this platform only actually uses Razorpay, so a Stripe webhook endpoint that could never be properly configured was just dead attack surface. `PaymentGateway`'s `STRIPE` enum value is left in the Prisma schema (harmless, unused) rather than risk a schema migration for a cosmetic cleanup.

## 6. Known residual gap (separate repo, not fixed here)

`wabtic-website/` (a separate git repository/deployment) hands off login tokens to the dashboard via URL query parameters (`?sso_access=...`). This still works after these changes, but the tokens still transit the URL from that site. Fully closing this requires a small change in `wabtic-website`'s own `LoginPage.tsx`/`RegisterPage.tsx`/`navbar.tsx`: add `withCredentials: true` to its axios client and drop the `sso_*` params — since both sites hit the same backend and the cookie's `Domain` is shared, the dashboard will simply already be logged in after redirect. Flagging this as a follow-up for whoever maintains that repo.
