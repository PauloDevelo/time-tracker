import mongoose from 'mongoose';
import { ITimeEntry, TimeEntry } from '../models/TimeEntry';
import { ITask, Task } from '../models/Task';
import { IProject, Project } from '../models/Project';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { Report, ProjectTimeData, TaskTimeData } from '../models/Report';
import { ReportSummary } from '../models/ReportDto';

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

/**
 * Generate a report for a customer for a specific month and year
 * @param customerId The customer ID to generate the report for
 * @param year The year for the report
 * @param month The month for the report (1-12)
 * @param reportType The type of report ('timesheet' or 'invoice')
 * @param userId The user ID who is generating the report
 * @returns The summary of the generated report
 */
export const generateReport = async (
  customerId: string,
  year: number,
  month: number,
  reportType: 'timesheet' | 'invoice',
  userId: string
): Promise<ReportSummary> => {
  try {
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new Error('Invalid customer ID');
    }
    
    if (year < 2000 || year > 2100) {
      throw new Error('Invalid year');
    }
    
    if (month < 1 || month > 12) {
      throw new Error('Invalid month');
    }
    
    // Get customer details
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate start and end dates for the report
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    
    // Find all projects belonging to the customer
    const projects = await Project.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    const projectIds = projects.map(project => project._id);
    
    // Find all tasks belonging to these projects
    const tasks = await Task.find({
      projectId: { $in: projectIds },
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    // Group tasks by project
    const tasksByProject = new Map<string, mongoose.Types.ObjectId[]>();
    for (const task of tasks) {
      const projectId = task.projectId.toString();
      if (!tasksByProject.has(projectId)) {
        tasksByProject.set(projectId, []);
      }
      tasksByProject.get(projectId)?.push(task._id);
    }
    
    // Create a map of tasks for quick lookup
    const tasksMap = new Map<string, (mongoose.Document<unknown, {}, ITask> & ITask & { _id: mongoose.Types.ObjectId; })>();
    for (const task of tasks) {
      tasksMap.set(task._id.toString(), task);
    }
    
    // Create a map of projects for quick lookup
    const projectsMap = new Map<string, (mongoose.Document<unknown, {}, IProject> & IProject & { _id: mongoose.Types.ObjectId; })>();
    for (const project of projects) {
      projectsMap.set(project._id.toString(), project);
    }
    
    // Find time entries within the date range for the tasks
    const timeEntries = await TimeEntry.find({
      taskId: { $in: tasks.map(task => task._id) },
      userId: new mongoose.Types.ObjectId(userId),
      startTime: { $gte: startDate, $lte: endDate }
    }).sort({ startTime: 1 });
    
    // Process time entries and calculate totals
    const reportData: ProjectTimeData[] = [];
    let totalHours = 0;
    let totalCost = 0;
    
    // Group entries by project and task
    const entriesByTask = new Map<string, (mongoose.Document<unknown, {}, ITimeEntry> & ITimeEntry & { _id: mongoose.Types.ObjectId; })[]>();
    for (const entry of timeEntries) {
      const taskId = entry.taskId.toString();
      if (!entriesByTask.has(taskId)) {
        entriesByTask.set(taskId, []);
      }
      entriesByTask.get(taskId)?.push(entry);
    }
    
    // Process projects
    for (const project of projects) {
      const projectId = project._id.toString();
      const projectTasks = tasks.filter(task => task.projectId.toString() === projectId);
      
      if (projectTasks.length === 0) {
        continue;
      }
      
      const projectData: ProjectTimeData = {
        projectId: project._id,
        totalHours: 0,
        tasks: [],
        totalCost: reportType === 'invoice' ? 0 : undefined
      };
      
      // Process tasks for this project
      for (const task of projectTasks) {
        const taskId = task._id.toString();
        const taskEntries = entriesByTask.get(taskId) || [];
        
        if (taskEntries.length === 0) {
          continue;
        }
        
        const taskData: TaskTimeData = {
          taskId: task._id,
          totalHours: 0,
          totalCost: reportType === 'invoice' ? 0 : undefined
        };
        
        // Process entries for this task
        for (const entry of taskEntries) {
          const duration = entry.totalDurationInHour;
          let cost: number | undefined = undefined;
          
          if (reportType === 'invoice') {
            // Calculate cost based on daily rate and duration
            const hourlyRate = customer.billingDetails.dailyRate / 8; // Assuming 8-hour workday
            cost = hourlyRate * duration;
            
            if (taskData.totalCost !== undefined) {
              taskData.totalCost += cost;
            }
            
            if (projectData.totalCost !== undefined) {
              projectData.totalCost += cost;
            }
            
            totalCost += cost;
          }
          
          taskData.totalHours += duration;
          projectData.totalHours += duration;
          totalHours += duration;
        }
        
        if (taskData.totalHours > 0) {
          projectData.tasks.push(taskData);
        }
      }
      
      if (projectData.tasks.length > 0) {
        reportData.push(projectData);
      }
    }
    
    // Calculate the number of working days in the month
    const workingDays = calculateWorkingDays(startDate, endDate);
    
    // Create and save the report
    const report = new Report({
      reportType,
      customerId: customer._id,
      userId: user._id,
      generationDate: new Date(),
      period: {
        year,
        month,
        startDate,
        endDate
      },
      summary: {
        totalDays: workingDays,
        totalHours,
        totalCost: reportType === 'invoice' ? totalCost : undefined
      },
      projects: reportData
    });
    
    await report.save();
    
    // Format the response
    const reportSummary: ReportSummary = {
      reportId: report._id.toString(),
      reportType: report.reportType,
      customerName: customer.name,
      customerAddress: customer.contactInfo.address,
      userFullName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      generationDate: report.generationDate,
      startDate: report.period.startDate,
      endDate: report.period.endDate,
      totalDays: report.summary.totalDays,
      totalHours: report.summary.totalHours,
      totalCost: report.summary.totalCost,
      projects: report.projects.map(project => ({
        projectId: project.projectId.toString(),
        projectName: projectsMap.get(project.projectId.toString())?.name || '',
        totalHours: project.totalHours,
        totalCost: project.totalCost,
        tasks: project.tasks.map(task => ({
          taskId: task.taskId.toString(),
          taskName: tasksMap.get(task.taskId.toString())?.name || '',
          totalHours: task.totalHours,
          totalCost: task.totalCost,
        }))
      }))
    };
    
    return reportSummary;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

/**
 * Helper function to calculate the number of working days between two dates
 * @param startDate The start date
 * @param endDate The end date
 * @returns The number of working days
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
} 