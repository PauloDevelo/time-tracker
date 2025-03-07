import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
  startTime: Date; // The is the date the time entry is applicable to in UTC
  totalDurationInHour: number; // The duration of the time entry in hours. This duration might not be accurate if the time entry is in progress
  
  startProgressTime: Date | undefined; // The time the time entry is in progress from. This can be undefined if the time entry is not in progress
  
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    startTime: {
      type: Date,
      required: true,
    },
    totalDurationInHour: {
      type: Number,
      required: true,
      min: 0,
    },
    startProgressTime: {
      type: Date,
      required: false,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
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
timeEntrySchema.index({ userId: 1, taskId: 1 });
timeEntrySchema.index({ startTime: 1 });

// Virtual to check if the time entry is in progress
timeEntrySchema.virtual('isInProgress').get(function() {
  if (!this.startProgressTime) {
    return true;
  }
  
  return false;
});

export const TimeEntry = mongoose.model<ITimeEntry>('TimeEntry', timeEntrySchema); 