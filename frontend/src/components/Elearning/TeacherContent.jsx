import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen, FileText, UploadCloud, CheckCircle, Plus, Trash2,
  ExternalLink, Calendar, Clock, Award, Users, AlertCircle, RefreshCw,
  X, Check, Eye, HelpCircle, Sparkles, Layers, Link as LinkIcon,
  ArrowRight, ArrowLeft, Wand2, FileCode, CheckSquare, Edit3,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Save, Info,
  AlertTriangle
} from 'lucide-react';
import elearningApi from '@/services/api/elearningApi';
import teacherPortalApi from '@/services/api/teacherPortalApi';
import { showToast } from '@/components/ui/toast';

export default function TeacherContent() {
  const [activeSubTab, setActiveSubTab] = useState('materials'); // 'materials' | 'assignments' | 'quizzes'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  // Form toggle states
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showManualQuizForm, setShowManualQuizForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Material Form
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState('pdf');
  const [matSubject, setMatSubject] = useState('');
  const [matFile, setMatFile] = useState(null);
  const [matLinkUrl, setMatLinkUrl] = useState('');

  // Assignment Form
  const [assTitle, setAssTitle] = useState('');
  const [assDescription, setAssDescription] = useState('');
  const [assSubject, setAssSubject] = useState('');
  const [assDueDate, setAssDueDate] = useState('');
  const [assFile, setAssFile] = useState(null);

  // Submissions Modal State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingState, setGradingState] = useState({}); // { [subId]: { grade, feedback } }

  // Manual Quiz Form State
  const [manualQuizTitle, setManualQuizTitle] = useState('');
  const [manualQuizSubject, setManualQuizSubject] = useState('');
  const [manualQuizDuration, setManualQuizDuration] = useState(15);
  const [manualQuizQuestions, setManualQuizQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, marks: 1, explanation: '' }
  ]);

  // Quiz Attempts Modal State
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // QUIZ VIEW & EDIT / PREVIEW STATE
  // ─────────────────────────────────────────────────────────────
  const [editingQuiz, setEditingQuiz] = useState(null); // Complete quiz object being edited
  const [loadingEditQuiz, setLoadingEditQuiz] = useState(false);
  const [savingEditQuiz, setSavingEditQuiz] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);

  // ─────────────────────────────────────────────────────────────
  // AI QUIZ GENERATOR MODAL & WIZARD STATE
  // ─────────────────────────────────────────────────────────────
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);
  const [aiWizardStep, setAiWizardStep] = useState(1); // 1: Upload, 2: Configure, 3: Generating, 4: Preview/Edit
  const [aiSourceFile, setAiSourceFile] = useState(null);
  const [aiQuizTitle, setAiQuizTitle] = useState('');
  const [aiQuizSubject, setAiQuizSubject] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard' | 'Mixed'
  const [aiQuestionType, setAiQuestionType] = useState('Multiple Choice'); // 'Multiple Choice' | 'True/False' | 'Mixed'
  const [aiMarksPerQuestion, setAiMarksPerQuestion] = useState(1);
  const [aiDuration, setAiDuration] = useState(15);
  
  // AI Generation Progress Step
  const [aiProgressText, setAiProgressText] = useState('Analyzing uploaded document...');
  const [aiGeneratedQuiz, setAiGeneratedQuiz] = useState(null);
  const [regeneratingQuestionIdx, setRegeneratingQuestionIdx] = useState(null);

  // Load all initial data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch assigned subjects
      let subList = [];
      try {
        const subRes = await elearningApi.getTeacherSubjects();
        subList = subRes.data?.subjects || [];
      } catch (e) {
        const profRes = await teacherPortalApi.getProfile();
        subList = profRes.data?.profile?.subjects || [];
      }
      setSubjects(subList);
      if (subList.length > 0) {
        const firstId = subList[0]._id || subList[0].id;
        setMatSubject(firstId);
        setAssSubject(firstId);
        setManualQuizSubject(firstId);
        setAiQuizSubject(firstId);
      }

      // 2. Fetch materials, assignments, quizzes in parallel
      const [matRes, assRes, quizRes] = await Promise.all([
        elearningApi.getMaterials(),
        elearningApi.getAssignments(),
        elearningApi.getQuizzes()
      ]);

      setMaterials(Array.isArray(matRes.data) ? matRes.data : []);
      setAssignments(Array.isArray(assRes.data) ? assRes.data : []);
      setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
    } catch (err) {
      console.error('Failed to load teacher content:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to load content';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ─────────────────────────────────────────────────────────────
  // MATERIALS HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!matTitle.trim()) return showToast('Please enter a title', 'error');
    if (!matSubject) return showToast('Please select a subject', 'error');
    if (matType !== 'link' && !matFile && !matLinkUrl) {
      return showToast('Please choose a file to upload or enter a link', 'error');
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', matTitle.trim());
    formData.append('type', matType);
    formData.append('subject', matSubject);
    if (matFile) formData.append('file', matFile);
    if (matLinkUrl) formData.append('linkUrl', matLinkUrl.trim());

    try {
      await elearningApi.uploadMaterial(formData);
      showToast('Learning material published successfully!', 'success');
      setMatTitle('');
      setMatFile(null);
      setMatLinkUrl('');
      setShowMaterialForm(false);
      const res = await elearningApi.getMaterials();
      setMaterials(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload material', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Are you sure you want to delete this learning material?')) return;
    try {
      await elearningApi.deleteMaterial(id);
      showToast('Material deleted successfully', 'success');
      setMaterials(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete material', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ASSIGNMENTS HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assTitle.trim()) return showToast('Please enter assignment title', 'error');
    if (!assSubject) return showToast('Please select a subject', 'error');
    if (!assDueDate) return showToast('Please set a due date', 'error');

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', assTitle.trim());
    formData.append('description', assDescription.trim());
    formData.append('subject', assSubject);
    formData.append('dueDate', assDueDate);
    if (assFile) formData.append('file', assFile);

    try {
      await elearningApi.createAssignment(formData);
      showToast('Assignment created successfully!', 'success');
      setAssTitle('');
      setAssDescription('');
      setAssDueDate('');
      setAssFile(null);
      setShowAssignmentForm(false);
      const res = await elearningApi.getAssignments();
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment and all submissions?')) return;
    try {
      await elearningApi.deleteAssignment(id);
      showToast('Assignment deleted successfully', 'success');
      setAssignments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete assignment', 'error');
    }
  };

  const handleOpenSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setLoadingSubmissions(true);
    try {
      const res = await elearningApi.getSubmissions(assignment._id);
      const subs = Array.isArray(res.data) ? res.data : [];
      setSubmissions(subs);
      const initialGrading = {};
      subs.forEach(s => {
        initialGrading[s._id] = { grade: s.grade || '', feedback: s.feedback || '' };
      });
      setGradingState(initialGrading);
    } catch (err) {
      showToast('Failed to load submissions', 'error');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (submissionId) => {
    const data = gradingState[submissionId];
    if (!data) return;
    try {
      await elearningApi.gradeSubmission(submissionId, data);
      showToast('Grade and feedback saved successfully', 'success');
    } catch (err) {
      showToast('Failed to save grade', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // AI QUIZ GENERATOR WIZARD HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleOpenAiQuizModal = () => {
    setAiWizardStep(1);
    setAiSourceFile(null);
    setAiQuizTitle('');
    if (subjects.length > 0) setAiQuizSubject(subjects[0]._id || subjects[0].id);
    setAiQuestionCount(10);
    setAiDifficulty('Medium');
    setAiQuestionType('Multiple Choice');
    setAiMarksPerQuestion(1);
    setAiDuration(15);
    setAiGeneratedQuiz(null);
    setShowAiQuizModal(true);
  };

  const handleAiFileSelect = (file) => {
    if (!file) return;
    setAiSourceFile(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    setAiQuizTitle(cleanTitle);
  };

  const handleGenerateAiQuiz = async () => {
    if (!aiSourceFile) return showToast('Please select a PDF or PPT source document', 'error');
    if (!aiQuizTitle.trim()) return showToast('Please enter a quiz title', 'error');
    if (!aiQuizSubject) return showToast('Please select a subject', 'error');

    setAiWizardStep(3); // Step 3: Generating progress
    setAiProgressText('Analyzing uploaded document...');

    const progressTimer1 = setTimeout(() => setAiProgressText('Extracting lecture content from slides & pages...'), 2500);
    const progressTimer2 = setTimeout(() => setAiProgressText('Generating questions using AI Model...'), 7000);
    const progressTimer3 = setTimeout(() => setAiProgressText('Validating questions and answers...'), 16000);

    const formData = new FormData();
    formData.append('file', aiSourceFile);
    formData.append('title', aiQuizTitle.trim());
    formData.append('subject', aiQuizSubject);
    formData.append('questionCount', aiQuestionCount);
    formData.append('difficulty', aiDifficulty);
    formData.append('questionType', aiQuestionType);
    formData.append('marksPerQuestion', aiMarksPerQuestion);
    formData.append('duration', aiDuration);

    try {
      const res = await elearningApi.generateQuizWithAi(formData);
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);

      if (res.data?.success && res.data?.quiz) {
        setAiGeneratedQuiz(res.data.quiz);
        setAiWizardStep(4); // Step 4: Preview and Edit
        showToast('Quiz generated successfully! You can now review and edit questions.', 'success');
      } else {
        throw new Error(res.data?.error || 'Invalid quiz generated.');
      }
    } catch (err) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      console.error('AI Quiz Generation Error:', err);
      const msg = err.response?.data?.error || err.message || 'Unable to generate quiz from this document. Please try another PDF/PPT.';
      showToast(msg, 'error');
      setAiWizardStep(2); // Go back to config
    }
  };

  // AI Preview Question Editing
  const handleEditAiQuestion = (qIndex, field, value) => {
    if (!aiGeneratedQuiz) return;
    setAiGeneratedQuiz(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], [field]: value };
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleEditAiOption = (qIndex, optIndex, value) => {
    if (!aiGeneratedQuiz) return;
    setAiGeneratedQuiz(prev => {
      const updatedQuestions = [...prev.questions];
      const newOptions = [...updatedQuestions[qIndex].options];
      newOptions[optIndex] = value;
      updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: newOptions };
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleDeleteAiQuestion = (qIndex) => {
    if (!aiGeneratedQuiz || aiGeneratedQuiz.questions.length <= 1) {
      return showToast('Quiz must contain at least 1 question', 'error');
    }
    setAiGeneratedQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIndex)
    }));
  };

  const handleAddAiQuestion = () => {
    if (!aiGeneratedQuiz) return;
    setAiGeneratedQuiz(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          marks: Number(aiMarksPerQuestion) || 1,
          explanation: ''
        }
      ]
    }));
  };

  const handleRegenerateSingleQuestion = async (qIndex) => {
    if (!aiGeneratedQuiz?.sourceTextSnippet) {
      return showToast('Source document content is not available for single regeneration', 'error');
    }
    setRegeneratingQuestionIdx(qIndex);
    try {
      const targetQ = aiGeneratedQuiz.questions[qIndex];
      const res = await elearningApi.regenerateQuizQuestion({
        sourceText: aiGeneratedQuiz.sourceTextSnippet,
        existingQuestionText: targetQ.questionText,
        difficulty: aiDifficulty,
        questionType: aiQuestionType,
        marks: targetQ.marks || 1
      });

      if (res.data?.success && res.data?.question) {
        setAiGeneratedQuiz(prev => {
          const updated = [...prev.questions];
          updated[qIndex] = res.data.question;
          return { ...prev, questions: updated };
        });
        showToast(`Question ${qIndex + 1} regenerated successfully!`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to regenerate question', 'error');
    } finally {
      setRegeneratingQuestionIdx(null);
    }
  };

  const handlePublishAiQuiz = async () => {
    if (!aiGeneratedQuiz) return;
    const questions = aiGeneratedQuiz.questions || [];
    if (questions.length === 0) return showToast('Quiz must have at least 1 question', 'error');

    // Validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return showToast(`Question ${i + 1} text cannot be blank`, 'error');
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) return showToast(`Question ${i + 1} Option ${String.fromCharCode(65 + j)} cannot be blank`, 'error');
      }
    }

    setSubmitting(true);
    try {
      await elearningApi.createQuiz({
        title: aiGeneratedQuiz.title.trim(),
        subject: aiQuizSubject,
        duration: Number(aiGeneratedQuiz.duration) || 15,
        questions: aiGeneratedQuiz.questions
      });

      showToast('AI-Generated Quiz published to students successfully!', 'success');
      setShowAiQuizModal(false);
      setAiGeneratedQuiz(null);
      const res = await elearningApi.getQuizzes();
      setQuizzes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to publish quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MANUAL QUIZ HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddManualQuestion = () => {
    setManualQuizQuestions(prev => [
      ...prev,
      { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, marks: 1, explanation: '' }
    ]);
  };

  const handleRemoveManualQuestion = (index) => {
    if (manualQuizQuestions.length <= 1) return showToast('Quiz must contain at least 1 question', 'error');
    setManualQuizQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualQuestionChange = (qIndex, field, value) => {
    setManualQuizQuestions(prev => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], [field]: value };
      return updated;
    });
  };

  const handleManualOptionChange = (qIndex, optIndex, value) => {
    setManualQuizQuestions(prev => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  };

  const handleCreateManualQuiz = async (e) => {
    e.preventDefault();
    if (!manualQuizTitle.trim()) return showToast('Please enter quiz title', 'error');
    if (!manualQuizSubject) return showToast('Please select a subject', 'error');
    if (manualQuizQuestions.length === 0) return showToast('Add at least one question', 'error');

    for (let i = 0; i < manualQuizQuestions.length; i++) {
      const q = manualQuizQuestions[i];
      if (!q.questionText.trim()) return showToast(`Question ${i + 1} prompt cannot be empty`, 'error');
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) return showToast(`Question ${i + 1} Option ${String.fromCharCode(65 + j)} cannot be empty`, 'error');
      }
    }

    setSubmitting(true);
    try {
      await elearningApi.createQuiz({
        title: manualQuizTitle.trim(),
        subject: manualQuizSubject,
        duration: Number(manualQuizDuration) || 15,
        questions: manualQuizQuestions
      });
      showToast('Quiz created and published successfully!', 'success');
      setManualQuizTitle('');
      setShowManualQuizForm(false);
      setManualQuizQuestions([{ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, marks: 1, explanation: '' }]);
      const res = await elearningApi.getQuizzes();
      setQuizzes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // QUIZ VIEW & EDIT / PREVIEW HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleOpenEditQuiz = async (quiz) => {
    setLoadingEditQuiz(true);
    try {
      const res = await elearningApi.getQuizById(quiz._id);
      if (res.data?.success && res.data?.quiz) {
        const qData = res.data.quiz;
        const normalizedQuestions = (qData.questions || []).map(q => {
          let opts = Array.isArray(q.options) ? [...q.options] : [];
          while (opts.length < 4) opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
          return {
            _id: q._id,
            questionText: q.questionText || '',
            options: opts,
            correctOptionIndex: parseInt(q.correctOptionIndex ?? 0, 10),
            marks: Number(q.marks) || 1,
            explanation: q.explanation || ''
          };
        });

        setEditingQuiz({
          _id: qData._id,
          title: qData.title || '',
          subject: qData.subject?._id || qData.subject || (subjects[0]?._id || ''),
          subjectObj: qData.subject,
          duration: qData.duration || 15,
          attemptCount: qData.attemptCount || 0,
          questions: normalizedQuestions
        });
      } else {
        throw new Error('Failed to load quiz details');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Unable to open quiz editor', 'error');
    } finally {
      setLoadingEditQuiz(false);
    }
  };

  const handleUpdateEditingQuestionField = (qIdx, field, value) => {
    setEditingQuiz(prev => {
      if (!prev) return prev;
      const updated = [...prev.questions];
      updated[qIdx] = { ...updated[qIdx], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const handleUpdateEditingOption = (qIdx, optIdx, value) => {
    setEditingQuiz(prev => {
      if (!prev) return prev;
      const updated = [...prev.questions];
      const newOpts = [...(updated[qIdx].options || ['', '', '', ''])];
      newOpts[optIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: newOpts };
      return { ...prev, questions: updated };
    });
  };

  const handleMoveEditingQuestion = (qIdx, direction) => {
    setEditingQuiz(prev => {
      if (!prev) return prev;
      const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
      if (targetIdx < 0 || targetIdx >= prev.questions.length) return prev;
      const questions = [...prev.questions];
      const temp = questions[qIdx];
      questions[qIdx] = questions[targetIdx];
      questions[targetIdx] = temp;
      return { ...prev, questions };
    });
  };

  const handleAddEditingQuestion = () => {
    setEditingQuiz(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: [
          ...prev.questions,
          {
            questionText: '',
            options: ['', '', '', ''],
            correctOptionIndex: 0,
            marks: 1,
            explanation: ''
          }
        ]
      };
    });
  };

  const handleDeleteEditingQuestion = (qIdx) => {
    if (!editingQuiz || editingQuiz.questions.length <= 1) {
      return showToast('Quiz must contain at least 1 question', 'error');
    }
    if (!window.confirm(`Delete Question ${qIdx + 1}? This question will be removed from the quiz.`)) {
      return;
    }
    setEditingQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIdx)
    }));
    showToast(`Question ${qIdx + 1} deleted`, 'info');
  };

  const handleSaveQuizChanges = async () => {
    if (!editingQuiz) return;
    if (!editingQuiz.title.trim()) return showToast('Quiz title cannot be empty', 'error');
    if (!editingQuiz.subject) return showToast('Please select a target subject', 'error');
    if (Number(editingQuiz.duration) <= 0) return showToast('Duration must be a positive number of minutes', 'error');

    const questions = editingQuiz.questions || [];
    if (questions.length === 0) return showToast('Quiz must contain at least 1 question', 'error');

    // Validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        return showToast(`Question ${i + 1} prompt cannot be blank`, 'error');
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          return showToast(`Question ${i + 1} Option ${String.fromCharCode(65 + j)} cannot be blank`, 'error');
        }
      }
      if (q.correctOptionIndex === undefined || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        return showToast(`Question ${i + 1} has an invalid correct answer choice`, 'error');
      }
    }

    setSavingEditQuiz(true);
    try {
      const payload = {
        title: editingQuiz.title.trim(),
        subject: editingQuiz.subject,
        duration: Number(editingQuiz.duration) || 15,
        questions: editingQuiz.questions.map(q => ({
          questionText: q.questionText.trim(),
          options: q.options.map(opt => opt.trim()),
          correctOptionIndex: parseInt(q.correctOptionIndex, 10),
          marks: Number(q.marks) || 1,
          explanation: (q.explanation || '').trim()
        }))
      };

      await elearningApi.updateQuiz(editingQuiz._id, payload);
      showToast('Quiz updated and saved successfully!', 'success');
      setEditingQuiz(null);
      // Refresh list
      const quizRes = await elearningApi.getQuizzes();
      setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Unable to update quiz. Please check fields and try again.', 'error');
    } finally {
      setSavingEditQuiz(false);
    }
  };

  const handleOpenPreview = () => {
    if (!editingQuiz || editingQuiz.questions.length === 0) {
      return showToast('Quiz must have at least 1 question to preview', 'error');
    }
    setPreviewQuestionIndex(0);
    setShowPreviewModal(true);
  };

  const handleDeleteQuiz = async (quiz) => {
    const quizId = quiz._id || quiz;
    const attemptCount = quiz.attemptCount || 0;
    
    let confirmMsg = 'Are you sure you want to delete this quiz?';
    if (attemptCount > 0) {
      confirmMsg = `⚠️ WARNING: This quiz has ${attemptCount} completed student attempt(s). Deleting it will permanently remove all student submissions and score records. Are you sure you want to proceed?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await elearningApi.deleteQuiz(quizId);
      showToast('Quiz deleted successfully', 'success');
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      if (editingQuiz?._id === quizId) setEditingQuiz(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete quiz', 'error');
    }
  };

  const handleOpenAttempts = async (quiz) => {
    setSelectedQuiz(quiz);
    setLoadingAttempts(true);
    try {
      const res = await elearningApi.getQuizAttempts(quiz._id);
      setQuizAttempts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load quiz attempts', 'error');
    } finally {
      setLoadingAttempts(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading your faculty learning portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Sub-Nav Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Course Content & Academic Resources</h2>
          <p className="text-xs text-slate-500 mt-1">Manage learning materials, assignments, and online assessments for your assigned subjects.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveSubTab('materials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'materials'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Materials ({materials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'assignments'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Assignments ({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('quizzes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              activeSubTab === 'quizzes'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Quizzes ({quizzes.length})</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. MATERIALS SECTION                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Study Materials & Notes</h3>
              <p className="text-xs text-slate-500">Upload lecture PDFs, slides, and syllabus notes for students.</p>
            </div>
            <Button
              onClick={() => setShowMaterialForm(!showMaterialForm)}
              disabled={subjects.length === 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
            >
              {showMaterialForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {showMaterialForm ? 'Cancel' : 'Upload Material'}
            </Button>
          </div>

          {/* Upload Material Form */}
          {showMaterialForm && (
            <Card className="rounded-3xl border-indigo-100 bg-indigo-50/30 shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-indigo-50">
                <CardTitle className="text-sm font-extrabold text-indigo-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-600" /> Upload Course Material
                </CardTitle>
                <CardDescription className="text-xs text-indigo-700">
                  Select your assigned subject and attach a PDF document or web resource.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleUploadMaterial} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Material Title *</label>
                      <Input
                        required
                        placeholder="e.g. Unit 3 - Network Layer Lecture Slides"
                        value={matTitle}
                        onChange={(e) => setMatTitle(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Target Subject *</label>
                      <select
                        value={matSubject}
                        onChange={(e) => setMatSubject(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {subjects.map((s) => (
                          <option key={s._id || s.id} value={s._id || s.id}>
                            {s.subject_name || s.name} ({s.subject_code || s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Format Type</label>
                      <select
                        value={matType}
                        onChange={(e) => setMatType(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pdf">PDF Document</option>
                        <option value="link">Web Resource / URL</option>
                        <option value="video">Video Recording Link</option>
                      </select>
                    </div>
                  </div>

                  {matType === 'link' ? (
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Resource URL *</label>
                      <Input
                        required
                        type="url"
                        placeholder="https://..."
                        value={matLinkUrl}
                        onChange={(e) => setMatLinkUrl(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs bg-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Document File (.pdf, .ppt, .pptx) *</label>
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx"
                        onChange={(e) => setMatFile(e.target.files[0])}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowMaterialForm(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <UploadCloud className="w-4 h-4 mr-1.5" />}
                      Publish Material
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Materials List */}
          {materials.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No learning materials uploaded yet</h4>
              <p className="text-xs text-slate-500 mt-1">Upload lecture presentations, problem sets, and syllabus notes for students.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((m) => (
                <div
                  key={m._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase">
                        {m.subject?.subject_code || 'COURSE'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        {m.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800 line-clamp-2">{m.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{m.subject?.subject_name}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(m._id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ASSIGNMENTS SECTION                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Student Coursework & Assignments</h3>
              <p className="text-xs text-slate-500">Post problem sets, laboratory tasks, and evaluate student submissions.</p>
            </div>
            <Button
              onClick={() => setShowAssignmentForm(!showAssignmentForm)}
              disabled={subjects.length === 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
            >
              {showAssignmentForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {showAssignmentForm ? 'Cancel' : 'Create Assignment'}
            </Button>
          </div>

          {/* Create Assignment Form */}
          {showAssignmentForm && (
            <Card className="rounded-3xl border-indigo-100 bg-indigo-50/30 shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-indigo-50">
                <CardTitle className="text-sm font-extrabold text-indigo-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> Create New Assignment
                </CardTitle>
                <CardDescription className="text-xs text-indigo-700">
                  Set due dates, task instructions, and optional worksheet files for your class.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Assignment Title *</label>
                      <Input
                        required
                        placeholder="e.g. Lab Exercise 4 - Routing Protocols"
                        value={assTitle}
                        onChange={(e) => setAssTitle(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Target Subject *</label>
                      <select
                        value={assSubject}
                        onChange={(e) => setAssSubject(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {subjects.map((s) => (
                          <option key={s._id || s.id} value={s._id || s.id}>
                            {s.subject_name || s.name} ({s.subject_code || s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Due Date *</label>
                      <Input
                        type="date"
                        required
                        value={assDueDate}
                        onChange={(e) => setAssDueDate(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Instructions & Problem Statement</label>
                    <textarea
                      rows={3}
                      placeholder="Enter detailed problem description or grading criteria..."
                      value={assDescription}
                      onChange={(e) => setAssDescription(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Attach Question/Worksheet Document (Optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                      onChange={(e) => setAssFile(e.target.files[0])}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAssignmentForm(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}
                      Publish Assignment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Assignments List */}
          {assignments.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No active assignments created</h4>
              <p className="text-xs text-slate-500 mt-1">Post assignments with due dates to collect and grade student coursework.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((a) => (
                <div
                  key={a._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase">
                        {a.subject?.subject_code || 'COURSE'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        <Clock className="w-3 h-3" /> Due: {new Date(a.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-800 line-clamp-2">{a.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{a.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenSubmissions(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors border-0 cursor-pointer text-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{a.submissionCount || 0} Submissions</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {a.attachmentUrl && (
                        <a
                          href={a.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Question File"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(a._id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-0 cursor-pointer"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Submissions Evaluation Modal ── */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Student Submissions</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAssignment.title} ({selectedAssignment.subject?.subject_code})</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {loadingSubmissions ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading student files...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No submissions received yet.</p>
                </div>
              ) : (
                submissions.map((sub) => (
                  <div key={sub._id} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">{sub.student?.name || 'Student'}</p>
                        <p className="text-[11px] text-slate-500">{sub.student?.email} · Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-indigo-600 font-bold hover:bg-indigo-50 text-xs shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View File
                      </a>
                    </div>

                    {/* Grading row */}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                      <div className="w-24">
                        <Input
                          placeholder="Grade (e.g. A, 90)"
                          value={gradingState[sub._id]?.grade || ''}
                          onChange={(e) => setGradingState({
                            ...gradingState,
                            [sub._id]: { ...gradingState[sub._id], grade: e.target.value }
                          })}
                          className="h-8 text-xs bg-white rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Feedback comment..."
                          value={gradingState[sub._id]?.feedback || ''}
                          onChange={(e) => setGradingState({
                            ...gradingState,
                            [sub._id]: { ...gradingState[sub._id], feedback: e.target.value }
                          })}
                          className="h-8 text-xs bg-white rounded-lg"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveGrade(sub._id)}
                        className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. QUIZZES SECTION (AI-POWERED + MANUAL)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Online Assessments & Quizzes</h3>
              <p className="text-xs text-slate-500">Generate automated quizzes instantly from lecture PDFs/PPTs with AI or construct them manually.</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Secondary: Manual Creator Button */}
              <Button
                variant="outline"
                onClick={() => setShowManualQuizForm(!showManualQuizForm)}
                disabled={subjects.length === 0}
                className="rounded-xl text-slate-700 font-bold text-xs border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                {showManualQuizForm ? <X className="w-4 h-4 mr-1.5" /> : <Edit3 className="w-4 h-4 mr-1.5" />}
                {showManualQuizForm ? 'Cancel Manual' : 'Create Manually'}
              </Button>

              {/* PRIMARY: AI Generator Button */}
              <Button
                onClick={handleOpenAiQuizModal}
                disabled={subjects.length === 0}
                className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300 animate-pulse" />
                Generate Quiz with AI
              </Button>
            </div>
          </div>

          {/* Secondary Manual Quiz Form */}
          {showManualQuizForm && (
            <Card className="rounded-3xl border-indigo-100 bg-indigo-50/30 shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-indigo-50">
                <CardTitle className="text-sm font-extrabold text-indigo-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600" /> Construct Objective Quiz Manually
                </CardTitle>
                <CardDescription className="text-xs text-indigo-700">
                  Write individual questions, define options, and assign marks.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateManualQuiz} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Quiz Title *</label>
                      <Input
                        required
                        placeholder="e.g. Unit 2 - Process Scheduling Test"
                        value={manualQuizTitle}
                        onChange={(e) => setManualQuizTitle(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Target Subject *</label>
                      <select
                        value={manualQuizSubject}
                        onChange={(e) => setManualQuizSubject(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {subjects.map((s) => (
                          <option key={s._id || s.id} value={s._id || s.id}>
                            {s.subject_name || s.name} ({s.subject_code || s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Duration (Minutes) *</label>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={manualQuizDuration}
                        onChange={(e) => setManualQuizDuration(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Question Builders */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                        Questions ({manualQuizQuestions.length})
                      </h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddManualQuestion}
                        className="rounded-xl text-xs border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                      </Button>
                    </div>

                    {manualQuizQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-600">Question {qIndex + 1}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">Marks:</span>
                              <input
                                type="number"
                                min="1"
                                value={q.marks || 1}
                                onChange={(e) => handleManualQuestionChange(qIndex, 'marks', e.target.value)}
                                className="w-12 h-7 text-xs border border-slate-200 rounded-lg text-center"
                              />
                            </div>
                            {manualQuizQuestions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveManualQuestion(qIndex)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <Input
                          placeholder="Enter question prompt..."
                          value={q.questionText}
                          onChange={(e) => handleManualQuestionChange(qIndex, 'questionText', e.target.value)}
                          className="rounded-xl text-xs"
                        />

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`manual-correct-${qIndex}`}
                                checked={q.correctOptionIndex === optIndex}
                                onChange={() => handleManualQuestionChange(qIndex, 'correctOptionIndex', optIndex)}
                                className="w-4 h-4 text-indigo-600 cursor-pointer"
                                title="Set as correct answer"
                              />
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                value={opt}
                                onChange={(e) => handleManualOptionChange(qIndex, optIndex, e.target.value)}
                                className="rounded-lg text-xs h-8"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowManualQuizForm(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                      Publish Manual Quiz
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Quizzes List */}
          {quizzes.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
              <Sparkles className="w-12 h-12 text-indigo-400 mx-auto" />
              <div>
                <h4 className="text-base font-extrabold text-slate-800">No quizzes published yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Use the AI Quiz Generator to instantly convert your PowerPoint slides or PDF notes into comprehensive multiple-choice assessments.
                </p>
              </div>
              <Button
                onClick={handleOpenAiQuizModal}
                disabled={subjects.length === 0}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Generate First Quiz with AI
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((q) => (
                <div
                  key={q._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase">
                        {q.subject?.subject_code || 'COURSE'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        <Clock className="w-3 h-3" /> {q.duration} mins
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-800">{q.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-2">
                      <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> {q.questions?.length || 0} Questions</span>
                      <span>•</span>
                      <span>{q.subject?.subject_name}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenAttempts(q)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors border-0 cursor-pointer text-xs"
                      title="View Student Attempts"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{q.attemptCount || 0} Attempts</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* View & Edit Quiz Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditQuiz(q)}
                        disabled={loadingEditQuiz}
                        className="rounded-xl border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-50 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> View & Edit
                      </Button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(q)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-0 cursor-pointer"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. COMPLETE VIEW & EDIT QUIZ MODAL                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[10px] uppercase">
                      Academic Quiz Editor
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {editingQuiz.questions?.length || 0} Questions
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-800 mt-0.5">{editingQuiz.title}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingQuiz(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer border-0 transition-colors"
                title="Close Editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-6">

              {/* Warning if quiz already has attempts (Phase 5) */}
              {editingQuiz.attemptCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-amber-950">Notice: Quiz has {editingQuiz.attemptCount} completed student attempt(s)</p>
                    <p className="text-amber-800 leading-relaxed">
                      Editing question prompts or altering correct answer keys will change evaluation for future test takers while historical records remain intact.
                    </p>
                  </div>
                </div>
              )}

              {/* Quiz Metadata Config Section */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Assessment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Quiz Title *</label>
                    <Input
                      required
                      placeholder="Quiz Title"
                      value={editingQuiz.title}
                      onChange={(e) => setEditingQuiz(prev => ({ ...prev, title: e.target.value }))}
                      className="rounded-xl border-slate-200 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Target Subject *</label>
                    <select
                      value={editingQuiz.subject}
                      onChange={(e) => setEditingQuiz(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {subjects.map((s) => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.subject_name || s.name} ({s.subject_code || s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Duration (Minutes) *</label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={editingQuiz.duration}
                      onChange={(e) => setEditingQuiz(prev => ({ ...prev, duration: e.target.value }))}
                      className="rounded-xl border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Questions List & Inline Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                      Questions ({editingQuiz.questions?.length || 0})
                    </h4>
                    <p className="text-[11px] text-slate-500">Edit question prompts, choices, select the correct answer, and add educational explanations.</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddEditingQuestion}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {editingQuiz.questions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:border-indigo-200 transition-colors"
                    >
                      {/* Question Item Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-black text-xs">
                            Question {qIdx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-slate-500">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={q.marks || 1}
                              onChange={(e) => handleUpdateEditingQuestionField(qIdx, 'marks', e.target.value)}
                              className="w-14 h-7 text-xs font-bold border border-slate-200 rounded-lg text-center bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Move Up */}
                          <button
                            type="button"
                            disabled={qIdx === 0}
                            onClick={() => handleMoveEditingQuestion(qIdx, 'up')}
                            className={`p-1.5 rounded-lg border-0 transition-colors ${
                              qIdx === 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer'
                            }`}
                            title="Move Question Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            disabled={qIdx === editingQuiz.questions.length - 1}
                            onClick={() => handleMoveEditingQuestion(qIdx, 'down')}
                            className={`p-1.5 rounded-lg border-0 transition-colors ${
                              qIdx === editingQuiz.questions.length - 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer'
                            }`}
                            title="Move Question Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Delete Question */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEditingQuestion(qIdx)}
                            disabled={editingQuiz.questions.length <= 1}
                            className={`p-1.5 rounded-lg border-0 transition-colors ${
                              editingQuiz.questions.length <= 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Prompt */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Question Prompt *</label>
                        <textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) => handleUpdateEditingQuestionField(qIdx, 'questionText', e.target.value)}
                          placeholder="Type question prompt here..."
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                      </div>

                      {/* Options Grid */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          Options & Correct Answer Selection:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctOptionIndex === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                  <input
                                    type="radio"
                                    name={`edit-correct-opt-${qIdx}`}
                                    checked={isCorrect}
                                    onChange={() => handleUpdateEditingQuestionField(qIdx, 'correctOptionIndex', optIdx)}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                </label>

                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleUpdateEditingOption(qIdx, optIdx, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  className="w-full text-xs border-0 bg-transparent focus:outline-none font-medium text-slate-800"
                                />

                                {isCorrect && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase shrink-0">
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation Field (Phase 12) */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 mb-1">
                          <Info className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Key Concept & Explanation (shown in post-quiz student review):</span>
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateEditingQuestionField(qIdx, 'explanation', e.target.value)}
                          placeholder="Explain why the correct option is right and clarify common misconceptions..."
                          className="w-full text-xs border border-indigo-100 rounded-xl p-2.5 bg-indigo-50/30 text-indigo-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddEditingQuestion}
                    className="rounded-2xl border-dashed border-indigo-300 text-indigo-700 font-bold text-xs hover:bg-indigo-50 w-full py-5"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Append Another Question
                  </Button>
                </div>
              </div>

            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                className="rounded-xl border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-50 cursor-pointer shadow-2xs"
              >
                <Eye className="w-4 h-4 mr-1.5" /> Preview Quiz
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingQuiz(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSaveQuizChanges}
                  disabled={savingEditQuiz}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  {savingEditQuiz ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. TEACHER PREVIEW MODAL (PHASE 14)                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPreviewModal && editingQuiz && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Banner Notice */}
            <div className="p-3 bg-amber-500 text-amber-950 font-black text-center text-xs tracking-wide flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />
              <span>Teacher Assessment Preview · No Student Attempts Recorded</span>
            </div>

            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/40">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-black text-[10px] uppercase">
                  {editingQuiz.title}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Question {previewQuestionIndex + 1} of {editingQuiz.questions?.length || 0} · Duration: {editingQuiz.duration} mins
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-white cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Question Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              {(() => {
                const q = editingQuiz.questions[previewQuestionIndex];
                if (!q) return null;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-600">Question {previewQuestionIndex + 1}</span>
                      <span className="text-[11px] font-bold text-slate-400">{q.marks || 1} mark(s)</span>
                    </div>

                    <p className="text-sm font-extrabold text-slate-800 leading-relaxed">{q.questionText}</p>

                    {/* Options list with correct highlight */}
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctOptionIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center justify-between gap-2 p-3 rounded-2xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs font-bold text-emerald-950'
                                : 'bg-slate-50/60 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="text-xs">{opt}</span>
                            </div>

                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase">
                                <Check className="w-3 h-3 stroke-[3]" /> Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-[11px] text-indigo-900 uppercase">
                            Concept Explanation:
                          </span>
                          <p className="text-xs text-indigo-800 leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Preview Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={previewQuestionIndex === 0}
                onClick={() => setPreviewQuestionIndex(prev => Math.max(0, prev - 1))}
                className="rounded-xl text-xs"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>

              <span className="text-xs font-bold text-slate-500">
                {previewQuestionIndex + 1} / {editingQuiz.questions?.length || 0}
              </span>

              {previewQuestionIndex < editingQuiz.questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setPreviewQuestionIndex(prev => Math.min(editingQuiz.questions.length - 1, prev + 1))}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Close Preview
                </Button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. AI QUIZ GENERATION MODAL WIZARD                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAiQuizModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header with Stepper */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">AI Quiz Assistant</h3>
                  <p className="text-xs text-slate-500">Generate structured academic assessments from lecture slides & notes.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiQuizModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-white cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 sm:gap-8 mx-auto font-bold">
                <div className={`flex items-center gap-1.5 ${aiWizardStep >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${aiWizardStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
                  <span>Upload</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-200" />
                <div className={`flex items-center gap-1.5 ${aiWizardStep >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${aiWizardStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
                  <span>Configure</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-200" />
                <div className={`flex items-center gap-1.5 ${aiWizardStep >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${aiWizardStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
                  <span>Generate</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-200" />
                <div className={`flex items-center gap-1.5 ${aiWizardStep >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${aiWizardStep >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
                  <span>Review & Edit</span>
                </div>
              </div>
            </div>

            {/* Stepper Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">

              {/* ── STEP 1: Upload Source Document ── */}
              {aiWizardStep === 1 && (
                <div className="space-y-6 text-center py-4">
                  <div className="max-w-md mx-auto">
                    <div className="border-2 border-dashed border-indigo-200 rounded-3xl p-8 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
                        onChange={(e) => handleAiFileSelect(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                      <h4 className="text-sm font-extrabold text-slate-800">
                        {aiSourceFile ? aiSourceFile.name : 'Choose Lecture PDF or PowerPoint (.ppt, .pptx)'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {aiSourceFile
                          ? `${(aiSourceFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file`
                          : 'Drag and drop or browse files from your computer'}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs text-slate-400 font-medium mt-4">
                      <span>✓ Lecture Notes (PDF)</span>
                      <span>✓ Presentation Slides (PPTX)</span>
                      <span>✓ Plain Notes (.txt)</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAiQuizModal(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!aiSourceFile) return showToast('Please select a lecture file first', 'error');
                        setAiWizardStep(2);
                      }}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      Next: Configure Quiz <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Configure Generation Parameters ── */}
              {aiWizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Quiz Title *</label>
                      <Input
                        required
                        placeholder="e.g. Chapter 3 - Distributed Systems Quiz"
                        value={aiQuizTitle}
                        onChange={(e) => setAiQuizTitle(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Target Subject *</label>
                      <select
                        value={aiQuizSubject}
                        onChange={(e) => setAiQuizSubject(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {subjects.map((s) => (
                          <option key={s._id || s.id} value={s._id || s.id}>
                            {s.subject_name || s.name} ({s.subject_code || s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Number of Questions</label>
                      <select
                        value={aiQuestionCount}
                        onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={5}>5 Questions (Quick Check)</option>
                        <option value={10}>10 Questions (Standard Quiz)</option>
                        <option value={15}>15 Questions (Midterm Practice)</option>
                        <option value={20}>20 Questions (Comprehensive Test)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Difficulty Level</label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Easy">Easy (Recall & Definitions)</option>
                        <option value="Medium">Medium (Conceptual & Analytical)</option>
                        <option value="Hard">Hard (Problem Solving & Application)</option>
                        <option value="Mixed">Mixed (Balanced Coverage)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Marks per Question</label>
                      <Input
                        type="number"
                        min="1"
                        value={aiMarksPerQuestion}
                        onChange={(e) => setAiMarksPerQuestion(Number(e.target.value))}
                        className="rounded-xl border-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Duration (Minutes)</label>
                      <Input
                        type="number"
                        min="1"
                        value={aiDuration}
                        onChange={(e) => setAiDuration(Number(e.target.value))}
                        className="rounded-xl border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAiWizardStep(1)}
                      className="rounded-xl text-xs"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </Button>
                    <Button
                      onClick={handleGenerateAiQuiz}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" /> Synthesize Assessment with AI
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Progress State ── */}
              {aiWizardStep === 3 && (
                <div className="py-16 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-25" />
                    <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-inner">
                      <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-800">{aiProgressText}</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      AI is formulating high-quality multiple choice questions based on your lecture material.
                    </p>
                  </div>

                  <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse" />
                  </div>
                </div>
              )}

              {/* ── STEP 4: Interactive Quiz Preview & Editor ── */}
              {aiWizardStep === 4 && aiGeneratedQuiz && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <div>
                      <h4 className="text-sm font-extrabold text-indigo-950">{aiGeneratedQuiz.title}</h4>
                      <p className="text-xs text-indigo-700">
                        {aiGeneratedQuiz.questions?.length || 0} Questions · {aiDuration} minutes · Review & customize before publishing
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddAiQuestion}
                      className="rounded-xl text-xs border-indigo-200 text-indigo-700 font-bold hover:bg-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {(aiGeneratedQuiz.questions || []).map((q, qIndex) => (
                      <div key={qIndex} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-600">Question {qIndex + 1}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-400">Marks:</span>
                              <input
                                type="number"
                                min="1"
                                value={q.marks || 1}
                                onChange={(e) => handleEditAiQuestion(qIndex, 'marks', e.target.value)}
                                className="w-12 h-6 text-xs border border-slate-200 rounded text-center"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Regenerate Question */}
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingleQuestion(qIndex)}
                              disabled={regeneratingQuestionIdx === qIndex}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                              title="Regenerate this single question"
                            >
                              <RefreshCw className={`w-3 h-3 ${regeneratingQuestionIdx === qIndex ? 'animate-spin' : ''}`} />
                              <span>Regenerate</span>
                            </button>

                            {/* Delete Question */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAiQuestion(qIndex)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) => handleEditAiQuestion(qIndex, 'questionText', e.target.value)}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Question prompt..."
                        />

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50/30">
                              <input
                                type="radio"
                                name={`ai-correct-${qIndex}`}
                                checked={q.correctOptionIndex === optIndex}
                                onChange={() => handleEditAiQuestion(qIndex, 'correctOptionIndex', optIndex)}
                                className="w-4 h-4 text-indigo-600 cursor-pointer"
                                title="Mark as correct answer"
                              />
                              <span className="text-[11px] font-black text-slate-400 w-4 text-center">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleEditAiOption(qIndex, optIndex, e.target.value)}
                                className="w-full text-xs bg-transparent border-0 focus:outline-none"
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAiWizardStep(2)}
                      className="rounded-xl text-xs"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Config
                    </Button>

                    <Button
                      onClick={handlePublishAiQuiz}
                      disabled={submitting}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                      Publish Quiz to Students
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quiz Attempts Evaluation Modal ── */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Student Quiz Attempts</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedQuiz.title} ({selectedQuiz.subject?.subject_code})</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuiz(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {loadingAttempts ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading student scores...</p>
                </div>
              ) : quizAttempts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No student attempts recorded yet.</p>
                </div>
              ) : (
                quizAttempts.map((att) => (
                  <div key={att._id} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{att.student?.name || 'Student'}</p>
                      <p className="text-[11px] text-slate-500">{att.student?.email} · Completed: {new Date(att.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200">
                      Score: {att.score} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
