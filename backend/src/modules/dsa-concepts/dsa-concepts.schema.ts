import { z } from 'zod';

export const createDsaConceptSchema = z.object({
  topic: z.string().trim().min(1, 'Topic name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  shortDescription: z.string().optional().nullable(),
  detailedNotes: z.string().optional().nullable(),
  codeSnippet: z.string().optional().nullable(),
  language: z.string().default('C++'),
  leetcodeUrl: z.string().optional().nullable(),
  gfgUrl: z.string().optional().nullable(),
  codeforcesUrl: z.string().optional().nullable(),
  youtubeUrl: z.string().optional().nullable(),
  referenceLinks: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  isFavorite: z.boolean().optional().default(false),
});

export const updateDsaConceptSchema = createDsaConceptSchema.partial();

export const dsaConceptQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  favorite: z.string().optional(), // 'true' or 'false'
  sortBy: z.enum(['latest', 'oldest', 'alphabetical_asc', 'alphabetical_desc']).optional().default('latest'),
});

export type CreateDsaConceptDto = z.infer<typeof createDsaConceptSchema>;
export type UpdateDsaConceptDto = z.infer<typeof updateDsaConceptSchema>;
export type DsaConceptQueryDto = z.infer<typeof dsaConceptQuerySchema>;
