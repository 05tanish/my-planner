import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './resources.controller';

const router = Router();
router.use(authenticate);

// Folder routes
router.get('/folders', c.listFolders);
router.post('/folders', c.createFolder);
router.post('/folders/reorder', c.reorderFolders);
router.patch('/folders/:id', c.updateFolder);
router.delete('/folders/:id', c.deleteFolder);

// Resource routes
router.get('/', c.listResources);
router.post('/', c.createResource);
router.post('/reorder', c.reorderResources);
router.get('/:id', c.getOneResource);
router.patch('/:id', c.updateResource);
router.delete('/:id', c.removeResource);

export default router;
