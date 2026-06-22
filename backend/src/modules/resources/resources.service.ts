import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma, ResourceType } from '@prisma/client';

// --- Folder Operations ---
export const createFolder = async (userId: string, data: any) => {
  return prisma.resourceFolder.create({
    data: {
      userId,
      name: data.name,
      parentId: data.parentId || null,
    },
  });
};

export const listFolders = async (userId: string) => {
  return prisma.resourceFolder.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
};

export const updateFolder = async (userId: string, folderId: string, data: any) => {
  const folder = await prisma.resourceFolder.findFirst({
    where: { id: folderId, userId },
  });
  if (!folder) throw new AppError('Folder not found', 404);

  return prisma.resourceFolder.update({
    where: { id: folderId },
    data: {
      name: data.name,
      parentId: data.parentId !== undefined ? data.parentId : undefined,
    },
  });
};

export const deleteFolder = async (userId: string, folderId: string) => {
  const folder = await prisma.resourceFolder.findFirst({
    where: { id: folderId, userId },
  });
  if (!folder) throw new AppError('Folder not found', 404);

  // Set child folders parentId to null or delete recursively? Let's update children's parentId to null, and delete this folder.
  // Wait, let's just do it in a transaction.
  await prisma.$transaction([
    prisma.resourceFolder.updateMany({
      where: { parentId: folderId, userId },
      data: { parentId: null },
    }),
    prisma.resource.updateMany({
      where: { folderId, userId },
      data: { folderId: null },
    }),
    prisma.resourceFolder.delete({
      where: { id: folderId },
    }),
  ]);
};

// --- Resource Operations ---
export const createResource = async (userId: string, data: any) => {
  if (data.folderId) {
    const folder = await prisma.resourceFolder.findFirst({
      where: { id: data.folderId, userId },
    });
    if (!folder) throw new AppError('Folder not found', 404);
  }

  return prisma.resource.create({
    data: {
      ...data,
      userId,
    },
  });
};

export const listResources = async (userId: string, q: any) => {
  const where: Prisma.ResourceWhereInput = { userId };

  if (q.folderId) {
    if (q.folderId === 'root') {
      where.folderId = null;
    } else {
      where.folderId = q.folderId;
    }
  }
  if (q.type) {
    where.type = q.type as ResourceType;
  }
  if (q.tag) {
    where.tags = { has: q.tag };
  }
  if (q.isFavorite === 'true') {
    where.isFavorite = true;
  }
  if (q.status) {
    where.status = q.status;
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 20),
      take: Number(q.limit || 20),
    }),
    prisma.resource.count({ where }),
  ]);

  return { resources, total };
};

export const getOneResource = async (userId: string, id: string) => {
  const resource = await prisma.resource.findFirst({
    where: { id, userId },
    include: { folder: true },
  });
  if (!resource) throw new AppError('Resource not found', 404);
  return resource;
};

export const updateResource = async (userId: string, id: string, data: any) => {
  const resource = await prisma.resource.findFirst({
    where: { id, userId },
  });
  if (!resource) throw new AppError('Resource not found', 404);

  if (data.folderId) {
    const folder = await prisma.resourceFolder.findFirst({
      where: { id: data.folderId, userId },
    });
    if (!folder) throw new AppError('Folder not found', 404);
  }

  return prisma.resource.update({
    where: { id },
    data,
  });
};

export const removeResource = async (userId: string, id: string) => {
  const resource = await prisma.resource.findFirst({
    where: { id, userId },
  });
  if (!resource) throw new AppError('Resource not found', 404);

  await prisma.resource.delete({
    where: { id },
  });
};

// Bulk update sortOrder for resources (drag-and-drop)
export const reorderResources = async (userId: string, items: { id: string; sortOrder: number }[]) => {
  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.resource.updateMany({ where: { id, userId }, data: { sortOrder } })
    )
  );
  return { updated: items.length };
};

// Bulk update sortOrder for folders (drag-and-drop)
export const reorderFolders = async (userId: string, items: { id: string; sortOrder: number }[]) => {
  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.resourceFolder.updateMany({ where: { id, userId }, data: { sortOrder } })
    )
  );
  return { updated: items.length };
};

