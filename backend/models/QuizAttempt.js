const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number }], // Array of selected option indexes
  score: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
