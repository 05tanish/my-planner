import { PrismaClient, HackathonStatus } from '@prisma/client';
import { processArray } from '../../utils/arrayHelper';

const prisma = new PrismaClient();

export const hackathonService = {
  async getAll(userId: string, status?: HackathonStatus) {
    const where: any = { userId };
    if (status) where.status = status;

    return prisma.hackathon.findMany({
      where,
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  },

  async getOne(id: string, userId: string) {
    return prisma.hackathon.findFirst({
      where: { id, userId }
    });
  },

  async create(userId: string, data: any) {
    const { teamMembers, techStack, ...rest } = data;
    return prisma.hackathon.create({
      data: { 
        ...rest, 
        userId,
        teamMembers: processArray(teamMembers),
        techStack: processArray(techStack)
      }
    });
  },

  async update(id: string, userId: string, data: any) {
    return prisma.hackathon.update({
      where: { id, userId },
      data
    });
  },

  async delete(id: string, userId: string) {
    return prisma.hackathon.delete({
      where: { id, userId }
    });
  },

  async getUpcoming(userId: string) {
    return prisma.hackathon.findMany({
      where: {
        userId,
        status: { in: ['REGISTERED', 'BUILDING'] },
        deadline: { gte: new Date() }
      },
      orderBy: { deadline: 'asc' }
    });
  },

  async getStats(userId: string) {
    const [total, registered, building, submitted, won] = await Promise.all([
      prisma.hackathon.count({ where: { userId } }),
      prisma.hackathon.count({ where: { userId, status: 'REGISTERED' } }),
      prisma.hackathon.count({ where: { userId, status: 'BUILDING' } }),
      prisma.hackathon.count({ where: { userId, status: 'SUBMITTED' } }),
      prisma.hackathon.count({ where: { userId, status: 'WON' } })
    ]);

    return { total, registered, building, submitted, won };
  }
};
