import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import { authenticateRequest } from '@/lib/auth-middleware';
import { computeTeacherWorkload, computeSubjectPeriods } from '@/lib/workload-compute';

export async function DELETE(req: NextRequest) {
  try {
    const { error, user } = await authenticateRequest(req);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Find timetable entry
    const timetable = await Timetable.findById(id);

    if (!timetable) {
      return NextResponse.json(
        { error: 'Timetable entry not found' },
        { status: 404 }
      );
    }

    // Step 2: Check if teacherId and subjectId exist before rollback
    // Case B: Slot contains "No Subject / No Teacher" OR blank entry
    // Skip rollback completely - just delete the entry
    if (!timetable.teacherId || !timetable.subjectId) {
      // Delete entry without rollback
      await Timetable.findByIdAndDelete(id);
      
      return NextResponse.json(
        {
          message: 'Timetable entry deleted successfully (no rollback - missing teacher or subject)',
          rollback: null,
        },
        { status: 200 }
      );
    }

    // Case A: Valid teacher + subject present - Compute workload for logging only
    // No mutations needed - workload is computed dynamically from timetable entries
    
    // Get workload before deletion for logging
    let originalWorkload = null;
    let originalSubjectPeriods = null;
    
    if (timetable.teacherId) {
      try {
        originalWorkload = await computeTeacherWorkload(
          timetable.teacherId.toString(),
          timetable.program,
          timetable.className,
          timetable.semester,
          timetable.division
        );
      } catch (error) {
        // Teacher might not exist - ignore for logging
        console.warn('Could not compute workload for logging:', error);
      }
    }
    
    if (timetable.subjectId) {
      try {
        originalSubjectPeriods = await computeSubjectPeriods(
          timetable.subjectId.toString(),
          timetable.program,
          timetable.className,
          timetable.semester,
          timetable.division
        );
      } catch (error) {
        // Subject might not exist - ignore for logging
        console.warn('Could not compute subject periods for logging:', error);
      }
    }

    // Delete timetable entry - workload recomputes automatically on next query
    await Timetable.findByIdAndDelete(id);

    // Compute updated workload after deletion for logging
    let updatedWorkload = null;
    let updatedSubjectPeriods = null;
    
    if (timetable.teacherId) {
      try {
        updatedWorkload = await computeTeacherWorkload(
          timetable.teacherId.toString(),
          timetable.program,
          timetable.className,
          timetable.semester,
          timetable.division
        );
      } catch (error) {
        // Ignore for logging
      }
    }
    
    if (timetable.subjectId) {
      try {
        updatedSubjectPeriods = await computeSubjectPeriods(
          timetable.subjectId.toString(),
          timetable.program,
          timetable.className,
          timetable.semester,
          timetable.division
        );
      } catch (error) {
        // Ignore for logging
      }
    }

    // Log deletion operation
    console.log('Timetable Entry Deleted:', {
      timetableId: id,
      context: {
        program: timetable.program,
        className: timetable.className,
        semester: timetable.semester,
        division: timetable.division,
      },
      teacher: originalWorkload ? {
        assignedHours: { before: originalWorkload.assignedHours, after: updatedWorkload?.assignedHours || 0 },
        remainingHours: { before: originalWorkload.remainingHours, after: updatedWorkload?.remainingHours || 0 },
      } : null,
      subject: originalSubjectPeriods ? {
        allottedPeriods: { before: originalSubjectPeriods.allottedPeriods, after: updatedSubjectPeriods?.allottedPeriods || 0 },
        remainingPeriods: { before: originalSubjectPeriods.remainingPeriods, after: updatedSubjectPeriods?.remainingPeriods || 0 },
      } : null,
    });

    return NextResponse.json(
      {
        message: 'Timetable entry deleted successfully. Workload recomputed dynamically.',
        workload: updatedWorkload ? {
          teacher: {
            assignedHours: updatedWorkload.assignedHours,
            remainingHours: updatedWorkload.remainingHours,
          },
        } : null,
        subject: updatedSubjectPeriods ? {
          allottedPeriods: updatedSubjectPeriods.allottedPeriods,
          remainingPeriods: updatedSubjectPeriods.remainingPeriods,
        } : null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete timetable error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during rollback operation' },
      { status: 500 }
    );
  }
}

