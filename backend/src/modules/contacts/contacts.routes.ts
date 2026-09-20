import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { contactsController } from './contacts.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Contact CRUD
router.post('/', contactsController.create);
router.get('/', contactsController.list);
router.get('/check-duplicate', contactsController.checkDuplicate);
router.post('/extract-linkedin', contactsController.extractFromLinkedIn);
router.get('/:id', contactsController.getOne);
router.put('/:id', contactsController.update);
router.delete('/:id', contactsController.remove);

export default router;
