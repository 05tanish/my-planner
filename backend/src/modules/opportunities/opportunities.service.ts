import { PrismaClient, OpportunityCategory, OpportunityStatus } from '@prisma/client';
import { processArray } from '../../utils/arrayHelper';

const prisma = new PrismaClient();


export const opportunityService = {
  async getAll(userId: string, filters?: {
    category?: OpportunityCategory;
    status?: OpportunityStatus;
  }) {
    const where: any = { userId };
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    return prisma.Opportunity.findMany({
      where,
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  },

  async getOne(id: string, userId: string) {
    return prisma.Opportunity.findFirst({
      where: { id, userId }
    });
  },

  async create(userId: string, data: any) {
    const { tags, ...rest } = data;
    return prisma.opportunity.create({
      data: { ...rest, userId, tags: processArray(tags) }
    });
  },

  async update(id: string, userId: string, data: any) {
    return prisma.opportunity.update({
      where: { id, userId },
      data
    });
  },

  async delete(id: string, userId: string) {
    return prisma.opportunity.delete({
      where: { id, userId }
    });
  },

  async getUpcoming(userId: string, days: number = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);

    return prisma.opportunity.findMany({
      where: {
        userId,
        deadline: {
          gte: new Date(),
          lte: future
        },
        status: { notIn: ['REJECTED', 'COMPLETED'] }
      },
      orderBy: { deadline: 'asc' }
    });
  },

  async getStats(userId: string) {
    const [total, byCategory, byStatus, upcoming] = await Promise.all([
      prisma.opportunity.count({ where: { userId } }),
      prisma.opportunity.groupBy({
        by: ['category'],
        where: { userId },
        _count: true
      }),
      prisma.opportunity.groupBy({
        by: ['status'],
        where: { userId },
        _count: true
      }),
      this.getUpcoming(userId, 30)
    ]);

    return {
      total,
      byCategory,
      byStatus,
      upcoming: upcoming.length
    };
  }
};
