import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import * as c from './profile.controller';

const router = Router();
router.use(authenticate);

router.get('/', c.getProfile);
router.patch('/', c.updateProfile);
router.post('/logo', uploadSingle('logo'), c.uploadLogo);
router.post('/telegram-link-pin', c.generateTelegramLinkPin);

export default router;
