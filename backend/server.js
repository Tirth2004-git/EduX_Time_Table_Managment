const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

require('./config/env');
const { validateRuntimeConfig } = require('./config/env');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security Middlewares
app.use(helmet());

// CORS Configuration - Allow frontend requests with credentials
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-frontend.vercel.app'] // Replace with production URL when ready
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiter
app.use('/api/', apiLimiter);

// Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/demo', require('./routes/demoRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/semesters', require('./routes/semesterRoutes'));
app.use('/api/divisions', require('./routes/divisionRoutes'));
app.use('/api/laboratories', require('./routes/laboratoryRoutes'));
app.use('/api/classrooms', require('./routes/classroomRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/teacher-subject-mapping', require('./routes/teacherSubjectMappingRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/leaves', require('./routes/teacherLeaveRoutes'));
app.use('/api/teacher-portal', require('./routes/teacherPortalRoutes'));
app.use('/api/substitutions', require('./routes/substitutionRoutes'));
app.use('/api/sessions', require('./routes/scheduledSessionRoutes'));
app.use('/api/academic-years', require('./routes/academicCalendarRoutes'));
app.use('/api/admin', require('./routes/adminDashboardRoutes'));

// Root path diagnostic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Timetable API is running smoothly' });
});

// Serve frontend in production (optional setup, but useful for hosting as single app)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('AI Timetable scheduling backend is running. Use Vite frontend on port 5173.');
  });
}

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
const startServer = async () => {
  try {
    validateRuntimeConfig();
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
// Trigger nodemon restart
