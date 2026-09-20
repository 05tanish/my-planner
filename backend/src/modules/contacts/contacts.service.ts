import { prisma } from '../../config/database';

export const contactsService = {
  // Create a new contact
  create: async (userId: string, data: any) => {
    return await prisma.contact.create({
      data: {
        userId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        linkedinUrl: data.linkedinUrl || null,
        whatsappNumber: data.whatsappNumber || null,
        role: data.role || null,
        company: data.company || null,
        relation: data.relation || null,
        notes: data.notes || null,
        source: data.source || null,
        lastContactedAt: data.lastContactedAt || null,
      },
    });
  },

  // List all contacts for a user with optional search/filter
  list: async (userId: string, query: any) => {
    const { search, relation, company } = query;

    const where: any = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (relation) {
      where.relation = relation;
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }

    return await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        jobs: {
          select: {
            id: true,
            company: true,
            role: true,
            status: true,
          },
        },
      },
    });
  },

  // Get a single contact
  getOne: async (userId: string, id: string) => {
    return await prisma.contact.findFirst({
      where: { id, userId },
      include: {
        jobs: {
          select: {
            id: true,
            company: true,
            role: true,
            status: true,
            appliedDate: true,
          },
          orderBy: { appliedDate: 'desc' },
        },
      },
    });
  },

  // Update a contact
  update: async (userId: string, id: string, data: any) => {
    return await prisma.contact.update({
      where: { id, userId },
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        linkedinUrl: data.linkedinUrl || null,
        whatsappNumber: data.whatsappNumber || null,
        role: data.role || null,
        company: data.company || null,
        relation: data.relation || null,
        notes: data.notes || null,
        source: data.source || null,
        lastContactedAt: data.lastContactedAt || null,
      },
    });
  },

  // Delete a contact
  remove: async (userId: string, id: string) => {
    return await prisma.contact.delete({
      where: { id, userId },
    });
  },

  // Check for duplicate contacts (by email, phone, or LinkedIn)
  checkDuplicate: async (userId: string, email?: string, phone?: string, linkedinUrl?: string) => {
    const conditions: any[] = [];

    if (email) {
      conditions.push({ email: { equals: email, mode: 'insensitive' } });
    }
    if (phone) {
      conditions.push({ phone });
    }
    if (linkedinUrl) {
      conditions.push({ linkedinUrl });
    }

    if (conditions.length === 0) {
      return null;
    }

    return await prisma.contact.findFirst({
      where: {
        userId,
        OR: conditions,
      },
    });
  },

  // Extract contact info from LinkedIn URL (basic placeholder for now)
  extractFromLinkedIn: async (linkedinUrl: string) => {
    // This is a placeholder - actual LinkedIn scraping is complex and may violate ToS
    // For now, we'll return a structure that can be manually filled
    // A real implementation would use LinkedIn API (requires OAuth) or a third-party service
    
    return {
      success: false,
      message: 'LinkedIn extraction requires manual input. Please fill the contact details.',
      data: {
        linkedinUrl,
        name: '',
        role: '',
        company: '',
      },
    };
  },
};
