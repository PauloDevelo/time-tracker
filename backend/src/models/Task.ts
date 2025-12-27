import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  name: string;
  description?: string;
  url?: string;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  azureDevOps?: {
    workItemId: number;
    workItemType: 'Bug' | 'Task' | 'User Story';
    iterationPath: string;
    assignedTo?: string;
    lastSyncedAt: Date;
    sourceUrl: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isAzureDevOpsTask: boolean;
  isImportedFromAzureDevOps(): boolean;
  getWorkItemUrl(): string | null;
}

const taskSchema = new Schema<ITask>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    azureDevOps: {
      workItemId: {
        type: Number,
        min: 1,
      },
      workItemType: {
        type: String,
        enum: ['Bug', 'Task', 'User Story'],
      },
      iterationPath: {
        type: String,
        trim: true,
      },
      assignedTo: {
        type: String,
        trim: true,
      },
      lastSyncedAt: {
        type: Date,
      },
      sourceUrl: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
taskSchema.index({ userId: 1, projectId: 1 });
// Compound unique index to prevent duplicate work item imports per project
taskSchema.index(
  { projectId: 1, 'azureDevOps.workItemId': 1 },
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { 'azureDevOps.workItemId': { $exists: true } }
  }
);

// Virtual field to check if task is from Azure DevOps
taskSchema.virtual('isAzureDevOpsTask').get(function() {
  return !!(this.azureDevOps?.workItemId);
});

// Method to check if task is imported from Azure DevOps
taskSchema.methods.isImportedFromAzureDevOps = function(): boolean {
  return !!(this.azureDevOps?.workItemId);
};

// Method to get work item URL
taskSchema.methods.getWorkItemUrl = function(): string | null {
  if (!this.azureDevOps?.sourceUrl) {
    return null;
  }
  return this.azureDevOps.sourceUrl;
};

export const Task = mongoose.model<ITask>('Task', taskSchema);