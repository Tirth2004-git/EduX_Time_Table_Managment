import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Classroom from '@/models/Classroom';
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

    const query: any = {};
    if (program) query.program = program;
    if (className) query.className = className;
    if (semester) query.semester = parseInt(semester);
    if (division) query.division = division;

    const classrooms = await Classroom.find(query).sort({ program: 1, className: 1, division: 1 });

    return NextResponse.json({ classrooms }, { status: 200 });
  } catch (error: any) {
    console.error('List classrooms error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { program, className, semester, division, year, roomNumber } = await req.json();

    // Validation
    if (!program || !className || !semester || !division) {
      return NextResponse.json(
        { error: 'Program, class name, semester, and division are required' },
        { status: 400 }
      );
    }

    // Check if classroom already exists
    const existingClassroom = await Classroom.findOne({ program, className, semester, division });
    if (existingClassroom) {
      return NextResponse.json(
        { error: 'Classroom with this program, class, semester, and division already exists' },
        { status: 400 }
      );
    }

    const classroom = await Classroom.create({
      program,
      className,
      semester,
      division,
      year,
      roomNumber,
    });

    return NextResponse.json(
      {
        message: 'Classroom created successfully',
        classroom,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create classroom error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Classroom with this combination already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

