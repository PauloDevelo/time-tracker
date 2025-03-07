import { Task, ITask } from '../models/Task';
import mongoose from 'mongoose';

/**
 * Creates a new task
 */
export const createTask = async (taskData: Omit<ITask, '_id' | 'createdAt' | 'updatedAt'>): Promise<ITask> => {
  try {
    const newTask = new Task(taskData);
    return await newTask.save();
  } catch (error) {
    throw new Error(`Error creating task: ${error.message}`);
  }
};

/**
 * Gets all tasks with optional filtering
 */
export const getTasks = async (
  filter: {
    userId?: mongoose.Types.ObjectId;
    projectId?: mongoose.Types.ObjectId;
  } = {},
  options: {
    page?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
  } = {}
): Promise<{ tasks: ITask[]; total: number; page: number; limit: number }> => {
  try {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const tasks = await Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(filter);

    return {
      tasks,
      total,
      page,
      limit
    };
  } catch (error) {
    throw new Error(`Error getting tasks: ${error.message}`);
  }
};

/**
 * Gets a task by ID
 */
export const getTaskById = async (taskId: string, userId: mongoose.Types.ObjectId): Promise<ITask | null> => {
  try {
    return await Task.findOne({ _id: taskId, userId });
  } catch (error) {
    throw new Error(`Error getting task by ID: ${error.message}`);
  }
};

/**
 * Updates a task
 */
export const updateTask = async (
  taskId: string,
  userId: mongoose.Types.ObjectId,
  updates: Partial<Omit<ITask, '_id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<ITask | null> => {
  try {
    return await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error(`Error updating task: ${error.message}`);
  }
};

/**
 * Deletes a task
 */
export const deleteTask = async (taskId: string, userId: mongoose.Types.ObjectId): Promise<boolean> => {
  try {
    const result = await Task.deleteOne({ _id: taskId, userId });
    return result.deletedCount > 0;
  } catch (error) {
    throw new Error(`Error deleting task: ${error.message}`);
  }
};