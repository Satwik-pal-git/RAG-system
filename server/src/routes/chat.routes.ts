import { Router } from 'express';
import {
  chatQuery,
  submitFeedback,
  getChatSessions,
  createChatSession,
  getSessionMessages,
  deleteChatSession,
} from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all chat routes: only authenticated users can access sessions and chat queries
router.use(requireAuth);


// Session routes
router.get('/sessions', getChatSessions);
router.post('/sessions', createChatSession);
router.get('/sessions/:sessionId', getSessionMessages);
router.delete('/sessions/:sessionId', deleteChatSession);

// Chat & feedback routes
router.post('/', chatQuery);
router.post('/feedback', submitFeedback);

export default router;
