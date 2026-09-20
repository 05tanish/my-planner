import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { contactsService } from './contacts.service';

export const contactsController = {
  // Create a new contact
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const contact = await contactsService.create(userId, req.body);
      res.status(201).json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  },

  // List all contacts
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const contacts = await contactsService.list(userId, req.query);
      res.json({ success: true, data: contacts });
    } catch (error) {
      next(error);
    }
  },

  // Get a single contact
  getOne: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const contactId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const contact = await contactsService.getOne(userId, contactId);
      
      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contact not found' });
      }

      res.json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  },

  // Update a contact
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const contactId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const contact = await contactsService.update(userId, contactId, req.body);
      res.json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  },

  // Delete a contact
  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const contactId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await contactsService.remove(userId, contactId);
      res.json({ success: true, message: 'Contact deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Check for duplicate contacts
  checkDuplicate: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { email, phone, linkedinUrl } = req.query;
      
      const duplicate = await contactsService.checkDuplicate(
        userId,
        email as string | undefined,
        phone as string | undefined,
        linkedinUrl as string | undefined
      );

      res.json({ success: true, hasDuplicate: !!duplicate, data: duplicate });
    } catch (error) {
      next(error);
    }
  },

  // Extract contact from LinkedIn URL
  extractFromLinkedIn: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { linkedinUrl } = req.body;

      if (!linkedinUrl) {
        return res.status(400).json({ success: false, message: 'LinkedIn URL is required' });
      }

      const result = await contactsService.extractFromLinkedIn(linkedinUrl);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
