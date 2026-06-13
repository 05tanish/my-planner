import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import crypto from 'crypto';

export const getProfile = async (userId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true,
          emailVerified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  return profile;
};

export const updateProfile = async (userId: string, data: any) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  return prisma.profile.update({
    where: { userId },
    data: {
      name: data.name,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      logoUrl: data.logoUrl,
      githubUsername: data.githubUsername,
      linkedinUrl: data.linkedinUrl,
      backupEmail: data.backupEmail,
      socialLinks: data.socialLinks !== undefined ? data.socialLinks : undefined,
      notifEmail: data.notifEmail,
      notifTelegram: data.notifTelegram,
      telegramChatId: data.telegramChatId,
      reminderTime: data.reminderTime,
      telegramNotifInterval: data.telegramNotifInterval !== undefined ? Number(data.telegramNotifInterval) : undefined,
      leetcodeUsername: data.leetcodeUsername,
      gfgUsername: data.gfgUsername,
    },
  });
};

/**
 * Generate a 6-digit short-lived PIN so the user can link their Telegram account
 * by sending `/link <PIN>` to the bot. The PIN expires in 15 minutes.
 */
export const generateTelegramLinkPin = async (userId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  // 6-digit numeric token
  const token = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min from now

  await prisma.profile.update({
    where: { userId },
    data: {
      telegramLinkToken: token,
      telegramLinkExpiry: expiry,
    },
  });

  return { token, expiresAt: expiry };
};
