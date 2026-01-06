import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const program = searchParams.get('program');
    const className = searchParams.get('className');
    const semester = searchParams.get('semester');
    const division = searchParams.get('division');
    const day = searchParams.get('day');
    const classroomId = searchParams.get('classroomId');

    const query: any = {};
    if (classroomId) {
      query.classroomId = classroomId;
    } else {
      // Support filtering by classroomId OR division + semester
      if (program) query.program = program;
      if (className) query.className = className;
      if (semester) query.semester = parseInt(semester);
      if (division) query.division = division;
    }
    if (day) query.day = day;

    const timetable = await Timetable.find(query)
      .populate('subjectId', 'subject_name subject_code requiredPeriods allottedPeriods remainingPeriods')
      .populate('teacherId', 'teacherID faculty_name department teaching_hours assignedHours remainingHours')
      .populate('classroomId', 'program className semester division roomNumber')
      .sort({ program: 1, className: 1, semester: 1, division: 1, day: 1, timeSlot: 1 });

    return NextResponse.json({ timetable }, { status: 200 });
  } catch (error: any) {
    console.error('List timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

