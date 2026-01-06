import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WeeklyConfig from '@/models/WeeklyConfig';

export async function GET(req: NextRequest) {
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
        { error: 'All parameters are required (program, className, semester, division)' },
        { status: 400 }
      );
    }

    // Find weekly config
    const config = await WeeklyConfig.findOne({
      program,
      className,
      semester: parseInt(semester),
      division,
    });

    return NextResponse.json({
      holidays: config?.holidays || [],
    });

  } catch (error: any) {
    console.error('Get weekly config error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}