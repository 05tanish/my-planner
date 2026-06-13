import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma, PlacementSection, PlacementResourceType } from '@prisma/client';

export const create = async (userId: string, data: any) => {
  return prisma.placementNote.create({
    data: {
      ...data,
      userId,
    },
  });
};

export const list = async (userId: string, q: any) => {
  const where: Prisma.PlacementNoteWhereInput = { userId };

  if (q.section) {
    where.section = q.section as PlacementSection;
  }
  if (q.type) {
    where.type = q.type as PlacementResourceType;
  }
  if (q.tag) {
    where.tags = { has: q.tag };
  }
  if (q.isPinned === 'true') {
    where.isPinned = true;
  }
  if (q.isFavorite === 'true') {
    where.isFavorite = true;
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { content: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  const [notes, total] = await Promise.all([
    prisma.placementNote.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 20),
      take: Number(q.limit || 20),
    }),
    prisma.placementNote.count({ where }),
  ]);

  return { notes, total };
};

export const getOne = async (userId: string, id: string) => {
  const note = await prisma.placementNote.findFirst({
    where: { id, userId },
  });
  if (!note) throw new AppError('Placement resource not found', 404);
  return note;
};

export const update = async (userId: string, id: string, data: any) => {
  const note = await prisma.placementNote.findFirst({
    where: { id, userId },
  });
  if (!note) throw new AppError('Placement resource not found', 404);

  return prisma.placementNote.update({
    where: { id },
    data,
  });
};

export const remove = async (userId: string, id: string) => {
  const note = await prisma.placementNote.findFirst({
    where: { id, userId },
  });
  if (!note) throw new AppError('Placement resource not found', 404);

  await prisma.placementNote.delete({
    where: { id },
  });
};

export const generateSingleReport = async (userId: string, id: string) => {
  const note = await prisma.placementNote.findFirst({
    where: { id, userId },
  });
  if (!note) throw new AppError('Placement resource not found', 404);

  let report = `# DEVOS STUDY GUIDE: ${note.title.toUpperCase()}\n\n`;
  report += `**Section:** ${note.section.replace('_', ' ')}  \n`;
  report += `**Type:** ${note.type}  \n`;
  report += `**Date:** ${new Date(note.createdAt).toLocaleDateString()}  \n`;
  if (note.tags && note.tags.length > 0) {
    report += `**Tags:** ${note.tags.map(t => `\`#${t}\``).join(', ')}  \n`;
  }
  if (note.fileUrl) {
    report += `**Attachment Link:** [Download File](${note.fileUrl})  \n`;
  }
  report += `\n---\n\n`;
  report += note.content || '*No content provided.*';

  return { title: note.title, markdown: report };
};

export const generateSectionReport = async (userId: string, section: string) => {
  const notes = await prisma.placementNote.findMany({
    where: { userId, section: section as any },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });

  const sectionName = section.replace('_', ' ');
  let report = `# DEVOS COMPILATION STUDY GUIDE: ${sectionName.toUpperCase()}\n`;
  report += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
  report += `Total Resources Compiled: ${notes.length}\n\n`;

  if (notes.length === 0) {
    report += `*No notes found in this section.*`;
    return { section, markdown: report };
  }

  report += `## TABLE OF CONTENTS\n\n`;
  notes.forEach((note, index) => {
    const anchor = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    report += `${index + 1}. [${note.title}](#${anchor}) (${note.type})\n`;
  });

  report += `\n---\n\n`;

  notes.forEach((note) => {
    const anchor = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    report += `<a name="${anchor}"></a>\n`;
    report += `### ${note.title}\n\n`;
    report += `**Type:** ${note.type} | **Created:** ${new Date(note.createdAt).toLocaleDateString()}  \n`;
    if (note.tags && note.tags.length > 0) {
      report += `**Tags:** ${note.tags.map(t => `\`#${t}\``).join(', ')}  \n`;
    }
    if (note.fileUrl) {
      report += `**Attachment Link:** [Download File](${note.fileUrl})  \n`;
    }
    report += `\n`;
    report += note.content || '*No content provided.*';
    report += `\n\n---\n\n`;
  });

  return { section, markdown: report };
};
