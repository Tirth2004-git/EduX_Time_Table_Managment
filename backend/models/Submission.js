const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  grade: { type: mongoose.Schema.Types.Mixed, default: null }, // Number or String
  feedback: { type: String, default: '' }
});

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
