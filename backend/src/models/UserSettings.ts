import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  companyInformation: {
    name: string;
    address: string;
    businessNumber: string;
    incorporationNumber: string;
  };
  personalInformation: {
    address: string;
    image: {
      data: Buffer;
      contentType: string;
    };
  };
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyInformation: {
      name: {
        type: String,
        default: '',
      },
      address: {
        type: String,
        default: '',
      },
      businessNumber: {
        type: String,
        default: '',
      },
      incorporationNumber: {
        type: String,
        default: '',
      },
    },
    personalInformation: {
      address: {
        type: String,
        default: '',
      },
      image: {
        data: Buffer,
        contentType: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSettingsSchema.index({ userId: 1 });

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);