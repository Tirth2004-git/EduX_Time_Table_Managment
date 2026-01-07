import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import WeeklyTimetable from '@/models/WeeklyTimetable';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import Classroom from '@/models/Classroom';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    
    // Build filter query
    const filter: any = {};
    
    if (searchParams.get('program')) {
      filter.program = searchParams.get('program');
    }
    if (searchParams.get('className')) {
      filter.className = searchParams.get('className');
    }
    if (searchParams.get('semester')) {
      filter.semester = parseInt(searchParams.get('semester')!);
    }
    if (searchParams.get('division')) {
      filter.division = searchParams.get('division');
    }
    if (searchParams.get('teacherId')) {
      filter.teacherId = searchParams.get('teacherId');
    }
    if (searchParams.get('subjectId')) {
      filter.subjectId = searchParams.get('subjectId');
    }
    if (searchParams.get('day')) {
      filter.day = searchParams.get('day');
    }
    if (searchParams.get('timeSlot')) {
      filter.timeSlot = searchParams.get('timeSlot');
    }

    const timetable = await Timetable.find(filter)
      .populate('teacherId', 'teacherID faculty_name department')
      .populate('subjectId', 'subject_name subject_code')
      .populate('classroomId', 'roomNumber building floor capacity')
      .sort({ program: 1, className: 1, semester: 1, division: 1, day: 1, timeSlot: 1 });

    // Get holidays - only if specific division is selected
    let holidays = [];
    if (filter.program && filter.className && filter.semester && filter.division) {
      const weeklyTimetable = await WeeklyTimetable.findOne({
        program: filter.program,
        className: filter.className,
        semester: filter.semester,
        division: filter.division,
      });
      holidays = weeklyTimetable?.holidays || [];
    }

    // Get all teachers and subjects for filter options
    const teachers = await Teacher.find({}, 'teacherID faculty_name department').sort({ faculty_name: 1 });
    const subjects = await Subject.find({}, 'subject_name subject_code').sort({ subject_name: 1 });

    // Transform the data to match frontend expectations
    const transformedTimetable = timetable.map(entry => ({
      _id: entry._id,
      program: entry.program,
      className: entry.className,
      semester: entry.semester,
      division: entry.division,
      day: entry.day,
      timeSlot: entry.timeSlot,
      status: entry.status,
      subject: entry.subjectId ? {
        _id: entry.subjectId._id,
        subject_name: entry.subjectId.subject_name,
        subject_code: entry.subjectId.subject_code,
      } : null,
      teacher: entry.teacherId ? {
        _id: entry.teacherId._id,
        faculty_name: entry.teacherId.faculty_name,
        teacherID: entry.teacherId.teacherID,
        department: entry.teacherId.department,
      } : null,
      classroom: entry.classroomId ? {
        _id: entry.classroomId._id,
        roomNumber: entry.classroomId.roomNumber,
        building: entry.classroomId.building,
        floor: entry.classroomId.floor,
        capacity: entry.classroomId.capacity,
      } : null,
    }));

    return NextResponse.json({ 
      timetable: transformedTimetable,
      holidays,
      teachers,
      subjects
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}