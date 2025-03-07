import { Response } from 'express';
import { TimeEntry } from '../models/TimeEntry';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Start a new time entry on a task using current UTC time
export const startTimeEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const userId = req.user._id;

    // Convert timeEntryId to ObjectId
    const timeEntryObjectId = new mongoose.Types.ObjectId(timeEntryId);

    // Check if there's already an in-progress time entry for this user
    const timeEntry = await TimeEntry.findOne({ 
        userId, 
        _id: timeEntryObjectId,
    });

    if (!timeEntry) {
        return res.status(404).json({ message: 'Time entry not found' });
    }

    // Check if there's already an in-progress time entry for this user
    const existingInProgress = await TimeEntry.findOne({ 
      userId, 
      startProgressTime: { $ne: null } 
    });

    if (existingInProgress) {
      return res.status(400).json({ 
        message: 'You already have a time entry in progress',
        existingEntry: existingInProgress
      });
    }
    
    const now = new Date();
    timeEntry.startProgressTime = now;
    
    await timeEntry.save();
    return res.status(201).json(timeEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to start time entry', error });
  }
};

// Stop an existing time entry
export const stopTimeEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const userId = req.user._id;

    const timeEntry = await TimeEntry.findOne({ 
      _id: timeEntryId,
      userId
    });

    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    if (!timeEntry.startProgressTime) {
      return res.status(400).json({ message: 'Time entry is not in progress' });
    }

    // Calculate duration in hours
    const now = new Date();
    const durationInMs = now.getTime() - timeEntry.startProgressTime.getTime();
    const durationInHours = durationInMs / (1000 * 60 * 60);
    
    // Update time entry
    timeEntry.totalDurationInHour += durationInHours;
    timeEntry.startProgressTime = undefined;
    
    await timeEntry.save();
    return res.json(timeEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to stop time entry', error });
  }
};

// Add a new time entry manually
export const createTimeEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startTime, totalDurationInHour, taskId } = req.body;
    const userId = req.user._id;

    const timeEntry = new TimeEntry({
      startTime,
      totalDurationInHour,
      startProgressTime: undefined,
      taskId,
      userId
    });

    await timeEntry.save();
    return res.status(201).json(timeEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create time entry', error });
  }
};

// Update a time entry
export const updateTimeEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    // If setting an entry to in-progress, check if another is already in progress
    if (updates.startProgressTime) {
        return res.status(400).json({ 
            message: 'Use the endpoints stop and start to manage in-progress entries',
        });
    }

    const timeEntry = await TimeEntry.findOneAndUpdate(
      { _id: timeEntryId, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    return res.json(timeEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update time entry', error });
  }
};

// Delete a time entry
export const deleteTimeEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const userId = req.user._id;

    const result = await TimeEntry.findOneAndDelete({ _id: timeEntryId, userId });

    if (!result) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    return res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete time entry', error });
  }
};

// Get time entries with filtering
export const getTimeEntries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { 
      taskId, 
      startDate, 
      endDate, 
      inProgressOnly, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build query
    const query: any = { userId };

    if (taskId) {
      query.taskId = new mongoose.Types.ObjectId(taskId as string);
    }

    // Date range filter
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate as string);
      if (endDate) query.startTime.$lte = new Date(endDate as string);
    }

    // In progress filter
    if (inProgressOnly === 'true') {
      query.startProgressTime = { $ne: null };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const timeEntries = await TimeEntry.find(query)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await TimeEntry.countDocuments(query);

    res.json({
      timeEntries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve time entries', error });
  }
};