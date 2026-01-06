import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subject from '@/models/Subject';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET all subjects
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const subjects = await Subject.find()
      .populate({
        path: 'teacherId',
        select: 'teacherID faculty_name department',
        options: { strictPopulate: false }
      })
      .sort({ subject_code: 1 });

    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error: any) {
    console.error('Get subjects error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create subject
export async function POST(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const data = await req.json();
    
    // Validate teacherId if provided
    if (data.teacherId && data.teacherId.trim() === '') {
      data.teacherId = null;
    }
    
    const subject = await Subject.create(data);

    const populatedSubject = await Subject.findById(subject._id)
      .populate({
        path: 'teacherId',
        select: 'teacherID faculty_name department',
        options: { strictPopulate: false }
      });

    return NextResponse.json(
      { message: 'Subject created successfully', subject: populatedSubject },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create subject error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Subject code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

