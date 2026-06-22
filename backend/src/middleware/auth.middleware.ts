import { Response, NextFunction } from 'express';
import { Request } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../config/database';
import * as redis from '../services/redis.service';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Augment Express Request to match AuthRequest
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract token — from Authorization header OR from httpOnly cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return sendError(res, 'Unauthorized — no token provided', 401);
    }

    // 2. Verify JWT signature
    let payload: { userId: string; email: string };
    try {
      payload = verifyToken(token);
    } catch {
      return sendError(res, 'Unauthorized — invalid token', 401);
    }

    // 3. Check Redis session first (fast path — avoids DB hit on every request)
    const cached = await redis.getSession(token);
    if (cached) {
      req.user = { userId: cached.userId, email: cached.email, role: cached.role };
      return next();
    }

    // 4. Redis miss — fall back to Postgres session table
    const session = await prisma.session.findUnique({ where: { token } });

    if (!session || session.expiresAt < new Date()) {
      return sendError(res, 'Session expired or invalid', 401);
    }

    // 5. Fetch user role (not in JWT payload)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    // 6. Re-cache in Redis so next request is fast (sliding window approach)
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await redis.setSession(token, { userId: user.id, email: user.email, role: user.role });
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    return next();
  } catch {
    return sendError(res, 'Unauthorized — invalid token', 401);
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden — insufficient permissions', 403);
    }
    return next();
  };
};
