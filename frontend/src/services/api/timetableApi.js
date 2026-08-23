import api from './index';

export const timetableApi = {
  list: (params) => api.get('/timetable/list', { params }),
  add: (data) => api.post('/timetable/add', data),
  delete: (id) => api.delete(`/timetable/delete`, { params: { id } }),
  global: (params) => api.get('/timetable/global', { params }),
  preview: (params) => api.get('/timetable/preview', { params }),
  getStudentTimetable: () => api.get('/timetable/student/me'),
  getAvailableStudentTimetables: () => api.get('/timetable/student/available'),
  getPublishedStudentTimetable: (params) => api.get('/timetable/student/view', { params }),
  save: (data) => api.post('/timetable/save', data),
  getSaved: (params) => api.get('/timetable/save', { params }),
  reset: (params) => api.delete('/timetable/reset', { params }),
  setHoliday: (data) => api.post('/timetable/set-holiday', data),
  suggestSlot: (data) => api.post('/timetable/suggest-slot', data),
  validate: (data) => api.post('/timetable/validate', data),
  autoGenerate: (data) => api.post('/timetable/auto-generate', data),
  smartGenerate: (data) => api.post('/timetable/smart-generate', data),
  getWeeklyConfig: (params) => api.get('/timetable/weekly-config', { params }),
  move: (data) => api.patch('/timetable/move', data),
  copy: (data) => api.post('/timetable/copy', data),
  updateTeacher: (data) => api.patch('/timetable/update-teacher', data),
  share: (data) => api.post('/timetable/share', data),
  getShared: (token) => api.get(`/timetable/shared/${token}`),
  
  // New Persistence DB APIs
  saveGenerated: (data) => api.post('/timetable/generate', data),
  // Normalize generator output to the persistence API contract in one place.
  saveGeneratedEntries: ({ departmentId, semesterId, divisionId, academicYear, mode, entries }) => api.post('/timetable/generate', {
    department: departmentId,
    semester: semesterId,
    divisionId,
    academicYear,
    mode,
    entries: entries.map((entry) => ({
      subjectId: entry.subjectId || entry.subject,
      teacherId: entry.teacherId || entry.teacher,
      roomId: entry.roomId || entry.classroom || entry.laboratory,
      day: entry.day,
      period: entry.period || entry.timeSlot,
      type: entry.type || (entry.isLab || entry.slot_type === 'LAB' ? 'LAB' : entry.slot_type === 'LIBRARY' ? 'LIBRARY' : entry.slot_type === 'FREE' ? 'FREE' : 'THEORY'),
      duration: entry.duration,
      subjectCode: entry.subjectCode,
    })),
  }),
  saveDraft: (data) => api.post('/timetable/draft', data),
  getDivisionTimetable: (division_id) => api.get(`/timetable/division/${division_id}`, { params: { t: Date.now() } }),
  getTeacherTimetable: (teacher_id) => api.get(`/timetable/teacher/${teacher_id}`),
  getAvailableFaculty: (subject_id, params) => api.get(`/timetable/available-faculty/${subject_id}`, { params }),
  getAvailableRooms: (params) => api.get(`/timetable/available-rooms`, { params }),
  
  // Bulk Import
  importExcel: (formData) => api.post('/import/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Analytics
  getAnalytics: (params) => api.get('/analytics', { params }),
  
  // AI replacement recommendation
  suggestReplacement: (data) => api.post('/ai/replacement', data),
  explainCopilot: (data) => api.post('/ai/explain', data),

  // New Slot management & Undo/Redo/Audit functions
  validateChange: (data) => api.post('/timetable/validate-change', data),
  getReplacementFaculty: (data) => api.post('/timetable/replacement-eligibility', data),
  checkMove: (data) => api.post('/timetable/move-check', data),
  suggestFix: (data) => api.post('/timetable/suggest-fix', data),
  getAuditLogs: () => api.get('/timetable/audit-logs'),
  undo: () => api.post('/timetable/history/undo'),
  redo: () => api.post('/timetable/history/redo'),
};

export default timetableApi;
