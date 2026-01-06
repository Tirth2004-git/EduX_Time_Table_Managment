import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkloadEntry {
  program: string;
  className: string;
  semester: number;
  division: string;
  assignedHours: number;
  remainingHours: number;
}

export interface ITeacher extends Document {
  teacherID: string;
  faculty_name: string;
  subject_name: string;
  department: string;
  teaching_hours: number;
  teacher_number: string;
  classroom: string;
  assignedHours: number; // Deprecated - kept for backward compatibility
  remainingHours: number; // Deprecated - kept for backward compatibility
  workload: IWorkloadEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema: Schema = new Schema(
  {
    teacherID: {
      type: String,
      required: [true, 'Teacher ID is required'],
      unique: true,
      trim: true,
    },
    faculty_name: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
    },
    subject_name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    teaching_hours: {
      type: Number,
      required: [true, 'Teaching hours is required'],
      min: 0,
    },
    teacher_number: {
      type: String,
      required: [true, 'Teacher number is required'],
      trim: true,
    },
    classroom: {
      type: String,
      required: [true, 'Classroom is required'],
      trim: true,
    },
    assignedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingHours: {
      type: Number,
      default: function(this: ITeacher) {
        return this.teaching_hours;
      },
    },
    workload: {
      type: [
        {
          program: {
            type: String,
            required: true,
            trim: true,
          },
          className: {
            type: String,
            required: true,
            trim: true,
          },
          semester: {
            type: Number,
            required: true,
            min: 1,
            max: 6,
          },
          division: {
            type: String,
            required: true,
            enum: ['A', 'B', 'C'],
            trim: true,
          },
          assignedHours: {
            type: Number,
            default: 0,
            min: 0,
          },
          remainingHours: {
            type: Number,
            default: 0,
            min: 0,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Update remainingHours before save
TeacherSchema.pre('save', function(next) {
  // Ensure assignedHours is not negative
  if (this.assignedHours < 0) {
    this.assignedHours = 0;
  }
  // Calculate remaining hours (when assignedHours decreases, remainingHours increases)
  this.remainingHours = Math.max(0, this.teaching_hours - this.assignedHours);
  next();
});

export default mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);

