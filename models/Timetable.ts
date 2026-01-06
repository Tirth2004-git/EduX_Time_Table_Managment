import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITimetable extends Document {
  program: string;
  className: string;
  semester: number;
  division: string;
  day: string;
  timeSlot: string;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  classroomId?: Types.ObjectId;
  status: 'valid' | 'conflict';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema: Schema = new Schema(
  {
    program: {
      type: String,
      required: [true, 'Program is required'],
      enum: [
        'Information Technology',
        'Cyber Security',
        'Computer Science & Technology',
        'Computer Engineering',
        'Artificial Intelligence & Data Science',
      ],
      trim: true,
    },
    className: {
      type: String,
      required: [true, 'Class name is required'],
      enum: ['FY', 'SY', 'TY'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      enum: [1, 2, 3, 4, 5, 6],
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
      enum: ['A', 'B', 'C'],
      trim: true,
    },
    day: {
      type: String,
      required: [true, 'Day is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required'],
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
    },
    classroomId: {
      type: Schema.Types.ObjectId,
      ref: 'Classroom',
    },
    status: {
      type: String,
      enum: ['valid', 'conflict'],
      default: 'valid',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
TimetableSchema.index({ program: 1, className: 1, semester: 1, division: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ teacherId: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ program: 1, className: 1, semester: 1, division: 1 });
TimetableSchema.index({ classroomId: 1 });

export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema);

