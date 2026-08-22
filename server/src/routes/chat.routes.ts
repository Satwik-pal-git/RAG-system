import { Router } from 'express';
import { chatQuery, submitFeedback } from '../controllers/chat.controller';

const router = Router();

router.post('/', chatQuery);
router.post('/feedback', submitFeedback);

export default router;
