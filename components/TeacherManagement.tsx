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
  subject_name: string;
  department: string;
  teaching_hours: number;
  teacher_number: string;
  classroom: string;
  assignedHours: number;
  remainingHours: number;
}

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    teacherID: '',
    faculty_name: '',
    subject_name: '',
    department: '',
    teaching_hours: '',
    teacher_number: '',
    classroom: '',
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

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
      const payload = {
        ...formData,
        teaching_hours: parseInt(formData.teaching_hours),
      };

      const url = editingTeacher
        ? `/api/teachers/${editingTeacher._id}`
        : '/api/teachers';
      const method = editingTeacher ? 'PUT' : 'POST';

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

      await fetchTeachers();
      resetForm();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacherID: teacher.teacherID,
      faculty_name: teacher.faculty_name,
      subject_name: teacher.subject_name,
      department: teacher.department,
      teaching_hours: teacher.teaching_hours.toString(),
      teacher_number: teacher.teacher_number,
      classroom: teacher.classroom,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    try {
      const response = await fetch(`/api/teachers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to delete teacher');
        return;
      }

      await fetchTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      teacherID: '',
      faculty_name: '',
      subject_name: '',
      department: '',
      teaching_hours: '',
      teacher_number: '',
      classroom: '',
    });
    setEditingTeacher(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teacher Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
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
                    Teacher ID
                  </label>
                  <Input
                    value={formData.teacherID}
                    onChange={(e) =>
                      setFormData({ ...formData, teacherID: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Faculty Name
                  </label>
                  <Input
                    value={formData.faculty_name}
                    onChange={(e) =>
                      setFormData({ ...formData, faculty_name: e.target.value })
                    }
                    required
                  />
                </div>
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
                    Department
                  </label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Teaching Hours
                  </label>
                  <Input
                    type="number"
                    value={formData.teaching_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, teaching_hours: e.target.value })
                    }
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Teacher Number
                  </label>
                  <Input
                    value={formData.teacher_number}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher_number: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Classroom
                  </label>
                  <Input
                    value={formData.classroom}
                    onChange={(e) =>
                      setFormData({ ...formData, classroom: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingTeacher ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">ID</th>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Subject</th>
                  <th className="border p-2 text-left">Department</th>
                  <th className="border p-2 text-left">Hours</th>
                  <th className="border p-2 text-left">Assigned</th>
                  <th className="border p-2 text-left">Remaining</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher._id}>
                    <td className="border p-2">{teacher.teacherID}</td>
                    <td className="border p-2">{teacher.faculty_name}</td>
                    <td className="border p-2">{teacher.subject_name}</td>
                    <td className="border p-2">{teacher.department}</td>
                    <td className="border p-2">{teacher.teaching_hours}</td>
                    <td className="border p-2">{teacher.assignedHours}</td>
                    <td className="border p-2">
                      <span
                        className={
                          teacher.remainingHours === 0
                            ? 'text-red-600 font-semibold'
                            : ''
                        }
                      >
                        {teacher.remainingHours}
                      </span>
                    </td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(teacher)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(teacher._id)}
                        >
                          <Trash2 className="h-3 w-3" />
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

