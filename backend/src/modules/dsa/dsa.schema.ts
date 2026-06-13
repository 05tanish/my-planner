import { z } from 'zod';

const DsaPlatformEnum = z.enum(['LEETCODE', 'GFG', 'CODEFORCES', 'CODECHEF', 'HACKERRANK']);
const DsaDifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);
const DsaTopicEnum = z.enum([
  'ARRAYS', 'STRINGS', 'HASHING', 'LINKED_LIST', 'STACK', 'QUEUE',
  'TREE', 'BST', 'HEAP', 'GRAPH', 'DP', 'GREEDY', 'BACKTRACKING',
  'TRIE', 'SEGMENT_TREE', 'BINARY_SEARCH', 'SLIDING_WINDOW', 'TWO_POINTERS',
]);

export const createDsaProblemSchema = z.object({
  name: z.string().min(1, 'Problem name is required'),
  difficulty: DsaDifficultyEnum,
  platform: DsaPlatformEnum,
  problemUrl: z.string().url().optional().or(z.literal('')),
  solutionUrl: z.string().url().optional().or(z.literal('')),
  code: z.string().optional(),
  videoLinks: z.array(z.string()).default([]),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  topics: z.array(DsaTopicEnum).default([]),
  personalRating: z.number().int().min(1).max(5).optional(),
  timeTaken: z.number().int().positive().optional(),
  mistakes: z.string().optional(),
  solvedAt: z.string().datetime().optional(),
});

export const updateDsaProblemSchema = createDsaProblemSchema.partial();

export const dsaQuerySchema = z.object({
  difficulty: DsaDifficultyEnum.optional(),
  platform: DsaPlatformEnum.optional(),
  topic: DsaTopicEnum.optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

export type CreateDsaProblemDto = z.infer<typeof createDsaProblemSchema>;
export type UpdateDsaProblemDto = z.infer<typeof updateDsaProblemSchema>;
