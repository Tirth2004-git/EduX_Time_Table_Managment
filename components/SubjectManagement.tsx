'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface Teacher {
  _id: string;
  teacherID: string;
  faculty_name: string;
  department: string;
}

interface Subject {
  _id: string;
  subject_name: string;
  subject_code: string;
  teacherId: Teacher | null;
  requiredPeriods: number;
  allottedPeriods: number;
  remainingPeriods: number;
}

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    teacherId: '',
    requiredPeriods: '',
  });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate teacherId
      if (!formData.teacherId || formData.teacherId.trim() === '') {
        setError('Please select a teacher');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        requiredPeriods: parseInt(formData.requiredPeriods),
        teacherId: formData.teacherId, // Ensure teacherId is included
      };

      console.log('Submitting payload:', payload); // Debug log

      const url = editingSubject
        ? `/api/subjects/${editingSubject._id}`
        : '/api/subjects';
      const method = editingSubject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Operation failed');
        setLoading(false);
        return;
      }

      console.log('Subject saved:', data.subject); // Debug log
      await fetchSubjects();
      resetForm();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      teacherId: subject.teacherId?._id || '',
      requiredPeriods: subject.requiredPeriods.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to delete subject');
        return;
      }

      await fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      subject_name: '',
      subject_code: '',
      teacherId: '',
      requiredPeriods: '',
    });
    setEditingSubject(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subject Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject Name
                  </label>
                  <Input
                    value={formData.subject_name}
                    onChange={(e) =>
                      setFormData({ ...formData, subject_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject Code
                  </label>
                  <Input
                    value={formData.subject_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subject_code: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Teacher
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) =>
                      setFormData({ ...formData, teacherId: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select a teacher...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.faculty_name} ({teacher.teacherID})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Required Periods
                  </label>
                  <Input
                    type="number"
                    value={formData.requiredPeriods}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiredPeriods: e.target.value,
                      })
                    }
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Code</th>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Teacher</th>
                  <th className="border p-2 text-left">Required</th>
                  <th className="border p-2 text-left">Allotted</th>
                  <th className="border p-2 text-left">Remaining</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject._id}>
                    <td className="border p-2">{subject.subject_code}</td>
                    <td className="border p-2">{subject.subject_name}</td>
                    <td className="border p-2">
                      {subject.teacherId ? (
                        subject.teacherId.faculty_name
                      ) : (
                        <span className="text-gray-400 italic">No teacher assigned</span>
                      )}
                    </td>
                    <td className="border p-2">{subject.requiredPeriods}</td>
                    <td className="border p-2">{subject.allottedPeriods}</td>
                    <td className="border p-2">{subject.remainingPeriods}</td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(subject)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(subject._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}