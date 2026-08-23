import api from './index';

const elearningApi = {
  // Subjects
  getTeacherSubjects: () => api.get('/elearning/teacher-subjects'),

  // Material
  getMaterials: () => api.get('/elearning/material'),
  uploadMaterial: (formData) => api.post('/elearning/material', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMaterial: (id) => api.delete(`/elearning/material/${id}`),
  
  // Assignment
  getAssignments: () => api.get('/elearning/assignment'),
  createAssignment: (formData) => api.post('/elearning/assignment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAssignment: (id) => api.delete(`/elearning/assignment/${id}`),
  getSubmissions: (assignmentId) => api.get(`/elearning/assignment/${assignmentId}/submissions`),
  submitAssignment: (assignmentId, formData) => api.post(`/elearning/assignment/${assignmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  gradeSubmission: (submissionId, data) => api.put(`/elearning/submission/${submissionId}/grade`, data),

  // Quiz
  getQuizzes: () => api.get('/elearning/quiz'),
  getQuizById: (id) => api.get(`/elearning/quiz/${id}`),
  createQuiz: (quizData) => api.post('/elearning/quiz', quizData),
  updateQuiz: (id, quizData) => api.put(`/elearning/quiz/${id}`, quizData),
  deleteQuiz: (id) => api.delete(`/elearning/quiz/${id}`),
  getQuizAttempts: (quizId) => api.get(`/elearning/quiz/${quizId}/attempts`),
  submitQuiz: (quizId, answersData) => api.post(`/elearning/quiz/${quizId}/submit`, answersData),
  getQuizResult: (quizId) => api.get(`/elearning/quiz/${quizId}/result`),

  // AI Quiz Generation
  generateQuizWithAi: (formData) => api.post('/elearning/quiz/generate-ai', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 70000 // 70s timeout for AI document analysis
  }),
  regenerateQuizQuestion: (payload) => api.post('/elearning/quiz/regenerate-question', payload)
};

export default elearningApi;
