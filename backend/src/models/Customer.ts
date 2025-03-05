import mongoose, { Document, Schema } from 'mongoose';

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
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerSchema.index({ userId: 1, name: 1 });
customerSchema.index({ 'contactInfo.email': 1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema); 