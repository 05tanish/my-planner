import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma } from '@prisma/client';

export const create = async (userId: string, data: any) =>
  prisma.note.create({ data: { ...data, userId }, include: { tags: true, attachments: true } });

export const list = async (userId: string, q: any) => {
  const where: Prisma.NoteWhereInput = { userId, isArchived: q.archived === 'true' };
  if (q.category) {
    if (q.category === 'Other') {
      where.OR = [
        { category: 'Other' },
        { category: null },
        { category: '' }
      ];
    } else {
      where.category = q.category;
    }
  }
  if (q.favorite === 'true') where.isFavorite = true;
  if (q.pinned === 'true') where.isPinned = true;
  if (q.search) where.OR = [{ title: { contains: q.search, mode: 'insensitive' } }, { content: { contains: q.search, mode: 'insensitive' } }];
  if (q.tag) where.tags = { some: { tag: q.tag } };

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: { tags: true, attachments: { select: { id: true, filename: true, mimeType: true, url: true } } },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 20),
      take: Number(q.limit || 20),
    }),
    prisma.note.count({ where }),
  ]);
  return { notes, total };
};

export const getOne = async (userId: string, id: string) => {
  const note = await prisma.note.findFirst({ where: { id, userId }, include: { tags: true, attachments: true } });
  if (!note) throw new AppError('Note not found.', 404);
  return note;
};

export const update = async (userId: string, id: string, data: any) => {
  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) throw new AppError('Note not found.', 404);

  const { tags, ...rest } = data;
  return prisma.note.update({
    where: { id },
    data: {
      ...rest,
      ...(tags && {
        tags: {
          deleteMany: {},
          createMany: { data: tags.map((t: string) => ({ tag: t })) },
        },
      }),
    },
    include: { tags: true, attachments: true },
  });
};

export const remove = async (userId: string, id: string) => {
  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) throw new AppError('Note not found.', 404);
  await prisma.note.delete({ where: { id } });
};

export const importNote = async (userId: string, file: Express.Multer.File) => {
  const filename = file.originalname;
  const ext = filename.split('.').pop()?.toLowerCase();

  let title = filename.substring(0, filename.lastIndexOf('.')) || filename;
  let content = '';

  if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
    let rawContent = '';
    const buf = file.buffer;
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      rawContent = buf.toString('utf-16le');
    } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      const swapped = Buffer.alloc(buf.length);
      for (let i = 0; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          swapped[i] = buf[i + 1];
          swapped[i + 1] = buf[i];
        }
      }
      rawContent = swapped.toString('utf-16le');
    } else {
      rawContent = buf.toString('utf-8');
    }

    // Try to extract first h1 as title, e.g., "# My Title"
    const headingMatch = rawContent.match(/^#\s+(.*)/m);
    if (headingMatch && headingMatch[1]) {
      title = headingMatch[1].trim();
      // Remove the heading from the content so it is not duplicated
      content = rawContent.replace(/^#\s+(.*)/m, '').trim();
    } else {
      content = rawContent;
    }
  } else if (ext === 'html' || ext === 'htm') {
    let rawHtml = '';
    const buf = file.buffer;
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      rawHtml = buf.toString('utf-16le');
    } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      const swapped = Buffer.alloc(buf.length);
      for (let i = 0; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          swapped[i] = buf[i + 1];
          swapped[i + 1] = buf[i];
        }
      }
      rawHtml = swapped.toString('utf-16le');
    } else {
      rawHtml = buf.toString('utf-8');
    }

    // Extract title from <title> or <h1> (matching tags with attributes)
    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // Strip styles, scripts, and head headers
    let cleanedHtml = rawHtml
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '');

    // Advanced HTML to Markdown parsing
    content = cleanedHtml
      // Code blocks
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
      // Headers
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      // Images
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
      // Formatting
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')
      // Lists
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n')
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1\n')
      // Layout
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<hr\s*\/?>/gi, '---\n\n')
      // Clean tags but keep contents
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<span[^>]*>/gi, '')
      .replace(/<\/span>/gi, '')
      // Strip remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    throw new AppError('Unsupported file type. Please upload a Markdown (.md) or Notion HTML export (.html) file.', 400);
  }

  return prisma.note.create({
    data: {
      userId,
      title,
      content,
      category: 'Imported',
    },
    include: {
      tags: true,
      attachments: true,
    }
  });
};
