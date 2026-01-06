import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import { authenticateRequest } from '@/lib/auth-middleware';
import { validateTimetableEntry } from '@/lib/validation-engine';

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    let { program, className, semester, division, day, timeSlot, subjectId, teacherId, classroomId } = await req.json();

    // Normalize field values to match database schema
    // Trim strings and ensure proper types
    if (program) program = program.trim();
    if (className) className = className.trim();
    if (division) division = division.trim();
    if (day) day = day.trim();
    if (timeSlot) timeSlot = timeSlot.trim();
    
    // Ensure semester is a number (handle string inputs like "6" or "Sem-6")
    if (typeof semester === 'string') {
      semester = parseInt(semester.trim().replace(/^Sem-?/i, ''));
    }
    if (isNaN(semester) || semester < 1 || semester > 6) {
      return NextResponse.json(
        { error: 'Invalid semester. Must be a number between 1 and 6' },
        { status: 400 }
      );
    }

    // Validation
    if (!program || !className || !semester || !division || !day || !timeSlot || !subjectId || !teacherId) {
      return NextResponse.json(
        { error: 'All fields are required (program, className, semester, division, day, timeSlot, subjectId, teacherId)' },
        { status: 400 }
      );
    }

    // Validate timetable entry
    // Note: Full capacity (remainingHours === 0, remainingPeriods === 0) is VALID
    // Only actual conflicts (exceeding limits) will block the creation
    // Warnings are informational and do NOT block creation
    const validation = await validateTimetableEntry(
      program,
      className,
      semester,
      division,
      day,
      timeSlot,
      subjectId,
      teacherId
    );

    // Only block creation if there are actual errors (conflicts)
    // Warnings are allowed - they don't prevent creation
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Create timetable entry
    // Status is 'valid' even with warnings (warnings are informational, not conflicts)
    // Only mark as 'conflict' if there are actual validation errors (which would prevent creation)
    const timetable = await Timetable.create({
      program,
      className,
      semester,
      division,
      day,
      timeSlot,
      subjectId,
      teacherId,
      classroomId: classroomId || undefined,
      status: 'valid', // Always valid if validation passed (no errors)
      createdBy: user.userId,
    });

    // No workload mutations needed - workload is computed dynamically from timetable entries

    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate('subjectId')
      .populate('teacherId', 'teacherID faculty_name department');

    return NextResponse.json(
      {
        message: 'Timetable entry added successfully',
        timetable: populatedTimetable,
        warnings: validation.warnings,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Add timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

