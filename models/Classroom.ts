import mongoose, { Schema, Document } from 'mongoose';

export interface IClassroom extends Document {
  program: string;
  className: string;
  semester: number;
  division: string;
  year?: string;
  roomNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassroomSchema: Schema = new Schema(
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
    year: {
      type: String,
      trim: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique program + class + semester + division combination
ClassroomSchema.index({ program: 1, className: 1, semester: 1, division: 1 }, { unique: true });

export default mongoose.models.Classroom || mongoose.model<IClassroom>('Classroom', ClassroomSchema);

