import { Router } from 'express';
import * as authController from './auth.controller';
import * as extAuthController from './extension-auth.controller';
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

// Extension Auth
router.post('/extension-token', authenticate, extAuthController.generateExtensionToken);
router.post('/extension-verify', extAuthController.verifyExtensionToken);
router.delete('/extension-token', authenticate, extAuthController.revokeExtensionToken);
router.delete('/extension-token/:id', authenticate, extAuthController.revokeSpecificExtensionToken);
router.patch('/extension-token/:id', authenticate, extAuthController.renameExtensionToken);
router.get('/extension-status', authenticate, extAuthController.getExtensionStatus);

export default router;
