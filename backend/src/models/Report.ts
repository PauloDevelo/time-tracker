import mongoose, { Document, Schema } from 'mongoose';

// Define the task time data for reports
export interface TaskTimeData {
  taskId: mongoose.Types.ObjectId;
  totalHours: number;
  totalCost?: number; // Only for invoice reports
}

// Define the project time data for reports
export interface ProjectTimeData {
  projectId: mongoose.Types.ObjectId;
  totalHours: number;
  tasks: TaskTimeData[];
  totalCost?: number; // Only for invoice reports
}

// Define the main report interface
export interface IReport extends Document {
  reportType: 'timesheet' | 'invoice';
  customerId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  generationDate: Date;
  period: {
    year: number;
    month: number;
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalDays: number;
    totalHours: number;
    totalCost?: number; // Only for invoice reports
  };
  projects: ProjectTimeData[];
  createdAt: Date;
  updatedAt: Date;
}

// Create the Report schema
const reportSchema = new Schema<IReport>(
  {
    reportType: {
      type: String,
      enum: ['timesheet', 'invoice'],
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    period: {
      year: {
        type: Number,
        required: true,
      },
      month: {
        type: Number,
        required: true,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    summary: {
      totalDays: {
        type: Number,
        required: true,
      },
      totalHours: {
        type: Number,
        required: true,
      },
      totalCost: {
        type: Number,
        required: false, // Only required for invoice reports
      },
    },
    projects: [{
      projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
      },
      totalHours: {
        type: Number,
        required: true,
      },
      totalCost: {
        type: Number,
        required: false, // Only required for invoice reports
      },
      tasks: [{
        taskId: {
          type: Schema.Types.ObjectId,
          ref: 'Task',
          required: true,
        },
        totalHours: {
          type: Number,
          required: true,
        },
        totalCost: {
          type: Number,
          required: false, // Only required for invoice reports
        },
      }],
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ userId: 1, customerId: 1 });
reportSchema.index({ 'period.year': 1, 'period.month': 1 });
reportSchema.index({ reportType: 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema); 