import { Router } from 'express';
import { AuthController } from '../../controllers/authController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { loginSchema, resetPasswordSchema, refreshTokenSchema } from '../../validators/authValidator';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/v1/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   GET /api/v1/auth/session
 * @desc    Get current session
 * @access  Private
 */
router.get('/session', authenticate, authController.getSession);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

export default router;
