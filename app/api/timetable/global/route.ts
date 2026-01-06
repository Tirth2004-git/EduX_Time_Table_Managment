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
    const teacherId = searchParams.get('teacherId');
    const subjectId = searchParams.get('subjectId');
    const day = searchParams.get('day');
    const timeSlot = searchParams.get('timeSlot');
    const classroomId = searchParams.get('classroomId');

    // Build query with filters
    // If no filters are provided, return ALL timetable entries
    // Field names must match exactly: program, className, semester (number), division
    const query: any = {};
    
    // Priority: classroomId filter takes precedence
    if (classroomId) {
      query.classroomId = classroomId;
    } else {
      // Apply filters only if provided (exact match)
      // Empty filters = return all entries
      if (program && program.trim() !== '') {
        query.program = program.trim();
      }
      if (className && className.trim() !== '') {
        query.className = className.trim();
      }
      if (semester && semester.trim() !== '') {
        // Parse semester as number (handle "6", "Sem-6", etc.)
        const semesterNum = parseInt(semester.trim().replace(/^Sem-?/i, ''));
        if (!isNaN(semesterNum)) {
          query.semester = semesterNum;
        }
      }
      if (division && division.trim() !== '') {
        query.division = division.trim();
      }
    }
    
    // Additional filters (teacher, subject, day, timeSlot)
    if (teacherId && teacherId.trim() !== '') {
      query.teacherId = teacherId.trim();
    }
    if (subjectId && subjectId.trim() !== '') {
      query.subjectId = subjectId.trim();
    }
    if (day && day.trim() !== '') {
      query.day = day.trim();
    }
    if (timeSlot && timeSlot.trim() !== '') {
      query.timeSlot = timeSlot.trim();
    }

    // Debug logging (can be removed in production)
    console.log('Global Timetable Query:', JSON.stringify(query, null, 2));

    // Fetch timetable entries with populated data
    // Only fetch entries with status 'valid' (exclude conflicts if needed)
    // Note: We include all entries regardless of status for preview
    const timetable = await Timetable.find(query)
      .populate('subjectId', 'subject_name subject_code requiredPeriods allottedPeriods remainingPeriods')
      .populate('teacherId', 'teacherID faculty_name department teaching_hours assignedHours remainingHours')
      .populate('classroomId', 'program className semester division roomNumber year')
      .populate('createdBy', 'username email')
      .sort({ program: 1, className: 1, semester: 1, division: 1, day: 1, timeSlot: 1 })
      .lean();

    console.log(`Global Timetable Results: ${timetable.length} entries found`);

    // Transform data for frontend
    const formattedTimetable = timetable.map((entry: any) => ({
      _id: entry._id,
      program: entry.program,
      className: entry.className,
      semester: entry.semester,
      division: entry.division,
      day: entry.day,
      timeSlot: entry.timeSlot,
      status: entry.status,
      classroomId: entry.classroomId?._id || null,
      classroom: entry.classroomId ? {
        program: entry.classroomId.program,
        className: entry.classroomId.className,
        semester: entry.classroomId.semester,
        division: entry.classroomId.division,
        roomNumber: entry.classroomId.roomNumber,
        year: entry.classroomId.year,
      } : null,
      subject: entry.subjectId ? {
        _id: entry.subjectId._id,
        subject_name: entry.subjectId.subject_name,
        subject_code: entry.subjectId.subject_code,
        requiredPeriods: entry.subjectId.requiredPeriods,
        allottedPeriods: entry.subjectId.allottedPeriods,
        remainingPeriods: entry.subjectId.remainingPeriods,
      } : null,
      teacher: entry.teacherId ? {
        _id: entry.teacherId._id,
        teacherID: entry.teacherId.teacherID,
        faculty_name: entry.teacherId.faculty_name,
        department: entry.teacherId.department,
        teaching_hours: entry.teacherId.teaching_hours,
        assignedHours: entry.teacherId.assignedHours,
        remainingHours: entry.teacherId.remainingHours,
      } : null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    return NextResponse.json(
      {
        timetable: formattedTimetable,
        count: formattedTimetable.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Global timetable error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

