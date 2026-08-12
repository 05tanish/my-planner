import { Response, NextFunction } from 'express';
import { Request } from 'express';
import { sendError } from '../utils/response';
import prisma from '../config/database';

/**
 * Middleware that authenticates requests from the Chrome Extension
 * using the X-Extension-Token header.
 * Falls back to regular cookie/JWT auth if no extension token is provided.
 */
export const extensionOrSessionAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for extension token header first
  const extensionToken = req.headers['x-extension-token'] as string | undefined;

  if (extensionToken) {
    try {
      const record = await prisma.extensionToken.findUnique({
        where: { token: extensionToken },
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      });

      if (!record || record.expiresAt < new Date()) {
        return sendError(res, 'Invalid or expired extension token', 401);
      }

      // Update last used timestamp (fire and forget)
      prisma.extensionToken.update({
        where: { id: record.id },
        data: { lastUsed: new Date() },
      }).catch(() => {}); // Don't block the request

      req.user = {
        userId: record.user.id,
        email: record.user.email,
        role: record.user.role,
      };

      return next();
    } catch {
      return sendError(res, 'Extension authentication failed', 401);
    }
  }

  // No extension token — fall through to regular auth middleware
  // Import and use the standard authenticate middleware
  const { authenticate } = await import('./auth.middleware');
  return authenticate(req as any, res, next);
};
