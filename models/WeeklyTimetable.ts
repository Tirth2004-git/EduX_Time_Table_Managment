import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWeeklyTimetable extends Document {
  program: string;
  className: string;
  semester: number;
  division: string;
  holidays: string[]; // Array of days marked as holidays: ['Wednesday', 'Saturday']
  timetableEntries: Types.ObjectId[]; // References to Timetable documents
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyTimetableSchema: Schema = new Schema(
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
    holidays: {
      type: [String],
      default: [],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    timetableEntries: [{
      type: Schema.Types.ObjectId,
      ref: 'Timetable',
    }],
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

// Unique index: one weekly timetable per program + class + semester + division
WeeklyTimetableSchema.index({ program: 1, className: 1, semester: 1, division: 1 }, { unique: true });

export default mongoose.models.WeeklyTimetable || mongoose.model<IWeeklyTimetable>('WeeklyTimetable', WeeklyTimetableSchema);

