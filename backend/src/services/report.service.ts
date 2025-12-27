import mongoose from 'mongoose';
import { ITimeEntry, TimeEntry } from '../models/TimeEntry';
import { ITask, Task } from '../models/Task';
import { IProject, Project } from '../models/Project';
import { Customer } from '../models/Customer';
import { Contract, IContract } from '../models/Contract';
import { User } from '../models/User';
import { Report, ContractTimeData, ProjectTimeData, TaskTimeData } from '../models/Report';
import { ReportSummary } from '../models/ReportDto';

/**
 * Interface for contract billing configuration
 */
export interface IContractBilling {
  dailyRate: number;
  currency: string;
}

/**
 * Interface for customer billing details
 */
export interface IBillingDetails {
  dailyRate: number;
  currency?: string;
}

/**
 * Determines the daily rate to use for billing calculations.
 * Uses contract's rate if available, otherwise falls back to customer's rate.
 * 
 * @param contractBilling The contract's billing configuration (if project has a contract)
 * @param customerBillingDetails The customer's billing details
 * @returns The daily rate to use for calculations
 */
export function getDailyRate(
  contractBilling: IContractBilling | undefined | null,
  customerBillingDetails: IBillingDetails
): number {
  return contractBilling?.dailyRate ?? customerBillingDetails.dailyRate;
}

/**
 * Calculates the hourly rate from a daily rate.
 * Assumes an 8-hour workday.
 * 
 * @param dailyRate The daily rate
 * @returns The hourly rate (dailyRate / 8)
 */
export function getHourlyRate(dailyRate: number): number {
  return dailyRate / 8;
}

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
    const tasksMap = new Map<string, (mongoose.Document<unknown, object, ITask> & ITask & { _id: mongoose.Types.ObjectId; })>();
    for (const task of tasks) {
      tasksMap.set(task._id.toString(), task);
    }
    
    // Create a map of projects for quick lookup
    const projectsMap = new Map<string, (mongoose.Document<unknown, object, IProject> & IProject & { _id: mongoose.Types.ObjectId; })>();
    for (const project of projects) {
      projectsMap.set(project._id.toString(), project);
    }
    
    // Fetch contracts for projects that have contractId
    const contractIds = projects
      .filter(p => p.contractId)
      .map(p => p.contractId as mongoose.Types.ObjectId);
    
    const contracts = contractIds.length > 0
      ? await Contract.find({ _id: { $in: contractIds } })
      : [];
    
    // Create a map of contracts for quick lookup
    const contractsMap = new Map<string, (mongoose.Document<unknown, object, IContract> & IContract & { _id: mongoose.Types.ObjectId; })>();
    for (const contract of contracts) {
      contractsMap.set(contract._id.toString(), contract);
    }
    
    // Find time entries within the date range for the tasks
    const timeEntries = await TimeEntry.find({
      taskId: { $in: tasks.map(task => task._id) },
      userId: new mongoose.Types.ObjectId(userId),
      startTime: { $gte: startDate, $lte: endDate }
    }).sort({ startTime: 1 });
    
    // Process time entries and calculate totals
    let totalHours = 0;
    let totalCost = 0;
    
    // Group entries by task
    const entriesByTask = new Map<string, (mongoose.Document<unknown, object, ITimeEntry> & ITimeEntry & { _id: mongoose.Types.ObjectId; })[]>();
    for (const entry of timeEntries) {
      const taskId = entry.taskId.toString();
      if (!entriesByTask.has(taskId)) {
        entriesByTask.set(taskId, []);
      }
      entriesByTask.get(taskId)?.push(entry);
    }
    
    // Group projects by contract
    const projectsByContract = new Map<string, (mongoose.Document<unknown, object, IProject> & IProject & { _id: mongoose.Types.ObjectId; })[]>();
    const NO_CONTRACT_KEY = '__no_contract__';
    
    for (const project of projects) {
      const contractKey = project.contractId ? project.contractId.toString() : NO_CONTRACT_KEY;
      if (!projectsByContract.has(contractKey)) {
        projectsByContract.set(contractKey, []);
      }
      projectsByContract.get(contractKey)?.push(project);
    }
    
    // Process contracts
    const contractsData: ContractTimeData[] = [];
    
    for (const [contractKey, contractProjects] of projectsByContract) {
      const contract = contractKey !== NO_CONTRACT_KEY
        ? contractsMap.get(contractKey)
        : undefined;
      
      // Determine billing info for this contract group
      const dailyRate = contract?.dailyRate ?? customer.billingDetails.dailyRate;
      const currency = contract?.currency ?? customer.billingDetails.currency ?? 'EUR';
      
      const contractData: ContractTimeData = {
        contractId: contract ? contract._id : null,
        contractName: contract?.name ?? 'No Contract',
        dailyRate,
        currency,
        totalHours: 0,
        totalCost: reportType === 'invoice' ? 0 : undefined,
        projects: []
      };
      
      // Process projects for this contract
      for (const project of contractProjects) {
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
            
            if (reportType === 'invoice') {
              const hourlyRate = getHourlyRate(dailyRate);
              const cost = hourlyRate * duration;
              
              if (taskData.totalCost !== undefined) {
                taskData.totalCost += cost;
              }
              
              if (projectData.totalCost !== undefined) {
                projectData.totalCost += cost;
              }
              
              if (contractData.totalCost !== undefined) {
                contractData.totalCost += cost;
              }
              
              totalCost += cost;
            }
            
            taskData.totalHours += duration;
            projectData.totalHours += duration;
            contractData.totalHours += duration;
            totalHours += duration;
          }
          
          if (taskData.totalHours > 0) {
            projectData.tasks.push(taskData);
          }
        }
        
        if (projectData.tasks.length > 0) {
          contractData.projects.push(projectData);
        }
      }
      
      if (contractData.projects.length > 0) {
        contractsData.push(contractData);
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
      contracts: contractsData
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
      contracts: report.contracts.map(contract => ({
        contractId: contract.contractId ? contract.contractId.toString() : null,
        contractName: contract.contractName,
        dailyRate: contract.dailyRate,
        currency: contract.currency,
        totalHours: contract.totalHours,
        totalCost: contract.totalCost,
        projects: contract.projects.map(project => ({
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