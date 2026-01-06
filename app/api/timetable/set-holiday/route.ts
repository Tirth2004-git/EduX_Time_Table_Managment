import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import WeeklyConfig from '@/models/WeeklyConfig';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { program, className, semester, division, day, action } = await req.json();

    // Validation
    if (!program || !className || !semester || !division || !day || !action) {
      return NextResponse.json(
        { error: 'All fields are required (program, className, semester, division, day, action)' },
        { status: 400 }
      );
    }

    if (action !== 'set' && action !== 'remove') {
      return NextResponse.json(
        { error: 'Action must be either "set" or "remove"' },
        { status: 400 }
      );
    }

    if (action === 'set') {
      // Check if day has existing timetable entries
      const existingEntries = await Timetable.find({
        program,
        className,
        semester: parseInt(semester),
        division,
        day,
      }).populate('subjectId teacherId');

      // Delete all timetable entries for this day
      const deleteResult = await Timetable.deleteMany({
        program,
        className,
        semester: parseInt(semester),
        division,
        day,
      });

      // Update or create weekly config with holiday
      await WeeklyConfig.findOneAndUpdate(
        {
          program,
          className,
          semester: parseInt(semester),
          division,
        },
        {
          $addToSet: { holidays: day },
        },
        { upsert: true }
      );

      return NextResponse.json({
        message: 'Holiday set successfully',
        deletedEntries: deleteResult.deletedCount,
        affectedSubjects: existingEntries.map(e => e.subjectId?.subject_name).filter(Boolean),
        affectedTeachers: [...new Set(existingEntries.map(e => e.teacherId?.faculty_name).filter(Boolean))],
      });

    } else if (action === 'remove') {
      // Remove holiday from weekly config
      await WeeklyConfig.findOneAndUpdate(
        {
          program,
          className,
          semester: parseInt(semester),
          division,
        },
        {
          $pull: { holidays: day },
        }
      );

      return NextResponse.json({
        message: 'Holiday removed successfully',
      });
    }

  } catch (error: any) {
    console.error('Set holiday error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}