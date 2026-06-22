import { PrismaClient, ProjectStatus, ProjectPriority, FeatureStatus } from '@prisma/client';
import { processArrayFields } from '../../utils/arrayHelper';

const prisma = new PrismaClient();

export const projectService = {
  // Get all projects for a user
  async getUserProjects(userId: string, status?: ProjectStatus) {
    const where: any = { userId };
    if (status) where.status = status;

    return prisma.project.findMany({
      where,
      include: {
        features: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
  },

  // Get single project
  async getProject(projectId: string, userId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        features: {
          orderBy: { order: 'asc' }
        }
      }
    });
  },

  // Create project
  async createProject(userId: string, data: any) {
    const { features, notes, ...rest } = data;

    // Only pass fields that exist in the Prisma schema
    const allowedFields = [
      'name', 'description', 'status', 'priority', 'startDate', 'endDate',
      'githubUrl', 'deploymentUrl', 'documentationUrl', 'blogUrl',
      'techStack', 'architectureNotes', 'currentMilestone', 'nextMilestone',
      'resumeBullets', 'interviewTalkingPoints', 'challengesSolved', 'keyLearnings',
      'commits', 'codingHours', 'deploymentCount', 'completionPercentage',
    ];

    const projectData: any = {};
    for (const key of allowedFields) {
      if (key in rest) projectData[key] = rest[key];
    }
    // Map 'notes' → 'architectureNotes' for backwards compat
    if (notes !== undefined) projectData.architectureNotes = notes;

    const arrayFields = ['techStack', 'resumeBullets', 'interviewTalkingPoints', 'challengesSolved', 'keyLearnings'];
    const processedData = processArrayFields(projectData, arrayFields);

    return prisma.project.create({
      data: {
        ...processedData,
        userId,
        features: features ? {
          create: features.map((f: any, idx: number) => ({
            name: f.name,
            description: f.description,
            status: f.status || 'PENDING',
            order: idx
          }))
        } : undefined
      },
      include: { features: true }
    });
  },

  // Update project
  async updateProject(projectId: string, userId: string, data: any) {
    const { features, notes, ...rest } = data;

    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });
    if (!existing) throw new Error('Project not found');

    // Sanitize to allowed fields only
    const allowedFields = [
      'name', 'description', 'status', 'priority', 'startDate', 'endDate',
      'githubUrl', 'deploymentUrl', 'documentationUrl', 'blogUrl',
      'techStack', 'architectureNotes', 'currentMilestone', 'nextMilestone',
      'resumeBullets', 'interviewTalkingPoints', 'challengesSolved', 'keyLearnings',
      'commits', 'codingHours', 'deploymentCount', 'completionPercentage',
    ];
    const projectData: any = {};
    for (const key of allowedFields) {
      if (key in rest) projectData[key] = rest[key];
    }
    if (notes !== undefined) projectData.architectureNotes = notes;

    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: projectData,
      include: {
        features: true
      }
    });

    return project;
  },

  // Delete project
  async deleteProject(projectId: string, userId: string) {
    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!existing) throw new Error('Project not found');

    return prisma.project.delete({
      where: { id: projectId }
    });
  },

  // Add feature to project
  async addFeature(projectId: string, userId: string, featureData: any) {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) throw new Error('Project not found');

    // Get current feature count for ordering
    const count = await prisma.projectFeature.count({
      where: { projectId }
    });

    return prisma.projectFeature.create({
      data: {
        ...featureData,
        projectId,
        order: count
      }
    });
  },

  // Update feature
  async updateFeature(featureId: string, userId: string, data: any) {
    // Verify ownership through project
    const feature = await prisma.projectFeature.findFirst({
      where: {
        id: featureId,
        project: { userId }
      }
    });

    if (!feature) throw new Error('Feature not found');

    return prisma.projectFeature.update({
      where: { id: featureId },
      data
    });
  },

  // Delete feature
  async deleteFeature(featureId: string, userId: string) {
    const feature = await prisma.projectFeature.findFirst({
      where: {
        id: featureId,
        project: { userId }
      }
    });

    if (!feature) throw new Error('Feature not found');

    return prisma.projectFeature.delete({
      where: { id: featureId }
    });
  },

  // Update project progress based on completed features
  async updateProjectProgress(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        features: true
      }
    });

    if (!project) throw new Error('Project not found');

    const totalFeatures = project.features.length;
    if (totalFeatures === 0) return project;

    const completedFeatures = project.features.filter(
      f => f.status === FeatureStatus.COMPLETED
    ).length;

    const completionPercentage = Math.round((completedFeatures / totalFeatures) * 100);

    return prisma.project.update({
      where: { id: projectId },
      data: { completionPercentage }
    });
  },

  // Bulk update features status
  async bulkUpdateFeatureStatus(
    featureIds: string[],
    userId: string,
    status: FeatureStatus
  ) {
    // Verify ownership
    const features = await prisma.projectFeature.findMany({
      where: {
        id: { in: featureIds },
        project: { userId }
      }
    });

    if (features.length !== featureIds.length) {
      throw new Error('Some features not found');
    }

    return prisma.projectFeature.updateMany({
      where: { id: { in: featureIds } },
      data: { status }
    });
  },

  // Get project statistics
  async getProjectStats(userId: string) {
    const [total, active, completed, onHold, ideas] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.project.count({ where: { userId, status: ProjectStatus.ACTIVE } }),
      prisma.project.count({ where: { userId, status: ProjectStatus.COMPLETED } }),
      prisma.project.count({ where: { userId, status: ProjectStatus.ON_HOLD } }),
      prisma.project.count({ where: { userId, status: ProjectStatus.IDEA } })
    ]);

    return {
      total,
      active,
      completed,
      onHold,
      ideas
    };
  }
};
