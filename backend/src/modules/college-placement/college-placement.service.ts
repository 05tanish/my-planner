import { prisma } from '../../config/database';
import { uploadFile, deleteFile } from '../../services/storage.service';
import type { PlacementStatus } from '@prisma/client';

interface CreateCollegePlacementDto {
  company: string;
  role: string;
  jobDescription?: string;
  location?: string;
  package?: string;
  status?: PlacementStatus;
  applicationDate?: Date;
  interviewDate?: Date;
  offerDate?: Date;
  notes?: string;
  rounds?: string[];
  skills?: string[];
  eligibilityCriteria?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface UpdateCollegePlacementDto {
  company?: string;
  role?: string;
  jobDescription?: string;
  location?: string;
  package?: string;
  status?: PlacementStatus;
  applicationDate?: Date;
  interviewDate?: Date;
  offerDate?: Date;
  notes?: string;
  rounds?: string[];
  skills?: string[];
  eligibilityCriteria?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export const collegePlacementService = {
  // Create a new college placement application
  async create(userId: string, data: CreateCollegePlacementDto, file?: Express.Multer.File) {
    try {
      const placementData: any = {
        userId,
        company: data.company,
        role: data.role,
        jobDescription: data.jobDescription,
        location: data.location,
        package: data.package,
        status: data.status || 'APPLIED',
        applicationDate: data.applicationDate || new Date(),
        interviewDate: data.interviewDate,
        offerDate: data.offerDate,
        notes: data.notes,
        rounds: data.rounds || [],
        skills: data.skills || [],
        eligibilityCriteria: data.eligibilityCriteria,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      };

      // Handle file upload via Supabase/local storage
      if (file && file.buffer) {
        try {
          const fileUrl = await uploadFile(file, 'resumes');
          placementData.resumeFileName = file.originalname;
          placementData.resumeFileUrl = fileUrl;
          placementData.resumePublicId = fileUrl; // Store URL as ID for deletion
          placementData.resumeFileSize = file.size;
          placementData.resumeMimeType = file.mimetype;
          placementData.resumeUploadedAt = new Date();
          console.log('✅ Resume uploaded successfully:', fileUrl);
        } catch (uploadError: any) {
          console.error('⚠️  Resume upload failed, saving placement without resume:', uploadError.message);
        }
      }

      return prisma.collegePlacement.create({
        data: placementData,
      });
    } catch (error) {
      console.error('Error creating college placement:', error);
      throw error;
    }
  },

  // List all college placement applications
  async list(userId: string, query: any) {
    const { status, company, search, sortBy = 'applicationDate', order = 'desc' } = query;

    const where: any = { userId };

    if (status) where.status = status;
    if (company) where.company = { contains: company, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { company: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.collegePlacement.findMany({
      where,
      orderBy: { [sortBy]: order },
    });
  },

  // Get a single college placement application
  async getOne(userId: string, id: string) {
    return prisma.collegePlacement.findFirst({
      where: { id, userId },
    });
  },

  // Update a college placement application
  async update(userId: string, id: string, data: UpdateCollegePlacementDto, file?: Express.Multer.File) {
    const existing = await prisma.collegePlacement.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('College placement not found');
    }

    const updateData: any = { ...data };

    // Handle file upload and delete old file if new one is uploaded
    if (file && file.buffer) {
      // Delete old file if it exists
      if (existing.resumeFileUrl) {
        try {
          await deleteFile(existing.resumeFileUrl);
        } catch (error) {
          console.error('Failed to delete old resume:', error);
        }
      }

      // Upload new file via Supabase/local storage
      try {
        const fileUrl = await uploadFile(file, 'resumes');
        updateData.resumeFileName = file.originalname;
        updateData.resumeFileUrl = fileUrl;
        updateData.resumePublicId = fileUrl;
        updateData.resumeFileSize = file.size;
        updateData.resumeMimeType = file.mimetype;
        updateData.resumeUploadedAt = new Date();
        console.log('✅ Resume updated successfully:', fileUrl);
      } catch (uploadError: any) {
        console.error('⚠️  Resume upload failed during update:', uploadError.message);
      }
    }

    return prisma.collegePlacement.update({
      where: { id },
      data: updateData,
    });
  },

  // Delete a college placement application
  async remove(userId: string, id: string) {
    const placement = await prisma.collegePlacement.findFirst({
      where: { id, userId },
    });

    if (!placement) {
      throw new Error('College placement not found');
    }

    // Delete resume from storage if it exists
    if (placement.resumeFileUrl) {
      try {
        await deleteFile(placement.resumeFileUrl);
      } catch (error) {
        console.error('Failed to delete resume from storage:', error);
      }
    }

    return prisma.collegePlacement.delete({
      where: { id },
    });
  },

  // Delete only the resume file
  async deleteResume(userId: string, id: string) {
    const placement = await prisma.collegePlacement.findFirst({
      where: { id, userId },
    });

    if (!placement) {
      throw new Error('College placement not found');
    }

    // Delete resume from storage if it exists
    if (placement.resumeFileUrl) {
      try {
        await deleteFile(placement.resumeFileUrl);
      } catch (error) {
        console.error('Failed to delete resume from storage:', error);
      }
    }

    return prisma.collegePlacement.update({
      where: { id },
      data: {
        resumeFileName: null,
        resumeFileUrl: null,
        resumePublicId: null,
        resumeFileSize: null,
        resumeMimeType: null,
        resumeUploadedAt: null,
      },
    });
  },

  // Get statistics
  async getStats(userId: string) {
    const placements = await prisma.collegePlacement.findMany({
      where: { userId },
    });

    const stats = {
      total: placements.length,
      byStatus: {} as Record<string, number>,
      withResume: placements.filter((p) => p.resumeFileUrl).length,
      upcomingInterviews: placements.filter(
        (p) => p.interviewDate && p.interviewDate > new Date()
      ).length,
    };

    placements.forEach((p) => {
      stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
    });

    return stats;
  },
};

