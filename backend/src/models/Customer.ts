import mongoose, { Document, Schema } from 'mongoose';
import { encryptPAT, decryptPAT } from '../config/encryption.helpers';

export interface ICustomer extends Document {
  name: string;
  contactInfo: {
    email: string;
    phone?: string;
    address?: string;
  };
  billingDetails: {
    dailyRate: number;
    currency: string;
    paymentTerms?: string;
  };
  azureDevOps?: {
    organizationUrl: string;
    pat: string;
    enabled: boolean;
  };
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  getDecryptedPAT(): string | null;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    billingDetails: {
      dailyRate: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'USD',
      },
      paymentTerms: {
        type: String,
        trim: true,
      },
    },
    azureDevOps: {
      organizationUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            if (!v) return true;
            return /^https:\/\/(dev\.azure\.com\/[^/]+|[^/]+\.visualstudio\.com)$/.test(v);
          },
          message: 'Invalid Azure DevOps organization URL format'
        }
      },
      pat: {
        type: String,
      },
      enabled: {
        type: Boolean,
        default: false,
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(_doc, ret) {
        // Remove PAT from JSON responses for security
        if (ret.azureDevOps?.pat) {
          delete ret.azureDevOps.pat;
        }
        return ret;
      }
    }
  }
);

// Indexes
customerSchema.index({ userId: 1, name: 1 });
customerSchema.index({ 'contactInfo.email': 1 });

// Pre-save hook to encrypt PAT if changed
customerSchema.pre('save', function(next) {
  if (this.azureDevOps?.pat && this.isModified('azureDevOps.pat')) {
    try {
      // Check if PAT is already encrypted (contains ':' separator)
      if (!this.azureDevOps.pat.includes(':')) {
        this.azureDevOps.pat = encryptPAT(this.azureDevOps.pat);
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Method to get decrypted PAT
customerSchema.methods.getDecryptedPAT = function(): string | null {
  if (!this.azureDevOps?.pat) {
    return null;
  }
  
  try {
    return decryptPAT(this.azureDevOps.pat);
  } catch (error) {
    console.error('Error decrypting PAT:', error);
    return null;
  }
};

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);