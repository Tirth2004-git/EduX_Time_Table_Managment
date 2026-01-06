import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Classroom from '@/models/Classroom';
import Timetable from '@/models/Timetable';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const classroom = await Classroom.findById(params.id);

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    return NextResponse.json({ classroom }, { status: 200 });
  } catch (error: any) {
    console.error('Get classroom error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { program, className, semester, division, year, roomNumber } = await req.json();

    const classroom = await Classroom.findById(params.id);

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // If program, className, semester, or division is being changed, check for conflicts
    if (program || className || semester !== undefined || division) {
      const newProgram = program || classroom.program;
      const newClassName = className || classroom.className;
      const newSemester = semester !== undefined ? semester : classroom.semester;
      const newDivision = division || classroom.division;

      const existingClassroom = await Classroom.findOne({
        program: newProgram,
        className: newClassName,
        semester: newSemester,
        division: newDivision,
        _id: { $ne: params.id },
      });

      if (existingClassroom) {
        return NextResponse.json(
          { error: 'Classroom with this combination already exists' },
          { status: 400 }
        );
      }
    }

    // Update classroom
    if (program) classroom.program = program;
    if (className) classroom.className = className;
    if (semester !== undefined) classroom.semester = semester;
    if (division) classroom.division = division;
    if (year !== undefined) classroom.year = year;
    if (roomNumber !== undefined) classroom.roomNumber = roomNumber;

    await classroom.save();

    return NextResponse.json(
      {
        message: 'Classroom updated successfully',
        classroom,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update classroom error:', error);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const classroom = await Classroom.findById(params.id);

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if classroom is used in timetable
    const timetableEntries = await Timetable.countDocuments({
      $or: [
        { classroomId: params.id },
        {
          program: classroom.program,
          className: classroom.className,
          semester: classroom.semester,
          division: classroom.division,
        },
      ],
    });

    if (timetableEntries > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete classroom. It has ${timetableEntries} timetable entries associated with it.`,
        },
        { status: 400 }
      );
    }

    await Classroom.findByIdAndDelete(params.id);

    return NextResponse.json(
      { message: 'Classroom deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete classroom error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

