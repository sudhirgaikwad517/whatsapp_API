import { describe, it, expect, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../src/middlewares/auth.middleware.js';

vi.mock('../../src/config/env.js', () => ({
  env: { JWT_SECRET: 'test_jwt_secret_1234567890123456', NODE_ENV: 'test' },
}));

const { requireSuperAdmin } = await import('../../src/middlewares/superadmin.middleware.js');

function buildReq(user: AuthenticatedRequest['user']): AuthenticatedRequest {
  return { user } as AuthenticatedRequest;
}

describe('requireSuperAdmin middleware', () => {
  it('rejects a request with no user attached', () => {
    const next = vi.fn();
    requireSuperAdmin(buildReq(undefined), {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects a valid, authenticated tenant user JWT (the original bypass)', () => {
    // This is exactly the shape of a normal tenant login token — a valid
    // signature alone must never be treated as super admin authority.
    const next = vi.fn();
    requireSuperAdmin(
      buildReq({
        userId: 'user-1',
        email: 'agent@tenant.com',
        organizationId: 'org-1',
        role: 'AGENT' as any,
      }),
      {} as any,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects a token with role SUPER_ADMIN but missing the isSuperAdmin flag', () => {
    const next = vi.fn();
    requireSuperAdmin(
      buildReq({
        userId: 'user-1',
        email: 'owner@tenant.com',
        organizationId: 'org-1',
        role: 'SUPER_ADMIN' as any,
      }),
      {} as any,
      next
    );
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  it('allows a genuine super admin token through', () => {
    const next = vi.fn();
    requireSuperAdmin(
      buildReq({
        userId: 'admin-1',
        email: 'admin@company.com',
        organizationId: 'SYSTEM_SUPER_ADMIN',
        role: 'SUPER_ADMIN' as any,
        isSuperAdmin: true,
      }),
      {} as any,
      next
    );
    expect(next).toHaveBeenCalledWith(); // called with no error argument
  });
});
