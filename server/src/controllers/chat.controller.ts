import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ragService } from '../services/rag.service';
import { ApiResponse, ChatMessage, FeedbackDto } from '../types';

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

export const chatQuery = async (
  req: Request<{}, {}, { message: string; history: ChatMessage[] }>,
  res: Response<ApiResponse<{ response: string; citations: any[] }>>,
  next: NextFunction
) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Query message field is required.',
        timestamp: new Date().toISOString(),
      });
    }

    const start = Date.now();
    const result = await ragService.answerQuery(message, history || []);
    const duration = Date.now() - start;

    console.log(`[RAG Query] Completed in ${duration}ms.`);

    res.status(200).json({
      success: true,
      message: 'Query completed successfully.',
      data: {
        response: result.content,
        citations: result.citations,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const submitFeedback = async (
  req: Request<{}, {}, FeedbackDto>,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  try {
    const { messageId, rating } = req.body;

    if (!messageId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Both messageId and rating fields are mandatory.',
        timestamp: new Date().toISOString(),
      });
    }

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
