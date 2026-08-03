import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
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
 * @desc    Verify user email address with token
 * @access  Public
 */
router.post('/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Trigger password reset email
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user info
 * @access  Bearer
 */
router.get('/me', authenticate, AuthController.getMe);

export default router;
