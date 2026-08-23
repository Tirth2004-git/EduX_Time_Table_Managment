import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen, FileText, UploadCloud, CheckCircle, ExternalLink,
  Clock, Award, AlertCircle, RefreshCw, X, Check, Eye,
  HelpCircle, Sparkles, CheckSquare, XCircle, AlertTriangle, Info,
  TrendingUp, BarChart2
} from 'lucide-react';
import elearningApi from '@/services/api/elearningApi';
import { showToast } from '@/components/ui/toast';

export default function StudentElearning() {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'assignments' | 'quizzes'
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Quiz Attempt State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  // Detailed Quiz Result & Answer Review Modal State
  const [quizReviewData, setQuizReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // File upload state for assignments
  const [submittingAssId, setSubmittingAssId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [matRes, assRes, quizRes] = await Promise.all([
        elearningApi.getMaterials(),
        elearningApi.getAssignments(),
        elearningApi.getQuizzes()
      ]);
      setMaterials(Array.isArray(matRes.data) ? matRes.data : []);
      setAssignments(Array.isArray(assRes.data) ? assRes.data : []);
      setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
    } catch (err) {
      console.error('Failed to load student elearning data:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to load course content';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignmentSubmit = async (assignmentId) => {
    const file = selectedFiles[assignmentId];
    if (!file) return showToast('Please select a solution file first', 'error');

    setSubmittingAssId(assignmentId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await elearningApi.submitAssignment(assignmentId, formData);
      showToast('Assignment submitted successfully!', 'success');
      setSelectedFiles(prev => ({ ...prev, [assignmentId]: null }));
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit assignment', 'error');
    } finally {
      setSubmittingAssId(null);
    }
  };

  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setQuizAnswers({});
  };

  const handleQuizAnswerSelect = (qIdx, optIdx) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const questions = activeQuiz.questions || [];
    const answersArray = [];
    for (let i = 0; i < questions.length; i++) {
      if (quizAnswers[i] === undefined) {
        return showToast(`Please answer Question ${i + 1} before submitting`, 'error');
      }
      answersArray.push(quizAnswers[i]);
    }

    setQuizSubmitting(true);
    try {
      const res = await elearningApi.submitQuiz(activeQuiz._id, { answers: answersArray });
      showToast('Quiz evaluated and submitted successfully!', 'success');
      setActiveQuiz(null); // Close taking modal
      setQuizReviewData(res.data); // Open rich review modal immediately!
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit quiz', 'error');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleViewQuizResult = async (quizId) => {
    setLoadingReview(true);
    try {
      const res = await elearningApi.getQuizResult(quizId);
      if (res.data?.success) {
        setQuizReviewData(res.data);
      } else {
        throw new Error('Could not load quiz review data');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load quiz results', 'error');
    } finally {
      setLoadingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading your class study materials and coursework...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Sub-Nav Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Course Learning Materials & Tasks</h2>
          <p className="text-xs text-slate-500 mt-1">Scoped to your enrolled department, semester, and course subjects.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'materials'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Materials ({materials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'assignments'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Assignments ({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'quizzes'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Quizzes ({quizzes.length})</span>
          </button>
        </div>
      </div>

      {/* ── 1. MATERIALS TAB ── */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {materials.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No study materials available</h4>
              <p className="text-xs text-slate-500 mt-1">Your subject faculty will upload notes, lecture slides, and PDFs here.</p>
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
                    <h4 className="text-sm font-extrabold text-slate-800">{m.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{m.subject?.subject_name}</p>
                    {m.uploadedBy && (
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">Faculty: {m.uploadedBy.faculty_name || m.uploadedBy.name}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View / Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 2. ASSIGNMENTS TAB ── */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No assignments active</h4>
              <p className="text-xs text-slate-500 mt-1">Check back later for coursework assigned by your faculty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((a) => {
                const isSubmitted = !!a.mySubmission;
                return (
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

                      <h4 className="text-sm font-extrabold text-slate-800">{a.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3 mt-1.5 leading-relaxed">{a.description}</p>
                      {a.attachmentUrl && (
                        <a
                          href={a.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline mt-2"
                        >
                          <ExternalLink className="w-3 h-3" /> Download Question File
                        </a>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                      {isSubmitted ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Submitted
                            </span>
                            <a
                              href={a.mySubmission.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-700 font-bold underline"
                            >
                              My File
                            </a>
                          </div>
                          {a.mySubmission.grade && (
                            <p className="text-xs font-extrabold text-emerald-900 mt-1">
                              Grade: <span className="underline">{a.mySubmission.grade}</span>
                            </p>
                          )}
                          {a.mySubmission.feedback && (
                            <p className="text-[11px] text-emerald-700 italic">
                              "{a.mySubmission.feedback}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="file"
                            id={`file-${a._id}`}
                            onChange={(e) => setSelectedFiles(prev => ({ ...prev, [a._id]: e.target.files[0] }))}
                            className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAssignmentSubmit(a._id)}
                            disabled={submittingAssId === a._id}
                            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                          >
                            {submittingAssId === a._id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <UploadCloud className="w-3.5 h-3.5 mr-1" />
                            )}
                            Submit Solution
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 3. QUIZZES TAB ── */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No quizzes available</h4>
              <p className="text-xs text-slate-500 mt-1">Subject teachers will release quizzes and tests for your semester courses.</p>
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
                    <p className="text-xs text-slate-500 mt-1">{q.subject?.subject_name}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">{q.questions?.length || 0} Questions</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {q.attempted ? (
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200">
                          <Award className="w-3.5 h-3.5" /> Score: {q.attempt?.score} pts
                        </span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQuizResult(q._id)}
                          disabled={loadingReview}
                          className="rounded-xl border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-50 cursor-pointer shadow-2xs"
                        >
                          <BarChart2 className="w-3.5 h-3.5 mr-1" /> View Result
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleStartQuiz(q)}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                      >
                        Attempt Quiz
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quiz Taking Modal ── */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-black text-[10px] uppercase">
                  {activeQuiz.subject?.subject_code}
                </span>
                <h3 className="text-base font-extrabold text-slate-800 mt-1">{activeQuiz.title}</h3>
                <p className="text-xs text-slate-500">Duration: {activeQuiz.duration} minutes · Single attempt only</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuiz(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-white cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-6">
                {(activeQuiz.questions || []).map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-600">Question {qIdx + 1}</span>
                      <span className="text-[11px] font-bold text-slate-400">{q.marks || 1} mark(s)</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">{q.questionText}</p>

                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            quizAnswers[qIdx] === optIdx
                              ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/80'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz-opt-${qIdx}`}
                            checked={quizAnswers[qIdx] === optIdx}
                            onChange={() => handleQuizAnswerSelect(qIdx, optIdx)}
                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveQuiz(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={quizSubmitting}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                >
                  {quizSubmitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                  Submit Quiz Answers
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. DETAILED QUIZ RESULT & ANSWER REVIEW MODAL                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {quizReviewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Award className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[10px] uppercase">
                      {quizReviewData.quiz?.subject?.subject_code || 'ASSESSMENT'}
                    </span>
                    <h3 className="text-base font-black text-slate-800">Quiz Performance Review</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{quizReviewData.quiz?.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuizReviewData(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer border-0 transition-colors"
                title="Close review"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Review Body */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-6">

              {/* ── Top Score & Stats Summary Card ── */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Overall Academic Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {quizReviewData.result?.score}
                      </span>
                      <span className="text-lg text-slate-400 font-bold">
                        / {quizReviewData.result?.totalMarks} marks
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Grade Percentage</p>
                      <p className="text-2xl font-black text-emerald-400">
                        {quizReviewData.result?.percentage}%
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xl font-bold">
                      {quizReviewData.result?.percentage >= 70 ? '🎉' : quizReviewData.result?.percentage >= 40 ? '👍' : '📖'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        quizReviewData.result?.percentage >= 70
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                          : quizReviewData.result?.percentage >= 40
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                          : 'bg-gradient-to-r from-rose-500 to-red-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, quizReviewData.result?.percentage || 0))}%` }}
                    />
                  </div>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xs">
                    <p className="text-xs text-emerald-300 font-bold uppercase">Correct</p>
                    <p className="text-xl font-black text-emerald-200 mt-0.5">{quizReviewData.result?.correctCount}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 backdrop-blur-xs">
                    <p className="text-xs text-rose-300 font-bold uppercase">Incorrect</p>
                    <p className="text-xl font-black text-rose-200 mt-0.5">{quizReviewData.result?.wrongCount}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-700/40 border border-slate-600/30 backdrop-blur-xs">
                    <p className="text-xs text-slate-300 font-bold uppercase">Unanswered</p>
                    <p className="text-xl font-black text-slate-200 mt-0.5">{quizReviewData.result?.unansweredCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* ── Visual Legend ── */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Answer Review Guide:
                </span>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    Correct Answer
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-800">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                    Your Incorrect Selection
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                    Neutral Option
                  </span>
                </div>
              </div>

              {/* ── Question-by-Question Detailed Review ── */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800">Question-by-Question Breakdown</h4>

                {(quizReviewData.questions || []).map((q, qIdx) => {
                  const isCorrect = q.isCorrect;
                  const isUnanswered = q.isUnanswered;

                  return (
                    <div
                      key={qIdx}
                      className={`p-5 rounded-3xl border transition-all space-y-4 ${
                        isCorrect
                          ? 'bg-emerald-50/30 border-emerald-200 shadow-2xs'
                          : isUnanswered
                          ? 'bg-slate-50/70 border-slate-200 shadow-2xs'
                          : 'bg-rose-50/30 border-rose-200 shadow-2xs'
                      }`}
                    >
                      {/* Question Card Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-black text-xs">
                            Question {q.questionNumber || qIdx + 1}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {q.marks || 1} mark(s)
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                            <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                            Correct (+{q.marks} pts)
                          </span>
                        ) : isUnanswered ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-200 text-slate-700 font-black text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                            Not Answered (0 pts)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-100 text-rose-800 font-black text-xs border border-rose-300">
                            <X className="w-3.5 h-3.5 text-rose-700 stroke-[3]" />
                            Incorrect (0 pts)
                          </span>
                        )}
                      </div>

                      {/* Question Prompt */}
                      <p className="text-sm font-extrabold text-slate-900 leading-relaxed">
                        {q.questionText}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {(q.options || []).map((opt, optIdx) => {
                          const isThisCorrect = optIdx === q.correctOptionIndex;
                          const isThisSelected = optIdx === q.selectedOptionIndex;

                          let optionStyle = 'bg-white border-slate-200 text-slate-700';
                          let badge = null;

                          if (isThisCorrect) {
                            optionStyle = 'bg-emerald-100/90 border-2 border-emerald-500 text-emerald-950 font-bold shadow-xs';
                            badge = (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" /> Correct
                              </span>
                            );
                          } else if (isThisSelected) {
                            optionStyle = 'bg-rose-100/90 border-2 border-rose-400 text-rose-950 font-bold shadow-xs';
                            badge = (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase shrink-0">
                                <X className="w-3 h-3 stroke-[3]" /> Your Choice
                              </span>
                            );
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center justify-between gap-2 p-3 rounded-2xl border transition-all ${optionStyle}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                                  isThisCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isThisSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="text-xs font-medium">{opt}</span>
                              </div>
                              {badge}
                            </div>
                          );
                        })}
                      </div>

                      {/* Educational Explanation Box (highlighted for incorrect or when available) */}
                      {q.explanation && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
                          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-[11px] text-indigo-900 uppercase">
                              Key Concept & Explanation:
                            </span>
                            <p className="text-xs text-indigo-800 leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Completed on {new Date(quizReviewData.result?.submittedAt || Date.now()).toLocaleDateString()}
              </span>
              <Button
                onClick={() => setQuizReviewData(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Close Review
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
