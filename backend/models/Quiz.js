const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  marks: { type: Number, required: true, default: 1 },
  explanation: { type: String, default: '' }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  questions: [questionSchema],
  duration: { type: Number, required: true }, // in minutes
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
