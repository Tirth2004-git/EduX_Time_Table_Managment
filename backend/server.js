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
let server;
let isShuttingDown = false;

// Security Middlewares
app.use(helmet());

// CORS Configuration - Allow frontend requests with credentials
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.onrender.com') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiter
app.use('/api/', apiLimiter);

// Parser Middlewares
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
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
app.use('/api/elearning', require('./routes/elearningRoutes'));
app.use('/api/organizations', require('./routes/organizationRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

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

const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Shutting down backend server...`);

  if (server) {
    server.close((error) => {
      if (error) {
        console.error(`❌ Error closing server: ${error.message}`);
        process.exit(1);
      }
      console.log('✅ Backend server stopped.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

const handleServerError = (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the existing backend process before starting another one.`);
    process.exit(1);
  }

  console.error(`❌ Server startup failed: ${error.message}`);
  process.exit(1);
};

const startServer = async () => {
  try {
    validateRuntimeConfig();
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    });
    server.on('error', handleServerError);
  } catch (error) {
    console.error(`❌ Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
