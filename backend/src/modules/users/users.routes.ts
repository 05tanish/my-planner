import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as usersController from './users.controller';

const router = Router();

// Protect all routes with Auth and Admin role requirement
router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', usersController.list);
router.post('/', usersController.create);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.remove);

export default router;
