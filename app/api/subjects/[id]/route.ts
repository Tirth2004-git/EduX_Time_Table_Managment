import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subject from '@/models/Subject';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET single subject
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const subject = await Subject.findById(params.id).populate({
      path: 'teacherId',
      select: 'teacherID faculty_name department',
      options: { strictPopulate: false }
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subject }, { status: 200 });
  } catch (error: any) {
    console.error('Get subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update subject
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const data = await req.json();
    
    // Validate teacherId if provided
    if (data.teacherId && data.teacherId.trim() === '') {
      data.teacherId = null;
    }
    
    const subject = await Subject.findByIdAndUpdate(
      params.id,
      { ...data, remainingPeriods: data.requiredPeriods - (data.allottedPeriods || 0) },
      { new: true, runValidators: true }
    ).populate({
      path: 'teacherId',
      select: 'teacherID faculty_name department',
      options: { strictPopulate: false }
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Subject updated successfully', subject },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE subject
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const subject = await Subject.findByIdAndDelete(params.id);
    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Subject deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

