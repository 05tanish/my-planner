import { prisma } from '../../config/database';
import type { PlacementSection, PlacementResourceType } from '@prisma/client';

interface CreatePlacementNoteDto {
  section: PlacementSection;
  title: string;
  content?: string;
  type?: PlacementResourceType;
  fileUrl?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

interface UpdatePlacementNoteDto {
  section?: PlacementSection;
  title?: string;
  content?: string;
  type?: PlacementResourceType;
  fileUrl?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

export const placementService = {
  // Create a new placement note
  async create(userId: string, data: CreatePlacementNoteDto, fileUrl?: string) {
    return prisma.placementNote.create({
      data: {
        userId,
        section: data.section,
        title: data.title,
        content: data.content,
        type: data.type || 'NOTE',
        fileUrl: fileUrl || data.fileUrl,
        tags: data.tags || [],
        isPinned: data.isPinned || false,
        isFavorite: data.isFavorite || false,
      },
    });
  },

  // List all placement notes for a user
  async list(userId: string, query: any) {
    const { section, type, search, isPinned, isFavorite } = query;

    const where: any = { userId };

    if (section) where.section = section;
    if (type) where.type = type;
    if (isPinned === 'true') where.isPinned = true;
    if (isFavorite === 'true') where.isFavorite = true;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.placementNote.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  },

  // Get topics summary (count by section)
  async getTopics(userId: string) {
    const notes = await prisma.placementNote.groupBy({
      by: ['section'],
      where: { userId },
      _count: { id: true },
    });

    return notes.map((item) => ({
      section: item.section,
      count: item._count.id,
    }));
  },

  // Get a single placement note
  async getOne(userId: string, id: string) {
    return prisma.placementNote.findFirst({
      where: { id, userId },
    });
  },

  // Get report for a specific section
  async getReport(userId: string, section?: string) {
    const where: any = { userId };
    if (section) where.section = section;

    const notes = await prisma.placementNote.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const summary = await prisma.placementNote.groupBy({
      by: ['section'],
      where,
      _count: { id: true },
    });

    return {
      notes,
      summary: summary.map((s) => ({
        section: s.section,
        count: s._count.id,
      })),
    };
  },

  // Get report for a single note
  async getOneReport(userId: string, id: string) {
    const note = await prisma.placementNote.findFirst({
      where: { id, userId },
    });

    if (!note) return null;

    // Get related notes from same section
    const relatedNotes = await prisma.placementNote.findMany({
      where: {
        userId,
        section: note.section,
        id: { not: id },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    return {
      note,
      relatedNotes,
    };
  },

  // Update a placement note
  async update(userId: string, id: string, data: UpdatePlacementNoteDto, fileUrl?: string) {
    const updateData: any = {};

    if (data.section !== undefined) updateData.section = data.section;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (fileUrl) updateData.fileUrl = fileUrl;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;

    return prisma.placementNote.update({
      where: { id },
      data: updateData,
    });
  },

  // Delete a placement note
  async remove(userId: string, id: string) {
    return prisma.placementNote.delete({
      where: { id },
    });
  },
};
