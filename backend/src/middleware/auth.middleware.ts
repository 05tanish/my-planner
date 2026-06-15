import { Response, NextFunction } from 'express';
import { Request } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../config/database';

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
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Unauthorized — no token provided', 401);
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    // Verify session exists in DB
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return sendError(res, 'Session expired or invalid', 401);
    }

    // Fetch user details including role
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return sendError(res, 'User not found', 401);
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
