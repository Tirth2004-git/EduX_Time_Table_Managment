import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/auth-middleware';
import { computeTeacherWorkload, computeSubjectPeriods } from '@/lib/workload-compute';

/**
 * GET /api/workload
 * Get division-scoped workload for a teacher or subject
 * Query params: teacherId, subjectId, program, className, semester, division
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const subjectId = searchParams.get('subjectId');
    const program = searchParams.get('program');
    const className = searchParams.get('className');
    const semester = searchParams.get('semester');
    const division = searchParams.get('division');

    if (!program || !className || !semester || !division) {
      return NextResponse.json(
        { error: 'program, className, semester, and division are required' },
        { status: 400 }
      );
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum)) {
      return NextResponse.json(
        { error: 'semester must be a valid number' },
        { status: 400 }
      );
    }

    const result: any = {};

    // Compute teacher workload if teacherId provided
    if (teacherId) {
      try {
        result.teacher = await computeTeacherWorkload(teacherId, program, className, semesterNum, division);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Teacher workload computation failed: ${error.message}` },
          { status: 404 }
        );
      }
    }

    // Compute subject periods if subjectId provided
    if (subjectId) {
      try {
        result.subject = await computeSubjectPeriods(subjectId, program, className, semesterNum, division);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Subject periods computation failed: ${error.message}` },
          { status: 404 }
        );
      }
    }

    if (!teacherId && !subjectId) {
      return NextResponse.json(
        { error: 'teacherId or subjectId is required' },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Get workload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

