import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { hashPassword } from '../../utils/hash';
import { Role } from '@prisma/client';

export const listUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      profile: {
        select: {
          name: true,
          bio: true,
          avatarUrl: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return users;
};

export const createUser = async (data: {
  email: string;
  password?: string;
  role?: Role;
  name: string;
}) => {
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('A user with this email already exists.', 409);
  }

  // Default password if not provided
  const passwordText = data.password || 'DevOSPass123!';
  const hashedPassword = await hashPassword(passwordText);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: data.role || Role.USER,
      emailVerified: true, // Auto verified when admin creates
      profile: {
        create: {
          name: data.name,
          bio: 'Personal Developer OS user',
        },
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};

export const updateUser = async (
  id: string,
  data: {
    password?: string;
    role?: Role;
    name?: string;
  }
) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const updateData: any = {};
  if (data.role) {
    updateData.role = data.role;
  }
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  // Update profile if name is updated
  if (data.name) {
    await prisma.profile.update({
      where: { userId: id },
      data: { name: data.name },
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      role: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const deleteUser = async (id: string, adminUserId: string) => {
  if (id === adminUserId) {
    throw new AppError('You cannot delete your own account.', 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await prisma.user.delete({ where: { id } });
};
