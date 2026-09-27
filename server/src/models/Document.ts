import mongoose, { Schema, Document } from 'mongoose';

export type DocumentStatus = 'processing' | 'indexed' | 'error';
export type DocumentType = 'pdf' | 'txt';

export interface IDocument extends Document<string> {
  _id: string; // custom docId
  userId?: string;
  name: string;
  size: number;
  type: DocumentType;
  chunkCount: number;
  status: DocumentStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}


const DocumentSchema: Schema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      index: true,
      default: 'anonymous',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'txt'],
      required: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'indexed', 'error'],
      default: 'processing',
      index: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    _id: false, // allow custom string _id
  }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
