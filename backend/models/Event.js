const mongoose = require('mongoose');

const EVENT_CATEGORIES = [
  'Workshop',
  'Seminar',
  'Guest Lecture',
  'Placement Drive',
  'Hackathon',
  'Competition',
  'Training',
  'Certification',
  'Other',
];

const EVENT_MODES = ['Offline', 'Online', 'Hybrid'];

const EVENT_STATUSES = ['Draft', 'Published', 'Unpublished', 'Completed', 'Cancelled'];

const eventSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      default: 'Workshop',
    },
    bannerUrl: {
      type: String,
      default: '',
      trim: true,
    },
    speakerName: {
      type: String,
      default: '',
      trim: true,
    },
    speakerDesignation: {
      type: String,
      default: '',
      trim: true,
    },
    speakerPhotoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    mode: {
      type: String,
      enum: EVENT_MODES,
      default: 'Offline',
    },
    meetingUrl: {
      type: String,
      default: '',
      trim: true,
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    registrationFee: {
      type: Number,
      default: 0,
      min: [0, 'Registration fee cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0, // 0 = unlimited
      min: [0, 'Capacity cannot be negative'],
    },
    registrationUrl: {
      type: String,
      default: '',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    targetAudienceType: {
      type: String,
      enum: ['all', 'targeted'],
      default: 'all',
    },
    targetDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    targetSemester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      default: null,
    },
    targetDivisions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Division',
      },
    ],
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'Draft',
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, eventDate: 1 });
eventSchema.index({ organization: 1 });
eventSchema.index({ targetAudienceType: 1, targetDepartment: 1, targetSemester: 1 });
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;
module.exports.EVENT_MODES = EVENT_MODES;
module.exports.EVENT_STATUSES = EVENT_STATUSES;
