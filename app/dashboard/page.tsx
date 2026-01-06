'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import TimetableBuilder from '@/components/TimetableBuilder';
import TeacherManagement from '@/components/TeacherManagement';
import SubjectManagement from '@/components/SubjectManagement';
import ClassroomManagement from '@/components/ClassroomManagement';
import GlobalTimetablePreview from '@/components/GlobalTimetablePreview';
import { ToastContainer } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Users, BookOpen, Calendar, Building2, Table2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'timetable' | 'teachers' | 'subjects' | 'classrooms' | 'preview'>('timetable');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    if (!isAuthenticated) {
      checkAuth();
    }

    // Listen for switch to timetable event
    const handleSwitchToTimetable = () => {
      setActiveTab('timetable');
    };

    window.addEventListener('switchToTimetable', handleSwitchToTimetable);
    return () => {
      window.removeEventListener('switchToTimetable', handleSwitchToTimetable);
    };
  }, [isAuthenticated, router, setUser]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI-Assisted Timetable Scheduling
              </h1>
              <p className="text-sm text-gray-500">
                Welcome, {user?.username}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'timetable'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="inline mr-2 h-4 w-4" />
            Timetable Builder
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'teachers'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="inline mr-2 h-4 w-4" />
            Teachers
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'subjects'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="inline mr-2 h-4 w-4" />
            Subjects
          </button>
          <button
            onClick={() => setActiveTab('classrooms')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'classrooms'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="inline mr-2 h-4 w-4" />
            Classroom Management
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table2 className="inline mr-2 h-4 w-4" />
            Timetable Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'timetable' && <TimetableBuilder />}
        {activeTab === 'teachers' && <TeacherManagement />}
        {activeTab === 'subjects' && <SubjectManagement />}
        {activeTab === 'classrooms' && <ClassroomManagement />}
        {activeTab === 'preview' && <GlobalTimetablePreview />}
      </main>
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

