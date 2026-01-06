import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { validateTimetable } from '@/lib/validation-engine';

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    const { program, className, semester, division, classroomId } = await req.json();

    const validation = await validateTimetable(program, className, semester, division, classroomId);

    return NextResponse.json(
      {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Validate timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

