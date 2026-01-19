import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Timetable from '@/models/Timetable';
import WeeklyTimetable from '@/models/WeeklyTimetable';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import Classroom from '@/models/Classroom';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    
    // Build filter query
    const filter: any = {};
    
    if (searchParams.get('program')) {
      filter.program = searchParams.get('program');
    }
    if (searchParams.get('className')) {
      filter.className = searchParams.get('className');
    }
    if (searchParams.get('semester')) {
      filter.semester = parseInt(searchParams.get('semester')!);
    }
    if (searchParams.get('division')) {
      filter.division = searchParams.get('division');
    }
    if (searchParams.get('teacherId')) {
      // Convert string to ObjectId for MongoDB query
      filter.teacherId = new mongoose.Types.ObjectId(searchParams.get('teacherId')!);
    }
    if (searchParams.get('subjectId')) {
      // Convert string to ObjectId for MongoDB query
      filter.subjectId = new mongoose.Types.ObjectId(searchParams.get('subjectId')!);
    }
    if (searchParams.get('day')) {
      filter.day = searchParams.get('day');
    }
    if (searchParams.get('timeSlot')) {
      filter.timeSlot = searchParams.get('timeSlot');
    }

    // Get collection names from models (Mongoose uses lowercase plural by default)
    // Fallback to default Mongoose convention if collection name is not available
    const teachersCollection = Teacher.collection?.name || 'teachers';
    const subjectsCollection = Subject.collection?.name || 'subjects';
    const classroomsCollection = Classroom.collection?.name || 'classrooms';

    // Use MongoDB aggregation to join classrooms dynamically based on (program, className, semester, division)
    const aggregationPipeline: any[] = [
      // Match timetable entries based on filters
      { $match: filter },
      
      // Lookup and populate teacher
      {
        $lookup: {
          from: teachersCollection,
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacherData'
        }
      },
      {
        $unwind: {
          path: '$teacherData',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Lookup and populate subject
      {
        $lookup: {
          from: subjectsCollection,
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subjectData'
        }
      },
      {
        $unwind: {
          path: '$subjectData',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Lookup classroom dynamically based on (program, className, semester, division)
      {
        $lookup: {
          from: classroomsCollection,
          let: {
            p: '$program',
            c: '$className',
            s: '$semester',
            d: '$division'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$program', '$$p'] },
                    { $eq: ['$className', '$$c'] },
                    { $eq: ['$semester', '$$s'] },
                    { $eq: ['$division', '$$d'] }
                  ]
                }
              }
            }
          ],
          as: 'classroomData'
        }
      },
      {
        $unwind: {
          path: '$classroomData',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Sort results
      {
        $sort: {
          program: 1,
          className: 1,
          semester: 1,
          division: 1,
          day: 1,
          timeSlot: 1
        }
      }
    ];

    const timetable = await Timetable.aggregate(aggregationPipeline);

    // Get holidays - only if specific division is selected
    let holidays = [];
    if (filter.program && filter.className && filter.semester && filter.division) {
      const weeklyTimetable = await WeeklyTimetable.findOne({
        program: filter.program,
        className: filter.className,
        semester: filter.semester,
        division: filter.division,
      });
      holidays = weeklyTimetable?.holidays || [];
    }

    // Get all teachers and subjects for filter options
    const teachers = await Teacher.find({}, 'teacherID faculty_name department').sort({ faculty_name: 1 });
    const subjects = await Subject.find({}, 'subject_name subject_code').sort({ subject_name: 1 });

    // Transform the aggregated data to match frontend expectations
    const transformedTimetable = timetable.map(entry => ({
      _id: entry._id,
      program: entry.program,
      className: entry.className,
      semester: entry.semester,
      division: entry.division,
      day: entry.day,
      timeSlot: entry.timeSlot,
      status: entry.status,
      subject: entry.subjectData ? {
        _id: entry.subjectData._id,
        subject_name: entry.subjectData.subject_name,
        subject_code: entry.subjectData.subject_code,
      } : null,
      teacher: entry.teacherData ? {
        _id: entry.teacherData._id,
        faculty_name: entry.teacherData.faculty_name,
        teacherID: entry.teacherData.teacherID,
        department: entry.teacherData.department,
      } : null,
      classroom: entry.classroomData ? {
        _id: entry.classroomData._id,
        roomNumber: entry.classroomData.roomNumber || null,
        building: entry.classroomData.building,
        floor: entry.classroomData.floor,
        capacity: entry.classroomData.capacity,
      } : null,
    }));

    return NextResponse.json({ 
      timetable: transformedTimetable,
      holidays,
      teachers,
      subjects
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}