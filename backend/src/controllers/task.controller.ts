import { Response } from 'express';
import mongoose from 'mongoose';
import * as taskService from '../services/task.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const taskData = { ...req.body, userId };
    
    const newTask = await taskService.createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { projectId, page, limit } = req.query;
    
    const filter: any = { userId };
    if (projectId) filter.projectId = new mongoose.Types.ObjectId(projectId as string);
    
    const options = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10
    };
    
    const result = await taskService.getTasks(filter, options);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTaskById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    const task = await taskService.getTaskById(id, userId);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    res.status(200).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const updates = req.body;
    
    const updatedTask = await taskService.updateTask(id, userId, updates);
    if (!updatedTask) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    const deleted = await taskService.deleteTask(id, userId);
    if (!deleted) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};