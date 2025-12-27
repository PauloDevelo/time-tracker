import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string;
  url?: string;
  customerId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  azureDevOps?: {
    projectName: string;
    projectId: string;
    enabled: boolean;
    lastSyncedAt?: Date;
  };
  billingOverride?: {
    dailyRate?: number;
    currency?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isAzureDevOpsEnabled(): boolean;
  getAzureDevOpsUrl(): Promise<string | null>;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
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
    azureDevOps: {
      projectName: {
        type: String,
        trim: true,
      },
      projectId: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            if (!v) return true;
            // Validate UUID format for Azure DevOps project ID
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
          },
          message: 'Invalid Azure DevOps project ID format (must be a valid UUID)'
        }
      },
      enabled: {
        type: Boolean,
        default: false,
      },
      lastSyncedAt: {
        type: Date,
      },
    },
    billingOverride: {
      dailyRate: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ userId: 1, customerId: 1 });
projectSchema.index({ name: 1 });
projectSchema.index({ 'azureDevOps.projectId': 1 });

// Custom validation: if Azure DevOps is enabled, projectName and projectId must be set
projectSchema.pre('validate', function(next) {
  if (this.azureDevOps?.enabled) {
    if (!this.azureDevOps.projectName) {
      return next(new Error('Azure DevOps projectName is required when enabled is true'));
    }
    if (!this.azureDevOps.projectId) {
      return next(new Error('Azure DevOps projectId is required when enabled is true'));
    }
  }
  next();
});

// Method to check if Azure DevOps is enabled
projectSchema.methods.isAzureDevOpsEnabled = function(): boolean {
  return this.azureDevOps?.enabled || false;
};

// Method to get Azure DevOps project URL
projectSchema.methods.getAzureDevOpsUrl = async function(): Promise<string | null> {
  if (!this.azureDevOps?.projectName) {
    return null;
  }
  
  try {
    // Populate customer to get organization URL
    await this.populate('customerId');
    const customer = this.customerId as any;
    
    if (!customer?.azureDevOps?.organizationUrl) {
      return null;
    }
    
    // Construct Azure DevOps project URL
    return `${customer.azureDevOps.organizationUrl}/${encodeURIComponent(this.azureDevOps.projectName)}`;
  } catch (error) {
    console.error('Error constructing Azure DevOps URL:', error);
    return null;
  }
};

export const Project = mongoose.model<IProject>('Project', projectSchema);