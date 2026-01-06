import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  subject_name: string;
  subject_code: string;
  teacherId: Types.ObjectId;
  requiredPeriods: number;
  allottedPeriods: number;
  remainingPeriods: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    subject_name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    subject_code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    requiredPeriods: {
      type: Number,
      required: [true, 'Required periods is required'],
      min: 1,
    },
    allottedPeriods: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingPeriods: {
      type: Number,
      default: function(this: ISubject) {
        return this.requiredPeriods;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Update remainingPeriods before save
SubjectSchema.pre('save', function(next) {
  // Ensure allottedPeriods is not negative
  if (this.allottedPeriods < 0) {
    this.allottedPeriods = 0;
  }
  // Calculate remaining periods
  this.remainingPeriods = Math.max(0, this.requiredPeriods - this.allottedPeriods);
  next();
});

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

