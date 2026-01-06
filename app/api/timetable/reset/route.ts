import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const program = searchParams.get('program');
    const className = searchParams.get('className');
    const semester = searchParams.get('semester');
    const division = searchParams.get('division');

    // Validation
    if (!program || !className || !semester || !division) {
      return NextResponse.json(
        { error: 'Program, class name, semester, and division are required' },
        { status: 400 }
      );
    }

    console.log('Resetting timetable for:', { program, className, semester, division });

    // Delete all timetable entries for the specified division context
    const deleteResult = await Timetable.deleteMany({ 
      program,
      className,
      semester: parseInt(semester),
      division
    });
    
    console.log('Deleted entries:', deleteResult.deletedCount);

    return NextResponse.json(
      { 
        message: 'Timetable reset successfully',
        deletedCount: deleteResult.deletedCount
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Reset timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}