import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TimetableProvider } from './context/TimetableContext';
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Import from './pages/Import';
import StudentDashboard from './pages/StudentDashboard';
import SharedTimetable from './pages/SharedTimetable';
import TeacherPortal from './pages/TeacherDashboard';

function App() {
  return (
    <AuthProvider>
      <TimetableProvider>
        <Router>
          <Routes>
            {/* Splash redirect route */}
            <Route path="/" element={<Home />} />

            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />

            {/* Protected Student Portal Routes */}
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/student" element={<Navigate to="/student-dashboard" replace />} />
            <Route path="/student/dashboard" element={<Navigate to="/student-dashboard" replace />} />
            <Route path="/student-portal" element={<Navigate to="/student-dashboard" replace />} />

            {/* Teacher portal: timetable is the primary teacher page. */}
            <Route
              path="/teacher-timetable"
              element={
                <ProtectedRoute allowRoles={['teacher']}>
                  <TeacherPortal initialTab="timetable" />
                </ProtectedRoute>
              }
            />
            <Route path="/teacher-dashboard" element={<Navigate to="/teacher-timetable" replace />} />
            <Route path="/teacher/dashboard" element={<Navigate to="/teacher-timetable" replace />} />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowRoles={['teacher']}>
                  <Navigate to="/teacher-timetable" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-leaves"
              element={
                <ProtectedRoute allowRoles={['teacher']}>
                  <TeacherPortal initialTab="leaves" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-elearning"
              element={
                <ProtectedRoute allowRoles={['teacher']}>
                  <TeacherPortal initialTab="elearning" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-profile"
              element={
                <ProtectedRoute allowRoles={['teacher']}>
                  <TeacherPortal initialTab="profile" />
                </ProtectedRoute>
              }
            />

            {/* Public Read-Only shared timetable view */}
            <Route
              path="/shared/:token"
              element={<SharedTimetable />}
            />

            {/* Protected Admin/Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/analytics"
              element={
                <ProtectedRoute allowRoles={['admin']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/import"
              element={
                <ProtectedRoute allowRoles={['admin']}>
                  <Import />
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch-All Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </TimetableProvider>
    </AuthProvider>
  );
}

export default App;
