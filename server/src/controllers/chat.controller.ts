import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ragService } from '../services/rag.service';
import { ApiResponse, ChatMessage, FeedbackDto } from '../types';
import { ChatSessionModel, ChatMessageModel } from '../models';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(__dirname, '../../../data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedbacks.json');

const loadFeedbacks = (): Record<string, 'like' | 'dislike'> => {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[Feedback] Error reading feedback file:', err);
  }
  return {};
};

const saveFeedback = (messageId: string, rating: 'like' | 'dislike') => {
  try {
    const feedbacks = loadFeedbacks();
    feedbacks[messageId] = rating;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Feedback] Error saving feedback:', err);
  }
};

// 1. Get all chat sessions strictly for authenticated user
export const getChatSessions = async (
  req: Request,
  res: Response<ApiResponse<any[]>>,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to access chat sessions.',
        timestamp: new Date().toISOString(),
      });
    }

    const sessions = await ChatSessionModel.find({ userId })
      .sort({ lastMessageAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: `Retrieved ${sessions.length} sessions.`,
      data: sessions.map((s) => ({
        id: s._id,
        title: s.title,
        selectedDocId: s.selectedDocId,
        messageCount: s.messageCount,
        lastMessageAt: s.lastMessageAt,
        createdAt: s.createdAt,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create a new chat session strictly for authenticated user
export const createChatSession = async (
  req: Request<{}, {}, { title?: string; selectedDocId?: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to create a chat session.',
        timestamp: new Date().toISOString(),
      });
    }

    const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const title = req.body.title || 'New Conversation';
    const selectedDocId = req.body.selectedDocId || null;

    const session = await ChatSessionModel.create({
      _id: sessionId,
      userId,
      title,
      selectedDocId,
      messageCount: 0,
      lastMessageAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Chat session created successfully.',
      data: {
        id: session._id,
        title: session.title,
        selectedDocId: session.selectedDocId,
        messageCount: session.messageCount,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get all messages for a specific session strictly belonging to authenticated user
export const getSessionMessages = async (
  req: Request<{ sessionId: string }>,
  res: Response<ApiResponse<ChatMessage[]>>,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    // Verify session belongs to user
    const session = await ChatSessionModel.findOne({ _id: sessionId, userId }).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Conversation session not found or access denied.',
        timestamp: new Date().toISOString(),
      });
    }

    const messages = await ChatMessageModel.find({ sessionId, userId })
      .sort({ timestamp: 1 })
      .lean();

    const formattedMessages: ChatMessage[] = messages.map((m: any) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      citations: m.citations || [],
      rating: m.rating,
      timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
    }));

    res.status(200).json({
      success: true,
      message: `Retrieved ${formattedMessages.length} messages.`,
      data: formattedMessages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete a chat session strictly belonging to authenticated user
export const deleteChatSession = async (
  req: Request<{ sessionId: string }>,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    const deleted = await ChatSessionModel.deleteOne({ _id: sessionId, userId });
    if (deleted.deletedCount > 0) {
      await ChatMessageModel.deleteMany({ sessionId, userId });
    }

    res.status(200).json({
      success: true,
      message: 'Chat session and messages deleted successfully.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// 5. Send chat query strictly scoped to authenticated user and filtered file
export const chatQuery = async (
  req: Request<
    {},
    {},
    {
      message: string;
      sessionId?: string;
      selectedDocId?: string | null;
      history?: ChatMessage[];
    }
  >,
  res: Response<ApiResponse<{ response: string; citations: any[]; sessionId: string }>>,
  next: NextFunction
) => {
  try {
    const { message, selectedDocId } = req.body;
    let { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to perform queries.',
        timestamp: new Date().toISOString(),
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query message field is required.',
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure session exists or auto-create it
    let isNewSession = false;
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      isNewSession = true;
    }

    const sessionTitle =
      message.length > 35 ? `${message.slice(0, 35)}...` : message;

    try {
      if (isNewSession) {
        await ChatSessionModel.create({
          _id: sessionId,
          userId,
          title: sessionTitle,
          selectedDocId: selectedDocId || null,
          messageCount: 0,
          lastMessageAt: new Date(),
        });
      }
    } catch {
      // Continue even if DB create encounters temporary issues
    }

    // Load past message history from DB if not provided
    let history = req.body.history || [];
    if (history.length === 0 && sessionId && !isNewSession) {
      try {
        const pastDocs = await ChatMessageModel.find({ sessionId, userId })
          .sort({ timestamp: 1 })
          .limit(10)
          .lean();
        history = pastDocs.map((m: any) => ({
          id: m._id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
        }));
      } catch {
        // Fallback to empty history
      }
    }

    // Save User message to MongoDB
    const userMsgId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    try {
      await ChatMessageModel.create({
        _id: userMsgId,
        sessionId,
        userId,
        role: 'user',
        content: message.trim(),
        docFilterApplied: selectedDocId || null,
        timestamp: new Date(),
      });
    } catch {
      // Continue
    }

    // Execute semantic search & completion strictly isolated to this user & optional docId
    const start = Date.now();
    const result = await ragService.answerQuery(message, history, {
      userId,
      docId: selectedDocId || undefined,
    });
    const duration = Date.now() - start;
    console.log(
      `[RAG Query] User "${userId}" completed query in ${duration}ms (Doc filter: ${
        selectedDocId || 'All User Docs'
      }).`
    );

    // Save Assistant message to MongoDB
    const assistantMsgId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    try {
      await ChatMessageModel.create({
        _id: assistantMsgId,
        sessionId,
        userId,
        role: 'assistant',
        content: result.content,
        citations: result.citations,
        docFilterApplied: selectedDocId || null,
        timestamp: new Date(),
      });

      // Update session statistics
      await ChatSessionModel.findOneAndUpdate(
        { _id: sessionId, userId },
        {
          $inc: { messageCount: 2 },
          $set: {
            lastMessageAt: new Date(),
            ...(selectedDocId ? { selectedDocId } : {}),
          },
        }
      );
    } catch {
      // Continue
    }

    res.status(200).json({
      success: true,
      message: 'Query completed successfully.',
      data: {
        response: result.content,
        citations: result.citations,
        sessionId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// 6. Submit feedback rating for a message
export const submitFeedback = async (
  req: Request<{}, {}, FeedbackDto>,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  try {
    const { messageId, rating } = req.body;
    const userId = req.user?.id;

    if (!messageId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Both messageId and rating fields are mandatory.',
        timestamp: new Date().toISOString(),
      });
    }

    // Save to MongoDB
    try {
      await ChatMessageModel.findOneAndUpdate(
        { _id: messageId, ...(userId ? { userId } : {}) },
        { $set: { rating } }
      );
    } catch {
      // Fallback
    }

    // Save to local feedback file
    saveFeedback(messageId, rating);

    res.status(200).json({
      success: true,
      message: 'Feedback submitted and logged successfully.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
