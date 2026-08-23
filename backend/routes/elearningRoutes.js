const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireTeacherForSubject } = require('../middleware/elearningMiddleware');
const { upload, uploadMemory, getSafeDownloadUrl } = require('../config/cloudinary');
const aiQuizService = require('../services/aiQuizService');

const Material = require('../models/Material');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Subject = require('../models/Subject');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
const Division = require('../models/Division');

// Helper to get student's allowed subjects based on academic profile
const getStudentSubjects = async (req) => {
  let { departmentId, semesterId, divisionId } = req.user;

  // If department or semester missing but divisionId present, resolve from division
  if ((!departmentId || !semesterId) && divisionId) {
    const div = await Division.findById(divisionId);
    if (div) {
      departmentId = departmentId || div.department;
      semesterId = semesterId || div.semester;
    }
  }

  // If still missing (e.g. unassigned demo student), return active subjects
  if (!departmentId || !semesterId) {
    const subjects = await Subject.find({ status: 'active' });
    return subjects.map(s => s._id);
  }

  const subjects = await Subject.find({ department: departmentId, semester: semesterId, status: 'active' });
  return subjects.map(s => s._id);
};

// --- SAFE DOWNLOAD / VIEW PROXY ENDPOINT ---
// Generates a signed, authenticated download URL to eliminate Cloudinary 401 unauthenticated delivery restrictions on PDFs/DOCs/PPTs
router.get('/download', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'File URL parameter is required.' });
    }

    const safeUrl = getSafeDownloadUrl(url);
    if (!safeUrl) {
      return res.status(404).json({ error: 'Question file is currently unavailable.' });
    }

    return res.redirect(safeUrl);
  } catch (err) {
    console.error('Download proxy error:', err);
    res.status(500).json({ error: 'Unable to download the question file. Please try again.' });
  }
});

// --- TEACHER SUBJECTS ---
// Returns assigned subjects for the authenticated teacher to populate dropdowns
router.get('/teacher-subjects', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const allSubjects = await Subject.find({ status: 'active' }).populate('department semester');
      return res.json({ success: true, subjects: allSubjects });
    }

    if (!req.user.teacherId) {
      return res.status(400).json({ error: 'User is not linked to any Teacher record.' });
    }

    const mappings = await TeacherSubjectMapping.find({ teacher_id: req.user.teacherId })
      .populate({
        path: 'subject_id',
        populate: [{ path: 'department' }, { path: 'semester' }]
      })
      .lean();

    const mappedSubjectIds = mappings.map(m => m.subject_id?._id).filter(Boolean);

    // Also check direct assignedTeachers array on Subject
    const directSubjects = await Subject.find({
      $or: [
        { _id: { $in: mappedSubjectIds } },
        { assignedTeachers: req.user.teacherId }
      ],
      status: 'active'
    }).populate('department semester');

    res.json({ success: true, subjects: directSubjects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assigned subjects' });
  }
});

// --- MATERIAL ---
router.get('/material', protect(), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'teacher') {
      filter = { uploadedBy: req.user.teacherId };
    } else if (req.user.role === 'student') {
      const subjectIds = await getStudentSubjects(req);
      filter = { subject: { $in: subjectIds } };
    }
    const rawMaterials = await Material.find(filter)
      .populate('subject')
      .populate('uploadedBy', 'faculty_name name email designation')
      .sort({ createdAt: -1 })
      .lean();

    const materials = rawMaterials.map(m => ({
      ...m,
      fileUrl: getSafeDownloadUrl(m.fileUrl)
    }));

    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.post('/material', protect(), authorizeRoles('admin', 'teacher'), upload.single('file'), requireTeacherForSubject, async (req, res) => {
  try {
    const { title, type, subject, linkUrl } = req.body;
    let fileUrl = req.file ? req.file.path : linkUrl;

    if (!fileUrl) {
      return res.status(400).json({ error: 'File upload or link URL is required' });
    }
    
    const material = new Material({
      title,
      type: type || 'pdf',
      subject,
      uploadedBy: req.user.teacherId,
      fileUrl
    });
    await material.save();
    const populated = await Material.findById(material._id).populate('subject').lean();
    res.status(201).json({ ...populated, fileUrl: getSafeDownloadUrl(populated.fileUrl) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to upload material' });
  }
});

router.delete('/material/:id', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.uploadedBy = req.user.teacherId;
    }
    const deleted = await Material.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: 'Material not found or unauthorized' });
    }
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// --- ASSIGNMENT ---
router.get('/assignment', protect(), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'teacher') {
      filter = { createdBy: req.user.teacherId };
    } else if (req.user.role === 'student') {
      const subjectIds = await getStudentSubjects(req);
      filter = { subject: { $in: subjectIds } };
    }
    const assignments = await Assignment.find(filter)
      .populate('subject')
      .populate('createdBy', 'faculty_name name email')
      .sort({ createdAt: -1 })
      .lean();

    // Attach submission counts for teachers or own submission for students + safe URLs
    const assignmentsWithSubmissions = await Promise.all(assignments.map(async (a) => {
      const safeAttachmentUrl = a.attachmentUrl ? getSafeDownloadUrl(a.attachmentUrl) : undefined;
      const baseObj = { ...a, attachmentUrl: safeAttachmentUrl };

      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        const count = await Submission.countDocuments({ assignment: a._id });
        return { ...baseObj, submissionCount: count };
      } else if (req.user.role === 'student') {
        const mySub = await Submission.findOne({ assignment: a._id, student: req.user.userId }).lean();
        if (mySub && mySub.fileUrl) {
          mySub.fileUrl = getSafeDownloadUrl(mySub.fileUrl);
        }
        return { ...baseObj, mySubmission: mySub };
      }
      return baseObj;
    }));

    res.json(assignmentsWithSubmissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.post('/assignment', protect(), authorizeRoles('admin', 'teacher'), upload.single('file'), requireTeacherForSubject, async (req, res) => {
  try {
    const { title, description, subject, dueDate } = req.body;
    const assignment = new Assignment({
      title,
      description,
      subject,
      dueDate: new Date(dueDate),
      createdBy: req.user.teacherId,
      attachmentUrl: req.file ? req.file.path : undefined
    });
    await assignment.save();
    const populated = await Assignment.findById(assignment._id).populate('subject').lean();
    res.status(201).json({
      ...populated,
      attachmentUrl: populated.attachmentUrl ? getSafeDownloadUrl(populated.attachmentUrl) : undefined
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create assignment' });
  }
});

router.delete('/assignment/:id', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.teacherId;
    }
    const deleted = await Assignment.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found or unauthorized' });
    }
    await Submission.deleteMany({ assignment: req.params.id });
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

router.get('/assignment/:id/submissions', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const submissions = await Submission.find({ assignment: req.params.id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 })
      .lean();
    
    const safeSubmissions = submissions.map(s => ({
      ...s,
      fileUrl: getSafeDownloadUrl(s.fileUrl)
    }));

    res.json(safeSubmissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.post('/assignment/:id/submit', protect(), authorizeRoles('student'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Submission file is required' });
    
    const submission = new Submission({
      assignment: req.params.id,
      student: req.user.userId,
      fileUrl: req.file.path
    });
    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'You have already submitted this assignment.' });
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

router.put('/submission/:id/grade', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { grade, feedback },
      { new: true }
    ).populate('student', 'name email');
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json({ success: true, submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

// --- AI QUIZ GENERATOR ENDPOINTS ---

/**
 * Uploads study document (PDF/PPT/PPTX), extracts content, calls AI model, and returns structured preview.
 */
router.post('/quiz/generate-ai', protect(), authorizeRoles('admin', 'teacher'), uploadMemory.single('file'), requireTeacherForSubject, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF, PPT, or PPTX source document.' });
    }

    const {
      title,
      subject,
      questionCount = 10,
      difficulty = 'Medium',
      questionType = 'Multiple Choice',
      marksPerQuestion = 1,
      duration = 15
    } = req.body;

    // 1. Extract text from uploaded document buffer
    const extractedText = await aiQuizService.extractTextFromBuffer(req.file.buffer, req.file.originalname);

    // 2. Generate structured quiz using AI
    const generatedQuiz = await aiQuizService.generateQuizFromText({
      text: extractedText,
      title: title || req.file.originalname.replace(/\.[^/.]+$/, ''),
      questionCount,
      difficulty,
      questionType,
      marksPerQuestion,
      duration
    });

    res.json({
      success: true,
      quiz: {
        ...generatedQuiz,
        subject
      }
    });
  } catch (err) {
    console.error('AI Quiz Generation Failed:', err);
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'Unable to generate quiz from this document. Please check the document and try again.'
    });
  }
});

/**
 * Regenerates an individual question given the source text.
 */
router.post('/quiz/regenerate-question', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const {
      sourceText,
      existingQuestionText,
      difficulty = 'Medium',
      questionType = 'Multiple Choice',
      marks = 1
    } = req.body;

    if (!sourceText) {
      return res.status(400).json({ error: 'Source document text is required to regenerate question.' });
    }

    const newQuestion = await aiQuizService.regenerateSingleQuestion({
      text: sourceText,
      existingQuestionText,
      difficulty,
      questionType,
      marks
    });

    res.json({ success: true, question: newQuestion });
  } catch (err) {
    console.error('Regenerate question failed:', err);
    res.status(err.statusCode || 500).json({
      error: err.message || 'Failed to regenerate question. Please try again.'
    });
  }
});

// --- QUIZ ---
router.get('/quiz', protect(), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'teacher') {
      filter = { createdBy: req.user.teacherId };
    } else if (req.user.role === 'student') {
      const subjectIds = await getStudentSubjects(req);
      filter = { subject: { $in: subjectIds } };
    }
    
    const quizzes = await Quiz.find(filter)
      .populate('subject')
      .populate('createdBy', 'faculty_name name email')
      .sort({ createdAt: -1 })
      .lean();
    
    // For students: check if already attempted and strip correctOptionIndex
    if (req.user.role === 'student') {
      const sanitized = await Promise.all(quizzes.map(async (q) => {
        const attempt = await QuizAttempt.findOne({ quiz: q._id, student: req.user.userId }).lean();
        const quizObj = { ...q, attempted: !!attempt, attempt };
        quizObj.questions = quizObj.questions.map(question => {
          const { correctOptionIndex, ...rest } = question;
          return rest;
        });
        return quizObj;
      }));
      return res.json(sanitized);
    }

    // For teachers: attach attempt counts
    const withAttempts = await Promise.all(quizzes.map(async (q) => {
      const attemptCount = await QuizAttempt.countDocuments({ quiz: q._id });
      return { ...q, attemptCount };
    }));
    
    res.json(withAttempts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Teacher / Admin Fetch Complete Single Quiz for View & Edit
router.get('/quiz/:id', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('subject');
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Ownership Authorization Check
    if (req.user.role !== 'admin' && quiz.createdBy.toString() !== req.user.teacherId.toString()) {
      return res.status(403).json({ error: 'You are not authorized to view or edit this quiz.' });
    }

    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });

    res.json({
      success: true,
      quiz: {
        ...quiz.toObject(),
        attemptCount
      }
    });
  } catch (err) {
    console.error('Fetch single quiz error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz details' });
  }
});

// Teacher / Admin Update Existing Quiz
router.put('/quiz/:id', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Ownership Authorization Check
    if (req.user.role !== 'admin' && quiz.createdBy.toString() !== req.user.teacherId.toString()) {
      return res.status(403).json({ error: 'You are not authorized to modify this quiz.' });
    }

    const { title, subject, duration, questions } = req.body;

    // Backend Validations
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required and cannot be empty.' });
    }

    const parsedDuration = Number(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return res.status(400).json({ error: 'Quiz duration must be a positive number (in minutes).' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Quiz must contain at least 1 question.' });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
        return res.status(400).json({ error: `Question ${i + 1} prompt cannot be empty.` });
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: `Question ${i + 1} must contain at least 2 options.` });
      }

      for (let j = 0; j < q.options.length; j++) {
        if (typeof q.options[j] !== 'string' || !q.options[j].trim()) {
          return res.status(400).json({ error: `Question ${i + 1} Option ${String.fromCharCode(65 + j)} cannot be blank.` });
        }
      }

      const correctIdx = parseInt(q.correctOptionIndex, 10);
      if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= q.options.length) {
        return res.status(400).json({ error: `Question ${i + 1} has an invalid correct answer selection.` });
      }

      const marks = Number(q.marks);
      if (isNaN(marks) || marks <= 0) {
        return res.status(400).json({ error: `Question ${i + 1} marks must be a positive number.` });
      }
    }

    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });

    // Apply updates
    quiz.title = title.trim();
    quiz.duration = parsedDuration;
    if (subject) quiz.subject = subject;
    quiz.questions = questions.map(q => ({
      questionText: q.questionText.trim(),
      options: q.options.map(opt => opt.trim()),
      correctOptionIndex: parseInt(q.correctOptionIndex, 10),
      marks: Number(q.marks) || 1,
      explanation: (q.explanation || '').trim()
    }));

    await quiz.save();
    const updated = await Quiz.findById(quiz._id).populate('subject');

    res.json({
      success: true,
      message: 'Quiz updated successfully.',
      quiz: {
        ...updated.toObject(),
        attemptCount
      }
    });
  } catch (err) {
    console.error('Update quiz error:', err);
    res.status(500).json({ error: err.message || 'Failed to update quiz' });
  }
});

router.post('/quiz', protect(), authorizeRoles('admin', 'teacher'), requireTeacherForSubject, async (req, res) => {
  try {
    const { title, subject, duration, questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }
    const quiz = new Quiz({
      title,
      subject,
      duration: Number(duration) || 15,
      questions,
      createdBy: req.user.teacherId
    });
    await quiz.save();
    const populated = await Quiz.findById(quiz._id).populate('subject');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create quiz' });
  }
});

router.delete('/quiz/:id', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.teacherId;
    }
    const deleted = await Quiz.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: 'Quiz not found or unauthorized' });
    }
    await QuizAttempt.deleteMany({ quiz: req.params.id });
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

router.get('/quiz/:id/attempts', protect(), authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ quiz: req.params.id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

/**
 * Helper to build rich post-quiz review data with question breakdown, score, and explanations
 */
function buildQuizReviewData(quiz, answers, attempt) {
  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const reviewQuestions = (quiz.questions || []).map((q, idx) => {
    const marks = q.marks || 1;
    totalMarks += marks;

    const selectedIdx = (answers && answers[idx] !== undefined) ? answers[idx] : null;
    const isUnanswered = selectedIdx === null || selectedIdx === -1;
    const isCorrect = !isUnanswered && selectedIdx === q.correctOptionIndex;

    if (isUnanswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
      score += marks;
    } else {
      wrongCount++;
    }

    const correctOptionText = q.options[q.correctOptionIndex] || `Option ${String.fromCharCode(65 + (q.correctOptionIndex || 0))}`;
    let explanation = q.explanation;
    if (!explanation) {
      explanation = `The correct answer is Option ${String.fromCharCode(65 + (q.correctOptionIndex || 0))}: "${correctOptionText}".`;
    }

    return {
      questionNumber: idx + 1,
      questionText: q.questionText,
      options: q.options,
      selectedOptionIndex: isUnanswered ? null : selectedIdx,
      correctOptionIndex: q.correctOptionIndex,
      isCorrect,
      isUnanswered,
      marks,
      explanation
    };
  });

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return {
    quiz: {
      id: quiz._id,
      title: quiz.title,
      duration: quiz.duration,
      totalMarks,
      subject: quiz.subject
    },
    result: {
      score,
      totalMarks,
      percentage,
      correctCount,
      wrongCount,
      unansweredCount,
      submittedAt: attempt?.submittedAt || new Date()
    },
    questions: reviewQuestions
  };
}

// Student Submit Quiz (evaluates, saves attempt, and returns rich review data)
router.post('/quiz/:id/submit', protect(), authorizeRoles('student'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('subject');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    const { answers } = req.body; // Array of selected indexes
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }

    // Build review structure and compute score
    const reviewData = buildQuizReviewData(quiz, answers);
    
    const attempt = new QuizAttempt({
      quiz: quiz._id,
      student: req.user.userId,
      answers,
      score: reviewData.result.score
    });

    await attempt.save();
    
    res.status(201).json({
      success: true,
      attempt,
      ...reviewData
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'You have already attempted this quiz.' });
    res.status(500).json({ error: 'Failed to submit quiz attempt' });
  }
});

// Student View Completed Quiz Result (authenticated review persistence)
router.get('/quiz/:id/result', protect(), authorizeRoles('student'), async (req, res) => {
  try {
    const attempt = await QuizAttempt.findOne({ quiz: req.params.id, student: req.user.userId });
    if (!attempt) {
      return res.status(404).json({ error: 'No completed quiz attempt found.' });
    }

    const quiz = await Quiz.findById(req.params.id).populate('subject');
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const reviewData = buildQuizReviewData(quiz, attempt.answers, attempt);

    res.json({
      success: true,
      attempt,
      ...reviewData
    });
  } catch (err) {
    console.error('Fetch quiz result error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz result.' });
  }
});

module.exports = router;
