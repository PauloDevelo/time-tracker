import mongoose, { Document, Schema } from 'mongoose';

export interface IContract extends Document {
  customerId: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  currency: string;
  daysToCompletion: number;
  description?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contractSchema = new Schema<IContract>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    daysToCompletion: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
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
contractSchema.index({ userId: 1, customerId: 1 });
contractSchema.index({ customerId: 1, startDate: 1, endDate: 1 });

// Pre-validate hook to ensure endDate is after startDate
contractSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate) {
    if (this.endDate <= this.startDate) {
      return next(new Error('endDate must be after startDate'));
    }
  }
  next();
});

export const Contract = mongoose.model<IContract>('Contract', contractSchema);
