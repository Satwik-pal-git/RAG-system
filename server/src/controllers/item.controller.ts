import { Request, Response, NextFunction } from 'express';
import { itemService } from '../services/item.service';
import { ApiResponse, Item, CreateItemDto, UpdateItemDto } from '../types';

export const getItems = async (
  req: Request,
  res: Response<ApiResponse<Item[]>>,
  next: NextFunction
) => {
  try {
    const { search, category, status } = req.query;
    const items = await itemService.getAll({
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      status: status ? String(status) : undefined,
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${items.length} items successfully`,
      data: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getItemById = async (
  req: Request,
  res: Response<ApiResponse<Item>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const item = await itemService.getById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: `Item with ID '${id}' was not found`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item retrieved successfully',
      data: item,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createItem = async (
  req: Request<{}, {}, CreateItemDto>,
  res: Response<ApiResponse<Item>>,
  next: NextFunction
) => {
  try {
    const { title, description, category, priority, status } = req.body;

    if (!title || !description || !category || !priority) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, category, and priority are mandatory',
        timestamp: new Date().toISOString(),
      });
    }

    const newItem = await itemService.create({
      title,
      description,
      category,
      priority,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: newItem,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (
  req: Request<{ id: string }, {}, UpdateItemDto>,
  res: Response<ApiResponse<Item>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updated = await itemService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Item with ID '${id}' was not found`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const deleted = await itemService.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Item with ID '${id}' was not found`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: `Item '${id}' deleted successfully`,
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const resetItems = async (
  req: Request,
  res: Response<ApiResponse<Item[]>>,
  next: NextFunction
) => {
  try {
    const items = await itemService.reset();
    res.status(200).json({
      success: true,
      message: 'Sample items reset to default state',
      data: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
