import mongoose, { Schema, Document } from 'mongoose';

export interface IChatSession extends Document<string> {
  _id: string; // custom sessionId
  userId: string;
  title: string;
  selectedDocId?: string | null;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}


const ChatSessionSchema: Schema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      default: 'anonymous',
    },
    title: {
      type: String,
      required: true,
      default: 'New Conversation',
      trim: true,
    },
    selectedDocId: {
      type: String,
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
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

export const ChatSessionModel = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
