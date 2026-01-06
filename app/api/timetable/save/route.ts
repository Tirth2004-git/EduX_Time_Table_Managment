import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import WeeklyTimetable from '@/models/WeeklyTimetable';
import { authenticateRequest } from '@/lib/auth-middleware';
import { validateWeeklyTimetable } from '@/lib/validation-engine';

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { program, className, semester, division, holidays = [] } = await req.json();

    // Validation
    if (!program || !className || semester === undefined || !division) {
      return NextResponse.json(
        { error: 'Program, class name, semester, and division are required' },
        { status: 400 }
      );
    }

    // Validate weekly timetable before saving
    // Note: Full capacity (remainingHours === 0, remainingPeriods === 0) is VALID
    // Only actual conflicts (exceeding limits) will block the save
    // Warnings are informational and do NOT block saves
    const validation = await validateWeeklyTimetable(
      program,
      className,
      semester,
      division,
      holidays
    );

    // Only block save if there are actual errors (conflicts)
    // Warnings are allowed - they don't prevent saving
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Timetable validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Find or create weekly timetable
    let weeklyTimetable = await WeeklyTimetable.findOne({
      program,
      className,
      semester,
      division,
    });

    // Get all timetable entries for this class
    const timetableEntries = await Timetable.find({
      program,
      className,
      semester,
      division,
    });

    const timetableEntryIds = timetableEntries.map((entry) => entry._id);

    if (weeklyTimetable) {
      // Update existing weekly timetable
      weeklyTimetable.holidays = holidays;
      weeklyTimetable.timetableEntries = timetableEntryIds;
      await weeklyTimetable.save();
    } else {
      // Create new weekly timetable
      weeklyTimetable = await WeeklyTimetable.create({
        program,
        className,
        semester,
        division,
        holidays,
        timetableEntries: timetableEntryIds,
        createdBy: user.userId,
      });
    }

    return NextResponse.json(
      {
        message: 'Timetable saved successfully',
        weeklyTimetable: {
          _id: weeklyTimetable._id,
          program: weeklyTimetable.program,
          className: weeklyTimetable.className,
          semester: weeklyTimetable.semester,
          division: weeklyTimetable.division,
          holidays: weeklyTimetable.holidays,
          timetableEntriesCount: timetableEntryIds.length,
        },
        warnings: validation.warnings,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Save timetable error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Weekly timetable for this class already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved weekly timetable
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

    if (!program || !className || !semester || !division) {
      return NextResponse.json(
        { error: 'Program, class name, semester, and division are required' },
        { status: 400 }
      );
    }

    const weeklyTimetable = await WeeklyTimetable.findOne({
      program,
      className,
      semester: parseInt(semester),
      division,
    }).populate('timetableEntries');

    if (!weeklyTimetable) {
      return NextResponse.json(
        { error: 'Weekly timetable not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        weeklyTimetable: {
          _id: weeklyTimetable._id,
          program: weeklyTimetable.program,
          className: weeklyTimetable.className,
          semester: weeklyTimetable.semester,
          division: weeklyTimetable.division,
          holidays: weeklyTimetable.holidays,
          timetableEntriesCount: weeklyTimetable.timetableEntries.length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get weekly timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

