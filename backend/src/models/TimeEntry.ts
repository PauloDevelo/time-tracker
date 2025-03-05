import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
  startTime: Date;
  duration: number; // in minutes
  description: string;
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
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
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

// Virtual for end time
timeEntrySchema.virtual('endTime').get(function() {
  return new Date(this.startTime.getTime() + this.duration * 60000);
});

// Method to check if time entry overlaps with another
timeEntrySchema.methods.overlaps = function(other: ITimeEntry): boolean {
  const thisEnd = this.endTime;
  const otherEnd = new Date(other.startTime.getTime() + other.duration * 60000);
  
  return (
    (this.startTime <= other.startTime && thisEnd > other.startTime) ||
    (this.startTime < otherEnd && thisEnd >= otherEnd) ||
    (this.startTime >= other.startTime && thisEnd <= otherEnd)
  );
};

export const TimeEntry = mongoose.model<ITimeEntry>('TimeEntry', timeEntrySchema); 