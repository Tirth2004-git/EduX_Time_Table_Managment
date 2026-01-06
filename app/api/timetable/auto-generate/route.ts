import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/auth-middleware';
import { autoGenerateTimetable } from '@/lib/auto-timetable-generator';

/**
 * POST /api/timetable/auto-generate
 * Auto-generate timetable for a division
 * Body: { program, className, semester, division, mode: 'fill' | 'full' }
 */
export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { program, className, semester, division, mode } = await req.json();

    // Validation
    if (!program || !className || !semester || !division || !mode) {
      return NextResponse.json(
        { error: 'All fields are required (program, className, semester, division, mode)' },
        { status: 400 }
      );
    }

    if (mode !== 'fill' && mode !== 'full') {
      return NextResponse.json(
        { error: 'mode must be either "fill" or "full"' },
        { status: 400 }
      );
    }

    // Run auto-generation
    const result = await autoGenerateTimetable(
      program,
      className,
      semester,
      division,
      mode,
      user.userId
    );

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('Auto-generate timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



