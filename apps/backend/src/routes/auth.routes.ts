import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
} from '../validators/auth.schema.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new business owner and create organization
 * @access  Public
 */
router.post('/register', validate(registerSchema), AuthController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user, return JWT access + refresh token
 * @access  Public
 */
router.post('/login', validate(loginSchema), AuthController.login);

/**
 * @route   POST /api/v1/auth/session
 * @desc    Exchange SSO handoff tokens (from wabtic-website) for httpOnly cookies
 * @access  Public — tokens must already be validly signed by this server
 */
router.post('/session', AuthController.createSessionFromTokens);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Exchange refresh token for a new access token
 * @access  Public
 */
router.post('/refresh', AuthController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token and invalidate session
 * @access  Bearer
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user email address with token (API consumers)
 * @access  Public
 */
router.post('/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);

/**
 * @route   GET /api/v1/auth/verify-email
 * @desc    Verify user email address with token — directly clickable from the
 *          verification email; redirects to the frontend rather than returning JSON.
 * @access  Public
 */
router.get('/verify-email', AuthController.verifyEmailViaLink);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend the email verification link
 * @access  Public
 */
router.post('/resend-verification', AuthController.resendVerificationEmail);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Trigger password reset email
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Complete a password reset using the emailed token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user info
 * @access  Bearer
 */
router.get('/me', authenticate, AuthController.getMe);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update the current user's own name/phone number
 * @access  Bearer
 */
router.put('/profile', authenticate, validate(updateProfileSchema), AuthController.updateProfile);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change the current user's own password (requires current password)
 * @access  Bearer
 */
router.put('/change-password', authenticate, validate(changePasswordSchema), AuthController.changePassword);

/**
 * @route   PUT /api/v1/auth/change-email
 * @desc    Change the current user's own email (requires current password; re-verification required)
 * @access  Bearer
 */
router.put('/change-email', authenticate, validate(changeEmailSchema), AuthController.changeEmail);

export default router;
