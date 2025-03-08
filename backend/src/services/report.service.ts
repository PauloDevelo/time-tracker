import mongoose from 'mongoose';
import { TimeEntry } from '../models/TimeEntry';
import { Task } from '../models/Task';
import { Project } from '../models/Project';

/**
 * Get all available months that have time entries for a specific customer
 * @param customerId The customer ID to filter by
 * @param userId The user ID who owns the data
 * @returns Array of objects with year and month
 */
export const getAvailableMonths = async (
  customerId: string, 
  userId: string
): Promise<Array<{ year: number; month: number }>> => {
  try {
    // Find all projects belonging to the customer
    const projects = await Project.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      userId: new mongoose.Types.ObjectId(userId)
    }).select('_id');
    
    const projectIds = projects.map(project => project._id);
    
    // Find all tasks belonging to these projects
    const tasks = await Task.find({
      projectId: { $in: projectIds },
      userId: new mongoose.Types.ObjectId(userId)
    }).select('_id');
    
    const taskIds = tasks.map(task => task._id);
    
    // Aggregate time entries to get unique year-month combinations
    const monthsWithEntries = await TimeEntry.aggregate([
      {
        $match: {
          taskId: { $in: taskIds },
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $project: {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' }
        }
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month'
        }
      },
      {
        $sort: { year: -1, month: -1 }
      }
    ]);
    
    return monthsWithEntries;
  } catch (error) {
    console.error('Error getting available months:', error);
    throw error;
  }
}; 