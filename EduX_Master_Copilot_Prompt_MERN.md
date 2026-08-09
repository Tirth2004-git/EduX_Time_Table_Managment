# EduX Timetable Scheduler — Master GitHub Copilot Agent Prompt (MERN + JavaScript)

> Save this file as `.github/copilot-instructions.md` in your repo root.
> GitHub Copilot Agent reads this file automatically in every session — no re-pasting needed.
> Every rule, file path, code pattern, and example in this file is written for MERN stack + plain JavaScript. Do NOT generate TypeScript, do NOT use Next.js App Router, do NOT use server components.

---

## 1. PROJECT OVERVIEW

**App name:** EduX Smart Faculty & Timetable Planner
**Stack:** MongoDB Atlas · Express.js · React.js (Vite or CRA) · Node.js · Mongoose · plain JavaScript (no TypeScript anywhere)
**Purpose:** AI-assisted academic timetable scheduling system for Parul University IT department.
**Developer:** Tirth Oza — B.Tech IT, Parul University, graduating 2027.
**Repo structure:** Monorepo with two folders — `server/` (Express + Node backend) and `client/` (React frontend).
**Deployment target:** Railway / Render (backend) + Vercel / Netlify (frontend) + MongoDB Atlas (database).

---

## 2. TECH STACK — EXACT VERSIONS AND LIBRARIES

### Backend (`server/`)
```
Node.js         >= 18.x
Express.js      ^4.18.x
Mongoose        ^7.x or ^8.x
dotenv          ^16.x
cors            ^2.x
cookie-parser   ^1.x
bcryptjs        ^2.x
jsonwebtoken    ^9.x
express-validator ^7.x   (request validation — NOT Zod, NOT joi)
multer          ^1.x     (file uploads for CSV import)
csv-parser      ^3.x     (CSV parsing)
nodemailer      ^6.x     (email notifications)
```

### Frontend (`client/`)
```
React           ^18.x
React Router    ^6.x     (client-side routing — NOT Next.js routing)
Axios           ^1.x     (API calls — NOT fetch directly)
Tailwind CSS    ^3.x
ShadCN UI       (component library)
Recharts        ^2.x     (charts and analytics)
@dnd-kit/core   ^6.x     (drag and drop)
react-hot-toast ^2.x     (toast notifications)
```

### No TypeScript anywhere
All files use `.js` and `.jsx` extensions only. No `.ts`, `.tsx`, no `tsconfig.json`, no type annotations.

---

## 3. FOLDER STRUCTURE

```
edux-timetable/
├── server/
│   ├── index.js                  → Express app entry point
│   ├── config/
│   │   └── db.js                 → MongoDB Atlas connection
│   ├── middleware/
│   │   ├── auth.js               → JWT verify middleware
│   │   ├── roleCheck.js          → Role-based access (admin/viewer)
│   │   └── rateLimiter.js        → Express rate limiting
│   ├── models/
│   │   ├── User.js
│   │   ├── Teacher.js
│   │   ├── Subject.js
│   │   ├── Timetable.js
│   │   ├── WeeklyTimetable.js
│   │   ├── Classroom.js
│   │   ├── WeeklyConfig.js
│   │   └── TeacherLeave.js       → (to be created)
│   ├── routes/
│   │   ├── auth.js               → /api/auth/*
│   │   ├── teachers.js           → /api/teachers/*
│   │   ├── subjects.js           → /api/subjects/*
│   │   ├── classrooms.js         → /api/classrooms/*
│   │   └── timetable.js          → /api/timetable/*
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── teacherController.js
│   │   ├── subjectController.js
│   │   ├── classroomController.js
│   │   └── timetableController.js
│   ├── utils/
│   │   ├── validationEngine.js   → ALL conflict/business rules live here
│   │   ├── autoGenerator.js      → Timetable auto-generation algorithm
│   │   ├── userUtils.js          → getCurrentUserId, getOrCreateSystemAdmin
│   │   ├── pdfExport.js          → PDF generation helpers
│   │   └── logger.js             → Console wrapper (dev) / error logger (prod)
│   ├── scripts/
│   │   └── seed.js               → Seed DB with sample data
│   └── .env                      → Environment variables (gitignored)
│
├── client/
│   ├── src/
│   │   ├── main.jsx              → React entry point
│   │   ├── App.jsx               → Router setup
│   │   ├── api/
│   │   │   └── axios.js          → Axios instance with base URL + interceptors
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx     → Main tabbed layout
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── components/
│   │   │   ├── TimetableBuilder.jsx
│   │   │   ├── GlobalTimetablePreview.jsx
│   │   │   ├── TeacherManagement.jsx
│   │   │   ├── SubjectManagement.jsx
│   │   │   ├── WorkloadAnalytics.jsx
│   │   │   └── ui/              → ShadCN components
│   │   ├── store/
│   │   │   └── useStore.js       → Zustand store (global state)
│   │   └── utils/
│   │       └── helpers.js
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── .gitignore
└── README.md
```

---

## 4. CORE ARCHITECTURE RULES — NEVER VIOLATE THESE

These constraints are non-negotiable. If any generated code violates them, reject it and rewrite.

**Rule 1 — No stored counters.**
Never add `assignedHours`, `remainingHours`, or `allottedPeriods` as fields on any MongoDB document. All counters are computed dynamically at query time via MongoDB aggregation pipelines (`$group`, `$count`, `$lookup`).

**Rule 2 — Timetable entries store references only.**
A timetable document stores `subjectId (ObjectId ref)`, `teacherId (ObjectId ref)`, `division`, `day`, `timeSlot`, `program`, `className`, `semester`. It does NOT store subject name, teacher name, room number, or any denormalised text data.

**Rule 3 — Classroom resolved dynamically.**
Use a MongoDB `$lookup` aggregation joining on `(program + className + semester + division)` against the `classrooms` collection. Never store `roomNumber` or `classroomId` inside a timetable entry.

**Rule 4 — Teacher workload is per-division.**
Workload = COUNT of timetable entries WHERE `(teacherId + program + className + semester + division)` matches, compared against `Teacher.teaching_hours`. Never sum across divisions.

**Rule 5 — createdBy must be a valid ObjectId.**
Use `getCurrentUserId(req)` from `server/utils/userUtils.js` in every timetable create/save controller. Never pass the string `'admin'` or any plain string to the `createdBy` field.

**Rule 6 — All validation lives in `server/utils/validationEngine.js`.**
Route handlers and controllers must NEVER inline conflict checks or business rules. They call the validation engine and return its result.

**Rule 7 — Consistent API response shape.**
Every Express route returns: `{ success: true/false, data: ..., error: '...' }`. HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests, 500 Server Error.

**Rule 8 — Plain JavaScript only.**
No TypeScript syntax anywhere. Use JSDoc comments for documentation instead of type annotations. Files end in `.js` (server) or `.jsx` (React components).

---

## 5. DATABASE SCHEMAS (Mongoose — JavaScript)

```javascript
// server/models/Timetable.js
const TimetableSchema = new mongoose.Schema({
  program:    { type: String, required: true },
  className:  { type: String, required: true },
  semester:   { type: Number, required: true },
  division:   { type: String, required: true },
  day:        { type: String, required: true },
  timeSlot:   { type: String, required: true },
  subjectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  status:     { type: String, enum: ['valid', 'conflict'], default: 'valid' },
  duration:   { type: Number, enum: [1, 2], default: 1 }, // 2 = lab/practical slot
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound indexes — always include these
TimetableSchema.index({ teacherId: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ program: 1, className: 1, semester: 1, division: 1 });
TimetableSchema.index({ day: 1, timeSlot: 1 });

// server/models/Teacher.js
const TeacherSchema = new mongoose.Schema({
  teacherID:       { type: String, required: true, unique: true },
  faculty_name:    { type: String, required: true },
  department:      { type: String, required: true },
  teaching_hours:  { type: Number, required: true }, // weekly limit PER DIVISION
  teacher_number:  { type: String }
}, { timestamps: true });

// server/models/Subject.js
const SubjectSchema = new mongoose.Schema({
  subject_code:    { type: String, required: true },
  subject_name:    { type: String, required: true },
  program:         { type: String, required: true },
  className:       { type: String, required: true },
  semester:        { type: Number, required: true },
  teacherId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  requiredPeriods: { type: Number, required: true }, // per division
  type:            { type: String, enum: ['theory', 'lab'], default: 'theory' } // NEW
}, { timestamps: true });

// server/models/Classroom.js
const ClassroomSchema = new mongoose.Schema({
  program:    { type: String, required: true },
  className:  { type: String, required: true },
  semester:   { type: Number, required: true },
  division:   { type: String, required: true },
  roomNumber: { type: String },
  year:       { type: String },
  capacity:   { type: Number }  // NEW
}, { timestamps: true });

// server/models/User.js
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcryptjs hashed
  name:     { type: String, required: true },
  role:     { type: String, enum: ['admin', 'viewer'], default: 'viewer' } // NEW
}, { timestamps: true });
```

---

## 6. BACKEND PATTERNS — FOLLOW EXACTLY

### Express route + controller pattern
```javascript
// server/routes/timetable.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const { addSlot, saveAll, getPreview } = require('../controllers/timetableController');

router.get('/preview', verifyToken, getPreview);
router.post('/add', verifyToken, requireAdmin, addSlot);
router.post('/save', verifyToken, requireAdmin, saveAll);

module.exports = router;
```

```javascript
// server/controllers/timetableController.js
const Timetable = require('../models/Timetable');
const { validateSlot } = require('../utils/validationEngine');
const { getCurrentUserId } = require('../utils/userUtils');

const addSlot = async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const { program, className, semester, division, day, timeSlot, subjectId, teacherId } = req.body;

    const validation = await validateSlot({ program, className, semester, division, day, timeSlot, subjectId, teacherId });
    if (!validation.valid) {
      return res.status(409).json({ success: false, error: validation.reason });
    }

    const entry = await Timetable.create({
      program, className, semester, division, day, timeSlot, subjectId, teacherId,
      status: 'valid',
      createdBy: userId
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { addSlot };
```

### MongoDB connection
```javascript
// server/config/db.js
const mongoose = require('mongoose');

let cached = null;

const connectDB = async () => {
  if (cached) return cached;
  try {
    cached = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Atlas connected');
    return cached;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Auth middleware
```javascript
// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token expired or invalid' });
  }
};

module.exports = { verifyToken };
```

### Role check middleware
```javascript
// server/middleware/roleCheck.js
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Insufficient permissions. Admin role required.' });
  }
  next();
};

module.exports = { requireAdmin };
```

### getUserId utility
```javascript
// server/utils/userUtils.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const getCurrentUserId = async (req) => {
  try {
    const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id; // This is already a valid ObjectId string from DB
  } catch {
    return await getOrCreateSystemAdmin();
  }
};

const getOrCreateSystemAdmin = async () => {
  const bcrypt = require('bcryptjs');
  let admin = await User.findOne({ email: 'system@edux.local' });
  if (!admin) {
    const hash = await bcrypt.hash('system-auto-' + Date.now(), 10);
    admin = await User.create({
      username: 'system-admin',
      email: 'system@edux.local',
      password: hash,
      name: 'System Administrator',
      role: 'admin'
    });
  }
  return admin._id;
};

module.exports = { getCurrentUserId, getOrCreateSystemAdmin };
```

---

## 7. FRONTEND PATTERNS — FOLLOW EXACTLY

### Axios instance
```javascript
// client/src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // sends cookies automatically
});

// Auto-retry on 401 — attempt refresh then retry once
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return api(error.config);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### React component pattern
```jsx
// client/src/components/TeacherManagement.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teachers');
      if (data.success) setTeachers(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* JSX here */}
    </div>
  );
};

export default TeacherManagement;
```

### React Router setup
```jsx
// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { useStore } from './store/useStore';

const PrivateRoute = ({ children }) => {
  const { user } = useStore();
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
```

### Zustand store
```javascript
// client/src/store/useStore.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  timetable: [],
  history: [],   // undo stack
  future: [],    // redo stack

  setUser: (user) => set({ user }),
  setTimetable: (timetable) => set({ timetable }),

  // Undo/redo action tracking
  pushHistory: (action) => set((state) => ({
    history: [...state.history, action],
    future: []
  })),
  undo: () => set((state) => {
    if (!state.history.length) return state;
    const last = state.history[state.history.length - 1];
    return {
      history: state.history.slice(0, -1),
      future: [last, ...state.future]
    };
  }),
  redo: () => set((state) => {
    if (!state.future.length) return state;
    const next = state.future[0];
    return {
      future: state.future.slice(1),
      history: [...state.history, next]
    };
  }),
}));
```

---

## 8. WHAT IS ALREADY DONE (do not rewrite unless explicitly asked)

- JWT login + HTTP-only cookie auth + bcryptjs password hashing
- Express protected route middleware (`verifyToken`)
- Full CRUD for Teachers, Subjects, Classrooms
- Interactive weekly timetable grid (click-to-add, real-time conflict indicators)
- Teacher clash detection (same teacher, same day + timeSlot)
- Teacher workload validation per division
- Subject period limit validation per division
- Delete slot with auto-recalculate
- MongoDB Atlas connection with pooling and caching (`config/db.js`)
- Global timetable preview with 3 view modes (division, teacher, subject)
- A3 landscape PDF export
- Auto-generate timetable route (`POST /api/timetable/auto-generate`)
- ObjectId fix via `utils/userUtils.js`
- Holiday management via WeeklyConfig collection
- Break slots (auto-skipped, displayed as grey cells in UI)
- Seed script (`scripts/seed.js`) with 6 sample teachers

---

## 9. PHASE 1 — IMPLEMENT NOW (critical gaps)

### Task 1.1 — Room conflict detection across divisions

**File:** `server/utils/validationEngine.js`

Add this check inside the `validateSlot` function:
```javascript
// After checking teacher conflicts, check room conflicts
const Classroom = require('../models/Classroom');

const sourceRoom = await Classroom.findOne({ program, className, semester, division });
if (sourceRoom?.roomNumber) {
  // Find all classrooms with the same room number
  const sameRooms = await Classroom.find({ roomNumber: sourceRoom.roomNumber });
  for (const room of sameRooms) {
    if (room.division === division) continue; // same division, skip
    // Check if any timetable entry occupies this room at same day+timeSlot
    const conflict = await Timetable.findOne({
      program: room.program, className: room.className,
      semester: room.semester, division: room.division,
      day, timeSlot
    });
    if (conflict) {
      return {
        valid: false,
        reason: `Room conflict: Room ${sourceRoom.roomNumber} is already occupied at this time by Division ${room.division}`
      };
    }
  }
}
```

### Task 1.2 — Lab/practical slot type (2-hour consecutive blocks)

**Constants file — create:** `server/utils/constants.js`
```javascript
const TIME_SLOTS = [
  '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '13:00-14:00', '14:00-15:00',
  '15:00-16:00', '16:00-17:00'
];
module.exports = { TIME_SLOTS };
```

**Timetable model:** Add `duration: { type: Number, enum: [1, 2], default: 1 }`.

**Validation engine:** When `duration === 2`, block the NEXT consecutive time slot too for teacher conflict checks.
```javascript
const { TIME_SLOTS } = require('./constants');
// If subject.type === 'lab' or duration === 2
const slotIndex = TIME_SLOTS.indexOf(timeSlot);
const nextSlot = TIME_SLOTS[slotIndex + 1];
if (!nextSlot) return { valid: false, reason: 'No consecutive slot available for lab subject' };
// Run teacher + room conflict check on nextSlot too
```

**React — TimetableBuilder.jsx:** When a lab subject is selected in the slot picker, auto-tick the next cell and submit with `duration: 2`. Render lab slots spanning 2 rows in the grid.

### Task 1.3 — API rate limiting

**Install:** `npm install express-rate-limit`

```javascript
// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const saveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, error: 'Too many save requests. Slow down.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many generate requests. Please wait.' },
});

module.exports = { loginLimiter, saveLimiter, generateLimiter };
```

Apply in routes:
```javascript
// server/routes/auth.js
router.post('/login', loginLimiter, authController.login);
// server/routes/timetable.js
router.post('/save', verifyToken, requireAdmin, saveLimiter, timetableController.save);
router.post('/auto-generate', verifyToken, requireAdmin, generateLimiter, timetableController.autoGenerate);
```

### Task 1.4 — Session expiry + refresh tokens

```javascript
// Login — issue both tokens
const accessToken = jwt.sign({ id: user._id, role: user.role, email: user.email },
  process.env.JWT_SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign({ id: user._id },
  process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

res.cookie('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 });
res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
```

New route `POST /api/auth/refresh`:
```javascript
const refreshSession = (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) return res.status(401).json({ success: false, error: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const newAccess = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.cookie('access_token', newAccess, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 });
    return res.json({ success: true });
  } catch {
    return res.status(401).json({ success: false, error: 'Refresh token expired. Please log in again.' });
  }
};
```

### Task 1.5 — Drag-and-drop slot rescheduling

**Install:** `npm install @dnd-kit/core @dnd-kit/utilities`

In `TimetableBuilder.jsx`:
- Wrap the grid in `<DndContext onDragEnd={handleDragEnd}>`
- Each filled cell = `<Draggable id={entry._id} data={entry}`
- Each empty cell = `<Droppable id={day+'-'+timeSlot}`
- On drag end, call `PATCH /api/timetable/move` with `{ entryId, newDay, newTimeSlot }`
- Optimistically highlight target cell red if the move would conflict (pre-validate client-side)

New route + controller:
```javascript
// PATCH /api/timetable/move
const moveSlot = async (req, res) => {
  const { entryId, newDay, newTimeSlot } = req.body;
  const entry = await Timetable.findById(entryId);
  if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });

  const validation = await validateSlot({
    ...entry.toObject(), day: newDay, timeSlot: newTimeSlot, excludeId: entryId
  });
  if (!validation.valid) return res.status(409).json({ success: false, error: validation.reason });

  entry.day = newDay;
  entry.timeSlot = newTimeSlot;
  await entry.save();
  return res.json({ success: true, data: entry });
};
```

---

## 10. PHASE 2 — NEXT SPRINT

### Task 2.1 — Copy timetable between divisions
```javascript
// POST /api/timetable/copy
// Body: { sourceDivision, targetDivision, program, className, semester }
const copyTimetable = async (req, res) => {
  const { sourceDivision, targetDivision, program, className, semester } = req.body;
  const userId = await getCurrentUserId(req);
  const sourceEntries = await Timetable.find({ program, className, semester, division: sourceDivision });

  const results = { copied: 0, skipped: [], errors: [] };
  for (const entry of sourceEntries) {
    const validation = await validateSlot({ ...entry.toObject(), division: targetDivision });
    if (!validation.valid) {
      results.skipped.push({ day: entry.day, timeSlot: entry.timeSlot, reason: validation.reason });
      continue;
    }
    await Timetable.create({ ...entry.toObject(), _id: undefined, division: targetDivision, createdBy: userId });
    results.copied++;
  }
  return res.json({ success: true, data: results });
};
```

### Task 2.2 — Bulk CSV import for teachers and subjects

**Install:** `npm install multer csv-parser` (already in dependencies list above)

```javascript
// POST /api/teachers/import
// Accepts multipart/form-data with field name 'file' (.csv or .xlsx)
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

router.post('/import', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      const ops = results.map(row => ({
        updateOne: {
          filter: { teacherID: row.teacherID },
          update: { $set: row },
          upsert: true
        }
      }));
      const result = await Teacher.bulkWrite(ops);
      fs.unlinkSync(req.file.path); // cleanup
      res.json({ success: true, data: { inserted: result.upsertedCount, updated: result.modifiedCount } });
    });
});
```

In `TeacherManagement.jsx`: add an "Import CSV" button with a file input (`accept=".csv"`). On change, POST with `FormData` using Axios. Show a result modal with inserted/updated counts.

### Task 2.3 — Role-based access control

User model already has `role: 'admin' | 'viewer'`. Apply `requireAdmin` middleware to all mutating routes:

```javascript
// In every route file, add requireAdmin to POST/PUT/PATCH/DELETE:
router.post('/', verifyToken, requireAdmin, controller.create);
router.put('/:id', verifyToken, requireAdmin, controller.update);
router.delete('/:id', verifyToken, requireAdmin, controller.delete);
// GET routes — verifyToken only, no requireAdmin
router.get('/', verifyToken, controller.getAll);
```

In React: fetch `GET /api/auth/me` on dashboard load, store role in Zustand. Hide all Add/Edit/Delete buttons in components when `user.role === 'viewer'`:
```jsx
{user?.role === 'admin' && <Button onClick={handleAdd}>Add Teacher</Button>}
```

### Task 2.4 — Forgot password / reset flow

New routes: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

```javascript
// forgot-password
const crypto = require('crypto');
const rawToken = crypto.randomBytes(32).toString('hex');
const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
await User.findOneAndUpdate({ email }, {
  resetPasswordToken: hashedToken,
  resetPasswordExpiry: Date.now() + 60 * 60 * 1000 // 1 hour
});
// Send email with link: process.env.CLIENT_URL + '/reset-password?token=' + rawToken
```

Add `resetPasswordToken` and `resetPasswordExpiry` fields to the User model.

New pages in React: `ForgotPassword.jsx` (email form) and `ResetPassword.jsx` (new password form, reads `?token=` from URL).

### Task 2.5 — Undo/redo for timetable builder

The Zustand store already has `history`, `future`, `pushHistory`, `undo`, `redo` defined (see Section 7). Connect them in `TimetableBuilder.jsx`:

```javascript
// After every successful add/delete/move API call:
pushHistory({ type: 'ADD', entry: newEntry }); // or 'DELETE' / 'MOVE'

// Keyboard listener in useEffect:
const handleKey = (e) => {
  if (e.ctrlKey && e.key === 'z') handleUndo();
  if (e.ctrlKey && e.key === 'y') handleRedo();
  if (e.key === 'Delete' && selectedCell) handleDeleteSlot(selectedCell);
};
window.addEventListener('keydown', handleKey);
return () => window.removeEventListener('keydown', handleKey);
```

On undo: if last action was ADD → call `DELETE /api/timetable/:id`. If last action was DELETE → re-add via POST.

### Task 2.6 — Excel/CSV export for timetables

**Install:** `npm install xlsx` in client

```javascript
// client/src/utils/exportUtils.js
import * as XLSX from 'xlsx';

export const exportTimetableToExcel = (timetableData, division) => {
  const ws = XLSX.utils.json_to_sheet(
    timetableData.map(entry => ({
      Day: entry.day, TimeSlot: entry.timeSlot,
      Subject: entry.subject?.subject_name,
      Teacher: entry.teacher?.faculty_name,
      Room: entry.classroom?.roomNumber || 'N/A'
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, division);
  XLSX.writeFile(wb, `timetable-${division}.xlsx`);
};
```

Add "Export Excel" and "Export CSV" buttons in `GlobalTimetablePreview.jsx`. Both work client-side with no API call.

---

## 11. PHASE 3 — SMART FEATURES

### Task 3.1 — AI conflict resolver ("Suggest Fix" button)

New route: `POST /api/timetable/suggest-swap`
Body: `{ conflictingEntry }` — the entry that caused a conflict.

Server logic:
```javascript
// Find all valid alternative time slots for the same subject+teacher
const allSlots = TIME_SLOTS; // from constants.js
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const alternatives = [];

for (const day of DAYS) {
  for (const timeSlot of allSlots) {
    const check = await validateSlot({ ...conflictingEntry, day, timeSlot });
    if (check.valid) alternatives.push({ day, timeSlot });
    if (alternatives.length >= 3) break;
  }
  if (alternatives.length >= 3) break;
}
return res.json({ success: true, data: alternatives });
```

In `TimetableBuilder.jsx`: show a "Suggest Fix" button on red cells. On click, call this route and show the 3 alternatives as clickable options in a popover.

### Task 3.2 — Teacher workload balance analyser

New route: `GET /api/analytics/workload`

```javascript
const workload = await Timetable.aggregate([
  { $group: { _id: '$teacherId', assignedHours: { $sum: 1 } } },
  { $lookup: { from: 'teachers', localField: '_id', foreignField: '_id', as: 'teacher' } },
  { $unwind: '$teacher' },
  { $project: {
    name: '$teacher.faculty_name',
    assignedHours: 1,
    limit: '$teacher.teaching_hours',
    utilisation: { $multiply: [{ $divide: ['$assignedHours', '$teacher.teaching_hours'] }, 100] }
  }}
]);
```

New component `WorkloadAnalytics.jsx`: horizontal `BarChart` from recharts. Color each bar: green (50–90%), amber (<50%), red (>90%).

### Task 3.3 — Teacher leave / availability calendar

New model: `server/models/TeacherLeave.js`
```javascript
{
  teacherId: ObjectId ref Teacher,
  date: Date,
  reason: String,
  type: { type: String, enum: ['full-day', 'half-day'] }
}
```

New routes: `POST /api/teachers/leave`, `GET /api/teachers/leave?teacherId=&month=`, `DELETE /api/teachers/leave/:id`

In `validationEngine.js`: before allowing a slot add, check if teacher has a full-day leave on that day.

In `TeacherManagement.jsx`: add a "Leave Calendar" tab using a simple calendar grid (7×5 table built in JSX) where clicking a date marks/unmarks leave.

### Task 3.4 — Public shareable read-only timetable link

New model: `SharedLink.js`
```javascript
{ token: String, program: String, className: String, semester: Number, division: String, expiresAt: Date }
```

New routes:
- `POST /api/timetable/share` → creates token, returns URL
- `GET /api/timetable/public/:token` → no auth required, returns timetable data

In React Router, add a public route `/share/:token` that renders `GlobalTimetablePreview` in read-only mode (no edit buttons, no auth required).

### Task 3.5 — Email notifications on timetable change

When `POST /api/timetable/save` detects changes (compare before/after), trigger emails:
```javascript
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Run async, don't await in the response path
setImmediate(async () => {
  for (const teacher of affectedTeachers) {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: teacher.email,
      subject: 'Your timetable has been updated — EduX',
      text: `Changes were made to your schedule. Please log in to view.`
    });
  }
});
```

### Task 3.6 — Analytics dashboard

New page: `client/src/pages/Analytics.jsx`
New route: `GET /api/analytics/overview`

Four panels using recharts:
1. Slot utilisation heatmap — 6×8 grid of divs, background opacity based on how many divisions use that day+timeSlot
2. Subject coverage summary — `BarChart` (allotted vs required periods per subject)
3. Teacher load distribution — `BarChart` (assigned vs limit per teacher)
4. Division completion status — `PieChart` (complete vs incomplete divisions)

Add `/analytics` route in React Router and a nav link in the dashboard sidebar.

---

## 12. PHASE 4 — PRODUCTION SCALE

### Task 4.1 — Progressive Web App (PWA)
Add a `public/manifest.json` and `public/service-worker.js`. Cache the timetable preview route for offline viewing. In `client/src/main.jsx`, register the service worker. Students can "Add to Home Screen" and view their timetable without internet.

### Task 4.2 — Public REST API (versioned)
Create routes under `/api/v1/public/` that require an API key header (`x-api-key`) instead of JWT cookies:
- `GET /api/v1/public/timetable?program=&class=&semester=&division=`
- `GET /api/v1/public/teachers`
API keys stored in a new `ApiKey` model, issued from the admin panel.

### Task 4.3 — Full audit log
New model: `AuditLog.js`
```javascript
{ userId: ObjectId, action: String, entityType: String, entityId: ObjectId,
  before: Object, after: Object, timestamp: Date, ip: String }
```
Middleware wrapper that logs every POST/PUT/DELETE call automatically. New admin page `/dashboard/audit` — filterable table with before/after diff view.

### Task 4.4 — Multi-institute SaaS support
Add `instituteId: ObjectId` to every collection. New `Institute` model. All Mongoose queries must include `instituteId` filter scoped from `req.user.instituteId`. Admin panel to create institutes and invite admin users.

---

## 13. IMPROVEMENTS TO EXISTING FEATURES

### Auto-generation engine (`server/utils/autoGenerator.js`)
- Replace greedy fill with a **backtracking CSP solver**: try placing subjects one by one; if stuck, backtrack and try a different order. Far fewer manual fixups.
- Add a constraint config endpoint `POST /api/timetable/set-constraints` where admin can configure: "no free first slot", "labs only after 12:00", "Teacher X unavailable Friday".
- Generate 3 alternative timetables (different random seed orderings) and let admin pick the best from the UI.

### PDF export (`server/utils/pdfExport.js`)
- Replace DOM-clone approach with server-side **Puppeteer**: `npm install puppeteer`. The `/api/timetable/export-pdf` route launches Chromium, loads the timetable HTML, and returns a pixel-perfect PDF.
- Add institute logo and academic year in the PDF header.
- Add "Download teacher timetable" — one PDF page per teacher showing their full weekly schedule.

### Timetable builder UX (`TimetableBuilder.jsx`)
- Add tooltip on red conflict cells: "Dr. Sharma is already teaching CS-102 Division A at this time slot" — not just red color.
- Keyboard shortcuts: `Delete` removes selected slot, `Ctrl+Z` undo, `Ctrl+Y` redo.
- After implementing dnd-kit (Task 1.5): add snap-back animation when a drag lands on an invalid cell using `@dnd-kit/utilities` `CSS.Transform`.

### Data layer
Compound indexes to add in model files (already listed in schemas above — verify they exist):
```javascript
TimetableSchema.index({ teacherId: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ program: 1, className: 1, semester: 1, division: 1 });
TimetableSchema.index({ day: 1, timeSlot: 1 });
```
Replace manual `req.body` checks in controllers with `express-validator` chains defined in separate `validators/` files.

---

## 14. EXPRESS SERVER ENTRY POINT

```javascript
// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const subjectRoutes = require('./routes/subjects');
const classroomRoutes = require('./routes/classrooms');
const timetableRoutes = require('./routes/timetable');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/timetable', timetableRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`EduX server running on port ${PORT}`));
});
```

---

## 15. ENVIRONMENT VARIABLES

```env
# server/.env

# MongoDB
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.djdetv4.mongodb.net/timetable-scheduler

# JWT
JWT_SECRET=your-strong-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# App
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173   # Vite dev server port

# Email (for notifications and password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password       # Use Gmail App Password, not real password

# Optional — production rate limiting with Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional — error monitoring
SENTRY_DSN=
```

```env
# client/.env
VITE_API_URL=http://localhost:5000/api
```

---

## 16. BEFORE WRITING ANY CODE — MANDATORY CHECKLIST

1. Read the relevant model file in `server/models/` to understand the current schema.
2. Check if the feature needs a new Express route file or adds to an existing one.
3. If touching validation rules → only edit `server/utils/validationEngine.js`. Never inline in controllers.
4. If creating/saving timetable data → always call `getCurrentUserId(req)` from `utils/userUtils.js` for `createdBy`.
5. Mental test: "Does my code store any computed counter in a MongoDB document?" If yes → rewrite to use aggregation at query time.
6. All API responses must match: `{ success: boolean, data?: any, error?: string }`.
7. No TypeScript, no `import/export` in server files (use `require/module.exports`). React files use ES6 `import/export`.
8. After implementing: test the happy path, test the conflict case, verify the MongoDB document with `.findOne()`, confirm the preview API still works correctly.

---

*This is the single source of truth for the EduX Timetable Scheduler MERN codebase. All Copilot suggestions must follow the architecture, JavaScript patterns, and roadmap defined here. Stack: MongoDB + Express + React + Node.js, plain JavaScript only. Last updated: June 2026.*
