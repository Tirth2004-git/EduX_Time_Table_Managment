import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import { validateTimetableEntry } from '@/lib/validation-engine';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let { program, className, semester, division, day, timeSlot, subjectId, teacherId, classroomId } = await req.json();

    // Normalize field values to match database schema
    if (program) program = program.trim();
    if (className) className = className.trim();
    if (division) division = division.trim();
    if (day) day = day.trim();
    if (timeSlot) timeSlot = timeSlot.trim();
    
    // Ensure semester is a number
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

    // Check for existing entry in same slot
    const existingEntry = await Timetable.findOne({
      program,
      className,
      semester,
      division,
      day,
      timeSlot,
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Time slot already occupied' },
        { status: 400 }
      );
    }

    // Check for classroom conflict (same classroom, same time slot)
    if (classroomId) {
      const classroomConflict = await Timetable.findOne({
        classroomId,
        day,
        timeSlot,
      });

      if (classroomConflict) {
        return NextResponse.json(
          { error: `Classroom conflict: Room is already booked for ${classroomConflict.program} ${classroomConflict.className}-${classroomConflict.division} at this time` },
          { status: 400 }
        );
      }
    }

    // Validate timetable entry
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
      status: 'valid',
      createdBy: 'admin', // Temporarily hardcoded since auth is disabled
    });

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

