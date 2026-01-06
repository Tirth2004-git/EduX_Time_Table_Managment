import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Teacher from '@/models/Teacher';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET all teachers
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const teachers = await Teacher.find().sort({ teacherID: 1 });
    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error: any) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create teacher
export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const data = await req.json();
    const teacher = await Teacher.create(data);

    return NextResponse.json(
      { message: 'Teacher created successfully', teacher },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create teacher error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Teacher ID already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

