# EduX Bug Fix Plan

This document outlines the systematic, prioritized fix plan based on the defects identified during the comprehensive QA Audit.

---

## Priority P0 — Critical System / Security Fixes

### 1. Fix Missing `mongoose` Import in `subjectController.js` [BUG-003]
- **Target File**: `backend/controllers/subjectController.js`
- **Issue**: Missing `const mongoose = require('mongoose');` causes crash on `POST /api/subjects`.
- **Action**:
  - Add `const mongoose = require('mongoose');` at the top of the file.
  - Normalize department, semester, and teacher assignments during creation and updates.
- **Verification**: Run `POST /api/subjects` and verify subject creation with populated faculty.

### 2. Lock Classroom Mutations Behind Admin Authorization [BUG-004]
- **Target File**: `backend/routes/classroomRoutes.js`
- **Issue**: Any unauthenticated client can call POST, PUT, DELETE on classrooms.
- **Action**:
  - Add `const { protect } = require('../middleware/authMiddleware');`
  - Protect mutations with `protect(true)`.
  - Allow authenticated GET requests.
- **Verification**: Verify that unauthenticated requests to `POST /api/classrooms` are rejected with `401/403`.

---

## Priority P1 — High Priority Functional Fixes

### 3. Mount `/api/auth/teachers` Route for Faculty Login [BUG-001]
- **Target File**: `backend/routes/authRoutes.js`
- **Issue**: Missing `router.get('/teachers', getPublicTeachers)` in `authRoutes.js` causes 404 when faculty click the Teacher login tab.
- **Action**:
  - Register `router.get('/teachers', getPublicTeachers)` in `backend/routes/authRoutes.js`.
- **Verification**: Send `GET /api/auth/teachers` and verify HTTP 200 with list of active faculty.

### 4. Normalize Field Aliases in Teacher Creation & Update [BUG-002]
- **Target File**: `backend/controllers/teacherController.js`
- **Issue**: Mongoose validation fails when frontend sends `faculty_name`, `teaching_hours`, `teacherID` instead of `name`, `teacher_id`, `max_hours_per_week`, `min_hours_per_week`.
- **Action**:
  - Normalize fields in `createTeacher` and `updateTeacher`:
    - `name: req.body.faculty_name || req.body.name`
    - `teacher_id: req.body.teacherID || req.body.teacher_id || ('T_' + Date.now())`
    - `max_hours_per_week: Number(req.body.teaching_hours || req.body.max_hours_per_week || 20)`
    - `min_hours_per_week: Number(req.body.min_hours_per_week || Math.floor(max_hours_per_week / 2) || 10)`
    - Preserve `email` inside the Teacher document.
- **Verification**: Verify creating and updating teacher via API and Admin UI.

### 5. Fix Schema Field Population in `getGlobalTimetable` [BUG-005]
- **Target File**: `backend/controllers/timetableController.js`
- **Issue**: `getGlobalTimetable` tries to populate `subjectId`, `teacherId`, `classroomId` which fail with `StrictPopulateError`.
- **Action**:
  - Update `getGlobalTimetable` query and `.populate()` to match `Timetable.js` schema (`subject`, `teacher`, `classroom`, `laboratory`, `department`, `semester`, `division`).
  - Format response objects to support both legacy and modern UI bindings.
- **Verification**: Verify `GET /api/timetable/global` returns HTTP 200 with complete schedule data.

### 6. Register Referenced Models in `eventController.js` [BUG-010]
- **Target File**: `backend/controllers/eventController.js`
- **Issue**: `MissingSchemaError: Schema hasn't been registered for model "Department"` on populate.
- **Action**:
  - Require `Department`, `Semester`, `Division` models at the top of `backend/controllers/eventController.js`.
- **Verification**: Verify `POST /api/events` and `GET /api/events/admin` populate without schema errors.

---

## Priority P2 — Medium Priority Improvements & Defect Resolution

### 7. Fix `SmartGenerateModal.jsx` Toast Call [BUG-006]
- **Target File**: `frontend/src/components/SmartGenerateModal.jsx`
- **Issue**: Calls `toast.error()` which throws `ReferenceError: toast is not defined`.
- **Action**:
  - Import `showToast` from `@/components/ui/toast` and replace `toast.error(...)` with `showToast(..., 'error')`.
- **Verification**: Trigger validation in SmartGenerateModal and verify toast renders properly.

### 8. Fix Teacher Dashboard Navigation in `Timetable.jsx` & Route in `App.jsx` [BUG-007]
- **Target Files**: `frontend/src/pages/Timetable.jsx`, `frontend/src/App.jsx`
- **Issue**: Button navigates to `/teacher/dashboard` which was unhandled.
- **Action**:
  - Add `<Route path="/teacher/dashboard" element={<Navigate to="/teacher-timetable" replace />} />` in `App.jsx`.
  - Update `Timetable.jsx` button to route directly to `/teacher-timetable`.
- **Verification**: Click "Go To Dashboard" from header and verify redirection to Teacher Portal.

### 9. Fix Demo Data Seed Token Reference in `Dashboard.jsx` [BUG-008]
- **Target File**: `frontend/src/pages/Dashboard.jsx`
- **Issue**: Reads `user.token` (undefined) inside fetch.
- **Action**:
  - Use `api.post('/admin/seed')` from `@/services/api` or `localStorage.getItem('auth-token')`.
- **Verification**: Trigger demo data seed and verify request sends authentic Authorization Bearer token.

### 10. Expand `TeacherLeave` Enum Values [BUG-009]
- **Target File**: `backend/models/TeacherLeave.js`
- **Issue**: Rejects common leave types like `Medical`, `Casual`, `Duty`, `Personal`.
- **Action**:
  - Expand `leaveType` enum to `['single_day', 'multiple_day', 'half_day', 'emergency', 'Medical', 'Casual', 'Duty', 'Personal', 'Other']`.
- **Verification**: Apply for Medical and Casual leaves and verify successful creation.

### 11. Resolve Department Reference in `importController.js` [BUG-011]
- **Target File**: `backend/controllers/importController.js`
- **Issue**: Sets string department name into ObjectId field.
- **Action**:
  - Lookup and resolve Department document ObjectId before assignment.
- **Verification**: Upload sample Excel timetable and verify successful import.

### 12. Protect Master Academic Data Mutation Routes [BUG-012]
- **Target Files**:
  - `backend/routes/departmentRoutes.js`
  - `backend/routes/semesterRoutes.js`
  - `backend/routes/divisionRoutes.js`
  - `backend/routes/laboratoryRoutes.js`
- **Issue**: Unauthenticated clients can delete or mutate departments, semesters, divisions, labs.
- **Action**:
  - Add `protect(true)` middleware to POST, PUT, DELETE routes.
- **Verification**: Verify that unauthorized mutations return 401/403.

---

## Priority P3 — Low Priority Polish
- None required.

---

## Execution Order
1. Apply P0 Fixes (BUG-003, BUG-004) -> Retest
2. Apply P1 Fixes (BUG-001, BUG-002, BUG-005, BUG-010) -> Retest
3. Apply P2 Fixes (BUG-006, BUG-007, BUG-008, BUG-009, BUG-011, BUG-012) -> Retest
4. Run Complete Regression Suite -> Confirm 100% Pass Rate.
