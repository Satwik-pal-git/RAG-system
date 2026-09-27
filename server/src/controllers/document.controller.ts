import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';
import { ApiResponse, Document } from '../types';

export const getDocuments = async (
  req: Request,
  res: Response<ApiResponse<Document[]>>,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to view documents.',
        timestamp: new Date().toISOString(),
      });
    }

    const docs = await documentService.getAll(userId);
    res.status(200).json({
      success: true,
      message: `Retrieved ${docs.length} documents successfully`,
      data: docs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (
  req: Request,
  res: Response<ApiResponse<Document>>,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to upload documents.',
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please attach a PDF or TXT file.',
        timestamp: new Date().toISOString(),
      });
    }

    const doc = await documentService.ingestFile(
      {
        originalname: req.file.originalname,
        buffer: req.file.buffer,
        size: req.file.size,
      },
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Document uploaded and indexed successfully.',
      data: doc,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to delete documents.',
        timestamp: new Date().toISOString(),
      });
    }

    const deleted = await documentService.delete(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Document with ID '${id}' not found or access denied.`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: `Document '${id}' and associated vectors deleted successfully.`,
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const resetDocumentStore = async (
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to reset documents.',
        timestamp: new Date().toISOString(),
      });
    }

    await documentService.reset(userId);
    res.status(200).json({
      success: true,
      message: 'Knowledge base cleared successfully.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
