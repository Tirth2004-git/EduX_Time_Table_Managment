const mongoose = require('mongoose');

const ROOM_TYPES = [
  'Classroom',
  'Theory',
  'Laboratory',
  'Computer Lab',
  'Seminar Hall',
  'Tutorial Room',
  'Auditorium',
  'Other',
];

const ROOM_STATUSES = ['Available', 'In Use', 'Maintenance', 'Inactive'];

const classroomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      uppercase: true,
    },
    roomName: {
      type: String,
      trim: true,
      default: '',
    },
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true,
      default: 'Main Building',
    },
    floor: {
      type: String,
      required: [true, 'Floor is required'],
      trim: true,
      default: '1',
    },
    type: {
      type: String,
      enum: ROOM_TYPES,
      default: 'Classroom',
      required: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      default: 60,
    },
    status: {
      type: String,
      enum: ROOM_STATUSES,
      default: 'Available',
    },
    available: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      default: null,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      default: null,
    },
    className: {
      type: String,
      trim: true,
      default: null,
    },
    academicYearId: {
      type: String,
      trim: true,
      default: '2026-27',
    },
    // Legacy compatibility fields
    room_id: {
      type: String,
      trim: true,
      default: null,
    },
    room_name: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

classroomSchema.index({ roomNumber: 1, building: 1 });
classroomSchema.index({ status: 1, available: 1 });
classroomSchema.index({ type: 1 });
classroomSchema.index({ departmentId: 1 });

module.exports = mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema);
module.exports.ROOM_TYPES = ROOM_TYPES;
module.exports.ROOM_STATUSES = ROOM_STATUSES;