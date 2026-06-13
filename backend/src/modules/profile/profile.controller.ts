import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './profile.service';
import { sendSuccess } from '../../utils/response';
import { uploadFile } from '../../services/storage.service';
import prisma from '../../config/database';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await service.getProfile(req.user!.userId);
    return sendSuccess(res, profile);
  } catch (e) {
    next(e);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await service.updateProfile(req.user!.userId, req.body);
    return sendSuccess(res, profile, 'Profile updated successfully');
  } catch (e) {
    next(e);
  }
};

export const uploadLogo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload file to storage under "logos" folder
    const publicUrl = await uploadFile(req.file, 'logos');

    // Update profile in DB
    await prisma.profile.update({
      where: { userId: req.user!.userId },
      data: { logoUrl: publicUrl },
    });

    return sendSuccess(res, { logoUrl: publicUrl }, 'Logo uploaded successfully');
  } catch (e) {
    next(e);
  }
};

/**
 * POST /profile/telegram-link-pin
 * Generate a 6-digit PIN so the user can link Telegram by sending /link <PIN> to the bot.
 */
export const generateTelegramLinkPin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await service.generateTelegramLinkPin(req.user!.userId);
    return sendSuccess(res, result, 'Telegram link PIN generated');
  } catch (e) {
    next(e);
  }
};
