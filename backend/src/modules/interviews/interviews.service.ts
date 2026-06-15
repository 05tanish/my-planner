import { PrismaClient, InterviewCategory, InterviewSubCategory, QuestionDifficulty } from '@prisma/client';
import { processArray } from '../../utils/arrayHelper';

const prisma = new PrismaClient();

export const interviewService = {
  // Get all interview questions
  async getQuestions(userId: string, filters?: {
    category?: InterviewCategory;
    subCategory?: InterviewSubCategory;
    difficulty?: QuestionDifficulty;
    tags?: string[];
    favorite?: boolean;
  }) {
    const where: any = { userId };

    if (filters?.category) where.category = filters.category;
    if (filters?.subCategory) where.subCategory = filters.subCategory;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.favorite !== undefined) where.isFavorite = filters.favorite;
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return prisma.interviewQuestion.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
  },

  // Get single question
  async getQuestion(questionId: string, userId: string) {
    return prisma.interviewQuestion.findFirst({
      where: { id: questionId, userId }
    });
  },

  // Create question
  async createQuestion(userId: string, data: any) {
    const { tags, ...rest } = data;
    
    return prisma.interviewQuestion.create({
      data: {
        ...rest,
        userId,
        tags: processArray(tags)
      }
    });
  },

  // Update question
  async updateQuestion(questionId: string, userId: string, data: any) {
    return prisma.interviewQuestion.update({
      where: { id: questionId, userId },
      data
    });
  },

  // Delete question
  async deleteQuestion(questionId: string, userId: string) {
    return prisma.interviewQuestion.delete({
      where: { id: questionId, userId }
    });
  },

  // Mark question as revised
  async markRevised(questionId: string, userId: string) {
    const question = await prisma.interviewQuestion.findFirst({
      where: { id: questionId, userId }
    });

    if (!question) throw new Error('Question not found');

    return prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        revisionCount: question.revisionCount + 1,
        lastRevisedAt: new Date()
      }
    });
  },

  // Toggle favorite
  async toggleFavorite(questionId: string, userId: string) {
    const question = await prisma.interviewQuestion.findFirst({
      where: { id: questionId, userId }
    });

    if (!question) throw new Error('Question not found');

    return prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        isFavorite: !question.isFavorite
      }
    });
  },

  // Get questions by category with counts
  async getQuestionsByCategory(userId: string) {
    const categories = await prisma.interviewQuestion.groupBy({
      by: ['category'],
      where: { userId },
      _count: true
    });

    return categories.map(cat => ({
      category: cat.category,
      count: cat._count
    }));
  },

  // Get questions due for revision (last revised > 7 days ago or never revised)
  async getDueForRevision(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return prisma.interviewQuestion.findMany({
      where: {
        userId,
        OR: [
          { lastRevisedAt: null },
          { lastRevisedAt: { lt: sevenDaysAgo } }
        ]
      },
      orderBy: { lastRevisedAt: 'asc' },
      take: 20
    });
  },

  // Search questions
  async searchQuestions(userId: string, query: string) {
    return prisma.interviewQuestion.findMany({
      where: {
        userId,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { shortAnswer: { contains: query, mode: 'insensitive' } },
          { detailedAnswer: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ]
      }
    });
  },

  // Get statistics
  async getStats(userId: string) {
    const [total, byCategory, byDifficulty, favorites, dueForRevision] = await Promise.all([
      prisma.interviewQuestion.count({ where: { userId } }),
      prisma.interviewQuestion.groupBy({
        by: ['category'],
        where: { userId },
        _count: true
      }),
      prisma.interviewQuestion.groupBy({
        by: ['difficulty'],
        where: { userId },
        _count: true
      }),
      prisma.interviewQuestion.count({ where: { userId, isFavorite: true } }),
      prisma.interviewQuestion.count({
        where: {
          userId,
          OR: [
            { lastRevisedAt: null },
            { lastRevisedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
          ]
        }
      })
    ]);

    return {
      total,
      byCategory,
      byDifficulty,
      favorites,
      dueForRevision
    };
  }
};
