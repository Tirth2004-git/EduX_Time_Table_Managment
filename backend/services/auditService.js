const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

function generateCorrelationId() {
  return crypto.randomUUID();
}

async function logAudit({
  userId,
  actionType,
  entityType = '',
  entityId = null,
  timetableId = null,
  correlationId = '',
  details = {},
  ipAddress = '',
}) {
  return AuditLog.create({
    userId,
    actionType,
    entityType,
    entityId,
    timetableId,
    correlationId,
    details,
    ipAddress,
  });
}

module.exports = { generateCorrelationId, logAudit };
