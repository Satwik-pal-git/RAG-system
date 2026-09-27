import mongoose, { Schema, Document } from 'mongoose';
import { Citation } from '../types';

export interface IChatMessage extends Document<string> {
  _id: string; // custom messageId
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  docFilterApplied?: string | null;
  citations?: Citation[];
  rating?: 'like' | 'dislike';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}


const CitationSchema = new Schema(
  {
    docId: { type: String, required: true },
    docName: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const ChatMessageSchema: Schema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      default: 'anonymous',
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    docFilterApplied: {
      type: String,
      default: null,
    },
    citations: [CitationSchema],
    rating: {
      type: String,
      enum: ['like', 'dislike'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    _id: false, // allow custom string _id
  }
);

export const ChatMessageModel = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
