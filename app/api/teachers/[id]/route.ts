import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Teacher from '@/models/Teacher';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET single teacher
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const teacher = await Teacher.findById(params.id);
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ teacher }, { status: 200 });
  } catch (error: any) {
    console.error('Get teacher error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update teacher
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const data = await req.json();
    const teacher = await Teacher.findByIdAndUpdate(
      params.id,
      { ...data, remainingHours: data.teaching_hours - (data.assignedHours || 0) },
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Teacher updated successfully', teacher },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE teacher
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const teacher = await Teacher.findByIdAndDelete(params.id);
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Teacher deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete teacher error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

