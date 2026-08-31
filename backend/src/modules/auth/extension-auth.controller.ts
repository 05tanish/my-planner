import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import prisma from '../../config/database';
import crypto from 'crypto';
import { logActivity } from '../../services/activity-log.service';

/**
 * POST /api/auth/extension-token
 * Generate a token for the Chrome Extension (requires authenticated session).
 */
export const generateExtensionToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    const name = req.body.name || 'Chrome Extension';

    // Generate a secure random token
    const token = crypto.randomBytes(48).toString('hex');

    // Create new token — expires in 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await prisma.extensionToken.create({
      data: {
        userId,
        token,
        name,
        expiresAt,
      },
    });

    logActivity({
      userId,
      action: 'extension.token_generated',
      entity: 'extension',
      metadata: { tokenName: name },
    });
    return sendSuccess(res, { token, expiresAt: expiresAt.toISOString() }, 'Extension token generated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/extension-verify
 * Verify an extension token (used by extension to check if connected).
 */
export const verifyExtensionToken = async (
  req: AuthRequest & { body: { token: string } },
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;
    if (!token) {
      return sendError(res, 'Token is required', 400);
    }

    const record = await prisma.extensionToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!record || record.expiresAt < new Date()) {
      return sendError(res, 'Invalid or expired token', 401);
    }

    // Update last used
    await prisma.extensionToken.update({
      where: { id: record.id },
      data: { lastUsed: new Date() },
    });

    return sendSuccess(res, {
      userId: record.user.id,
      email: record.user.email,
    }, 'Token verified');
  } catch (err) {
    logActivity({
      userId: 'unknown',
      action: 'extension.token_verify_failed',
      entity: 'extension',
      level: 'warn',
      metadata: { error: 'verification_error' },
    });
    next(err);
  }
};

/**
 * DELETE /api/auth/extension-token
 * Revoke extension token (disconnect extension).
 */
export const revokeExtensionToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    await prisma.extensionToken.deleteMany({ where: { userId } });
    logActivity({
      userId,
      action: 'extension.all_tokens_revoked',
      entity: 'extension',
    });
    return sendSuccess(res, null, 'Extension disconnected');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/extension-status
 * Check if user has an active extension connection.
 */
export const getExtensionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const tokens = await prisma.extensionToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, name: true, lastUsed: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, {
      connected: tokens.length > 0,
      tokens,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/auth/extension-token/:id
 * Revoke a specific extension token.
 */
export const revokeSpecificExtensionToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const tokenId = req.params.id;
    await prisma.extensionToken.deleteMany({ where: { userId, id: String(tokenId) } });
    return sendSuccess(res, null, 'Extension disconnected');
  } catch (err) {
    next(err);
  }
};
