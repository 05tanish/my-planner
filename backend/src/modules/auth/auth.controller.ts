import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = registerSchema.parse(req.body);
    const { user, emailVerifyToken } = await authService.register(
      dto,
      req.headers['user-agent'],
      req.ip
    );

    // In dev, return token directly; in prod, send via email
    return sendCreated(res, {
      message: 'Account created. Please verify your email.',
      ...(process.env.NODE_ENV === 'development' ? { devToken: emailVerifyToken } : {}),
      userId: user.id,
    });
  } catch (err: any) {
    console.error('❌ User Registration Failed:', {
      error: err.message,
      stack: err.stack,
      body: { ...req.body, password: '[REDACTED]' },
    });
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) return sendError(res, 'Token is required', 400);
    await authService.verifyEmail(token);
    return sendSuccess(res, null, 'Email verified successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

const COOKIE_OPTIONS = {
  httpOnly: true,       // Not accessible via JS — XSS-proof
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await authService.login(dto, req.headers['user-agent'], req.ip);
    
    // Set httpOnly cookie — browser sends it automatically, JS cannot read it
    res.cookie('access_token', result.token, COOKIE_OPTIONS);
    
    return sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from header OR cookie
    const token = req.headers.authorization?.slice(7) || req.cookies?.access_token;
    if (token) await authService.logout(token);
    
    // Clear the httpOnly cookie
    res.clearCookie('access_token', { path: '/' });
    
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { default: prisma } = await import('../../config/database');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }) as any;
    if (user) {
      delete user.password;
      delete user.emailVerifyToken;
      delete user.passwordResetToken;
    }
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(dto);

    if (result && process.env.NODE_ENV === 'development') {
      return sendSuccess(res, { devToken: result.resetToken }, 'Reset link sent (dev mode)');
    }

    return sendSuccess(res, null, 'If this email is registered, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(dto);
    return sendSuccess(res, null, 'Password reset successfully. Please log in.');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dto = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.userId, dto);
    return sendSuccess(res, null, 'Password changed. Please log in again.');
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await authService.getSessions(req.user!.userId);
    return sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await authService.revokeSession(req.user!.userId, req.params.sessionId as string);
    return sendSuccess(res, null, 'Session revoked');
  } catch (err) {
    next(err);
  }
};
