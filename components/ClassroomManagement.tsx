'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface Classroom {
  _id: string;
  program: string;
  className: string;
  semester: number;
  division: string;
  roomNumber?: string;
  year?: string;
}

const PROGRAMS = [
  'Information Technology',
  'Cyber Security',
  'Computer Science & Technology',
  'Computer Engineering',
  'Artificial Intelligence & Data Science',
];

const CLASS_LEVELS = ['FY', 'SY', 'TY'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];
const DIVISIONS = ['A', 'B', 'C'];

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    program: '',
    className: '',
    semester: '',
    division: '',
    roomNumber: '',
    year: '',
  });

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await fetch('/api/classrooms');
      const data = await response.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        semester: parseInt(formData.semester),
        roomNumber: formData.roomNumber || undefined,
        year: formData.year || undefined,
      };

      const url = editingClassroom
        ? `/api/classrooms/${editingClassroom._id}`
        : '/api/classrooms';
      const method = editingClassroom ? 'PUT' : 'POST';

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

      await fetchClassrooms();
      resetForm();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      program: classroom.program,
      className: classroom.className,
      semester: classroom.semester.toString(),
      division: classroom.division,
      roomNumber: classroom.roomNumber || '',
      year: classroom.year || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;

    try {
      const response = await fetch(`/api/classrooms/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete classroom');
        return;
      }

      await fetchClassrooms();
    } catch (error) {
      console.error('Error deleting classroom:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      program: '',
      className: '',
      semester: '',
      division: '',
      roomNumber: '',
      year: '',
    });
    setEditingClassroom(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Classroom Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Classroom
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
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
                    Program / Department
                  </label>
                  <select
                    value={formData.program}
                    onChange={(e) =>
                      setFormData({ ...formData, program: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select program...</option>
                    {PROGRAMS.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Class Name
                  </label>
                  <select
                    value={formData.className}
                    onChange={(e) =>
                      setFormData({ ...formData, className: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select class...</option>
                    {CLASS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select semester...</option>
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Division
                  </label>
                  <select
                    value={formData.division}
                    onChange={(e) =>
                      setFormData({ ...formData, division: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select division...</option>
                    {DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Room Number (Optional)
                  </label>
                  <Input
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, roomNumber: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Year (Optional)
                  </label>
                  <Input
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingClassroom ? 'Update' : 'Create'}
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
          <CardTitle>All Classrooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Program</th>
                  <th className="border p-2 text-left">Class</th>
                  <th className="border p-2 text-left">Semester</th>
                  <th className="border p-2 text-left">Division</th>
                  <th className="border p-2 text-left">Room Number</th>
                  <th className="border p-2 text-left">Year</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((classroom) => (
                  <tr key={classroom._id}>
                    <td className="border p-2">{classroom.program}</td>
                    <td className="border p-2">{classroom.className}</td>
                    <td className="border p-2">{classroom.semester}</td>
                    <td className="border p-2">{classroom.division}</td>
                    <td className="border p-2">
                      {classroom.roomNumber || (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="border p-2">
                      {classroom.year || (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(classroom)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(classroom._id)}
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

