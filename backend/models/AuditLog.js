const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionType: {
      type: String,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'APPROVE',
        'REJECT',
        'ASSIGN',
        'PUBLISH',
        'ROLLBACK',
        'GENERATE_SESSIONS',
        'HOLIDAY_APPLY',
        'ADD',
        'EDIT',
        'REPLACE',
        'MOVE',
        'UNDO',
        'REDO',
      ],
      required: true,
    },
    entityType: { type: String, trim: true, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      default: null,
    },
    correlationId: { type: String, trim: true, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, required: true },
    ipAddress: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

AuditLogSchema.index({ correlationId: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
