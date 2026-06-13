import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/change-password', authenticate, authController.changePassword);
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

export default router;
