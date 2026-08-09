import { useState, useEffect } from 'react';
import api from '@/services/api/index';

export function useMasterData(departmentId, semesterId) {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        console.log('Department API response', res.data);
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch departments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setSemesters([]);
      return;
    }
    const fetchSemesters = async () => {
      try {
        const res = await api.get(`/semesters?departmentId=${departmentId}`);
        console.log('Semester API response', res.data);
        setSemesters(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch semesters', err);
      }
    };
    fetchSemesters();
  }, [departmentId]);

  useEffect(() => {
    if (!departmentId || !semesterId) {
      setDivisions([]);
      return;
    }
    const fetchDivisions = async () => {
      try {
        const res = await api.get(`/divisions?departmentId=${departmentId}&semesterId=${semesterId}`);
        console.log('Division API response', res.data);
        setDivisions(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch divisions', err);
      }
    };
    fetchDivisions();
  }, [departmentId, semesterId]);

  return { departments, semesters, divisions, loading };
}
