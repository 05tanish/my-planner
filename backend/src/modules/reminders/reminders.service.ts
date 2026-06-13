import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { ReminderType } from '@prisma/client';

export const create = async (userId: string, data: any) => {
  return prisma.reminder.create({
    data: {
      userId,
      type: data.type as ReminderType,
      channels: data.channels || ['EMAIL'],
      message: data.message,
      cronExpr: data.cronExpr,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

export const list = async (userId: string) => {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getOne = async (userId: string, id: string) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id, userId },
  });
  if (!reminder) throw new AppError('Reminder not found', 404);
  return reminder;
};

export const update = async (userId: string, id: string, data: any) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id, userId },
  });
  if (!reminder) throw new AppError('Reminder not found', 404);

  return prisma.reminder.update({
    where: { id },
    data: {
      type: data.type !== undefined ? (data.type as ReminderType) : undefined,
      channels: data.channels,
      message: data.message,
      cronExpr: data.cronExpr,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
      lastSent: data.lastSent,
    },
  });
};

export const remove = async (userId: string, id: string) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id, userId },
  });
  if (!reminder) throw new AppError('Reminder not found', 404);

  await prisma.reminder.delete({
    where: { id },
  });
};
