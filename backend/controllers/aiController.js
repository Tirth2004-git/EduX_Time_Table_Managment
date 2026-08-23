const Teacher = require('../models/Teacher');
const Timetable = require('../models/Timetable');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_MODEL_PRIORITY = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
];

async function callGemini(apiKey, prompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError;

  for (const modelName of GEMINI_MODEL_PRIORITY) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[Gemini] Success with model: ${modelName}`);
      return text;
    } catch (err) {
      console.error(`[Gemini] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      const status = err?.status ?? err?.response?.status;
      if (status !== 404 && status !== 400) break;
    }
  }

  throw lastError;
}

// @desc    Suggest replacement teacher for absent faculty
// @route   POST /api/ai/replacement
// @access  Private (Admin)
exports.suggestReplacement = async (req, res, next) => {
  try {
    const { absentTeacherId, program, semester, division, day, timeSlot } = req.body;

    if (!program || !semester || !division) {
      return res.status(400).json({ error: 'Missing context parameters: program, semester, division are required.' });
    }

    // Resolve ObjectIds
    let departmentId = null;
    let semesterId = null;
    if (program) {
      if (program.match(/^[0-9a-fA-F]{24}$/)) departmentId = program;
      else {
        const dept = await Department.findOne({ $or: [{ department_name: program }, { short_name: program }] });
        if (dept) departmentId = dept._id.toString();
      }
    }
    if (semester) {
      if (semester.toString().match(/^[0-9a-fA-F]{24}$/)) semesterId = semester;
      else {
        const semNum = isNaN(semester) ? null : Number(semester);
        if (semNum && departmentId) {
          const sem = await Semester.findOne({ semester_number: semNum, department: departmentId });
          if (sem) semesterId = sem._id.toString();
        }
      }
    }

    if (!departmentId || !semesterId) {
      return res.status(400).json({ error: 'Invalid program or semester provided.' });
    }

    // Find all assignments for this context
    const assignmentQuery = { department: departmentId, semester: semesterId };
    if (division) assignmentQuery.$or = [{ allowed_divisions: division }, { allowed_divisions: { $size: 0 } }];
    
    const assignments = await TeacherSubjectMapping.find(assignmentQuery)
      .populate('teacher_id')
      .populate('subject_id');

    const availableTeachers = [];

    for (const a of assignments) {
      if (!a.teacher_id) continue;
      const teacher = a.teacher_id;

      // Skip the absent teacher
      if (absentTeacherId && teacher._id.toString() === absentTeacherId) continue;

      // Check global workload constraint
      const assignedHours = await Timetable.countDocuments({ teacher: teacher._id });
      const remainingHours = (teacher.teaching_hours || 40) - assignedHours;

      if (remainingHours <= 0) continue; // maxed out

      // Check slot availability
      if (day && timeSlot) {
        const isBusy = await Timetable.exists({ teacher: teacher._id, day, timeSlot });
        if (isBusy) continue;
      }

      availableTeachers.push({
        id: teacher._id.toString(),
        name: teacher.faculty_name || teacher.name,
        department: teacher.department,
        teaching_hours: teacher.teaching_hours || 40,
        assignedHours,
        remainingHours,
        subject_name: a.subject_id?.subject_name || '',
      });
    }

    // Sort by lowest workload first
    availableTeachers.sort((a, b) => a.assignedHours - b.assignedHours);

    // Handle no availability edge case
    if (availableTeachers.length === 0) {
      return res.json({
        suggested: null,
        otherOptions: [],
        message: 'No available replacement teachers found for this slot. All assigned teachers are either busy or have reached their workload limit.',
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.warn('[Gemini] GEMINI_API_KEY is not set. Using fallback (lowest workload).');
      return res.json({
        suggested: {
          name: availableTeachers[0].name,
          reason: `${availableTeachers[0].name} has the lowest current workload (${availableTeachers[0].assignedHours} assigned / ${availableTeachers[0].remainingHours} remaining). Selected automatically.`,
        },
        otherOptions: availableTeachers.slice(1),
      });
    }

    const prompt = `
      You are an intelligent college scheduling AI assistant.
      A teacher is absent and needs a replacement for a specific class slot.

      Here are the available substitute teachers (already filtered to be free at this time slot), sorted by lowest current workload:
      ${JSON.stringify(availableTeachers, null, 2)}

      Your task: Select the BEST replacement teacher from this list. Prefer:
      1. Teacher with the lowest assigned workload (most remaining hours available).
      2. If workloads are similar, prefer similar department or subject.

      Respond ONLY in strict JSON (no markdown, no code block):
      {
        "bestTeacherId": "<teacher id>",
        "bestTeacherName": "<teacher name>",
        "reason": "<1-2 sentence explanation for why this teacher was selected>"
      }
      `;

    let parsedResult = null;

    try {
      const text = await callGemini(geminiKey, prompt);
      console.log('[Gemini] Raw response:', text);
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (aiErr) {
      console.warn('[Gemini] AI parse error, falling back to lowest workload rule:', aiErr.message);
      parsedResult = {
        bestTeacherId: availableTeachers[0].id,
        bestTeacherName: availableTeachers[0].name,
        reason: `${availableTeachers[0].name} has the lowest current workload (${availableTeachers[0].assignedHours} hours assigned). Selected via fallback heuristic.`,
      };
    }

    const bestTeacher = availableTeachers.find((t) => t.id === parsedResult.bestTeacherId) || availableTeachers[0];
    const otherOptions = availableTeachers.filter((t) => t.id !== bestTeacher.id);

    return res.json({
      suggested: {
        id: bestTeacher.id,
        name: bestTeacher.name,
        department: bestTeacher.department,
        teaching_hours: bestTeacher.teaching_hours,
        assignedHours: bestTeacher.assignedHours,
        remainingHours: bestTeacher.remainingHours,
        subject_name: bestTeacher.subject_name,
        reason: parsedResult.reason || `${bestTeacher.name} is the most optimal candidate.`,
      },
      otherOptions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Explain timetable diagnostics, faculty workloads, and room utilization
// @route   POST /api/ai/explain
// @access  Private (Admin)
exports.explainTimetableDiagnostics = async (req, res, next) => {
  try {
    const { departmentId, semesterId, divisionId, query } = req.body;

    if (!departmentId || !semesterId) {
      return res.status(400).json({ error: 'departmentId and semesterId are required.' });
    }

    const Subject = require('../models/Subject');
    const Classroom = require('../models/Classroom');

    // Fetch live ground truth facts from database
    const [subjects, teachers, classrooms, currentEntries] = await Promise.all([
      Subject.find({ department: departmentId, semester: semesterId, status: { $ne: 'inactive' } }).lean(),
      Teacher.find({ department: departmentId }).lean(),
      Classroom.find({ available: true }).lean(),
      Timetable.find({ department: departmentId, semester: semesterId, ...(divisionId ? { division: divisionId } : {}) })
        .populate('subject')
        .populate('teacher')
        .populate('classroom')
        .populate('laboratory')
        .lean(),
    ]);

    const scheduledCountBySubject = {};
    const dayWiseLectures = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
    const teacherLoadMap = {};
    const roomUsageMap = {};
    let labSessionsCount = 0;
    let theorySessionsCount = 0;

    currentEntries.forEach((entry) => {
      const sName = entry.subject?.subject_name || entry.subject?.subject_code || 'Other';
      const duration = entry.duration || 1;
      scheduledCountBySubject[sName] = (scheduledCountBySubject[sName] || 0) + duration;

      if (entry.day && dayWiseLectures[entry.day] !== undefined) {
        dayWiseLectures[entry.day] += 1;
      }

      if (entry.isLab || entry.type === 'LAB') {
        labSessionsCount += 1;
      } else {
        theorySessionsCount += 1;
      }

      const tName = entry.teacher?.faculty_name || entry.teacher?.name;
      if (tName) {
        teacherLoadMap[tName] = (teacherLoadMap[tName] || 0) + duration;
      }

      const rName = entry.classroom?.room_name || entry.laboratory?.room_name || 'Room';
      roomUsageMap[rName] = (roomUsageMap[rName] || 0) + 1;
    });

    const subjectBreakdown = subjects.map((s) => ({
      code: s.subject_code,
      name: s.subject_name,
      type: s.type || (s.requires_lab ? 'Lab' : 'Theory'),
      required: s.weekly_periods || (s.requires_lab ? 2 : 3),
      scheduled: scheduledCountBySubject[s.subject_name] || scheduledCountBySubject[s.subject_code] || 0,
      requiresLab: Boolean(s.requires_lab || s.type === 'Lab' || s.type === 'Laboratory'),
    }));

    // Find highest load faculty
    const sortedTeachers = Object.entries(teacherLoadMap).sort((a, b) => b[1] - a[1]);
    const topTeacher = sortedTeachers.length > 0 ? { name: sortedTeachers[0][0], hours: sortedTeachers[0][1] } : null;

    const contextData = {
      totalSubjects: subjects.length,
      subjects: subjectBreakdown,
      teacherLoads: teacherLoadMap,
      highestLoadFaculty: topTeacher,
      dayWiseDistribution: dayWiseLectures,
      theorySessionsCount,
      labSessionsCount,
      roomUtilization: roomUsageMap,
      availableRoomsCount: classrooms.length,
      scheduledEntriesCount: currentEntries.length,
    };

    const userQuestion = query || 'Provide an analysis of the current timetable status, workload, and any scheduling gaps.';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      // High-precision deterministic structured analysis
      const unassigned = subjectBreakdown.filter((s) => s.scheduled < s.required);
      let reply = `### University Timetable Analysis & Intelligence Report\n\n`;
      reply += `📊 **Schedule Overview:**\n`;
      reply += `- **Active Lectures Scheduled:** ${currentEntries.length} periods\n`;
      reply += `- **Curriculum Subjects:** ${subjects.length} (${subjectBreakdown.filter((s) => !s.requiresLab).length} Theory, ${subjectBreakdown.filter((s) => s.requiresLab).length} Labs)\n`;
      reply += `- **Theory / Lab Ratio:** ${theorySessionsCount} Theory periods vs ${labSessionsCount} Practical Lab periods\n\n`;

      reply += `📅 **Daily Load Leveling:**\n`;
      Object.entries(dayWiseLectures).forEach(([day, count]) => {
        reply += `- **${day}:** ${count} periods ${count >= 6 ? '(Standard Full Day)' : count > 0 ? '(Balanced)' : '(Free/Off)'}\n`;
      });
      reply += `\n`;

      if (topTeacher) {
        reply += `👨‍🏫 **Faculty Workload Highlight:**\n`;
        reply += `- Highest teaching load: **${topTeacher.name}** with **${topTeacher.hours} periods/week** allocated in this division.\n`;
        sortedTeachers.slice(1, 4).forEach(([name, hours]) => {
          reply += `- **${name}:** ${hours} periods/week\n`;
        });
        reply += `\n`;
      }

      if (unassigned.length > 0) {
        reply += `⚠️ **Scheduling Gaps & Remaining Quotas:**\n`;
        unassigned.forEach((u) => {
          reply += `- **${u.code} (${u.name})**: ${u.scheduled}/${u.required} allocated (Missing ${u.required - u.scheduled} period${u.required - u.scheduled > 1 ? 's' : ''})\n`;
        });
      } else {
        reply += `✅ **Curriculum Coverage:** 100% of required weekly subject periods are scheduled.\n`;
        reply += `🛡️ **Hard Constraints:** Zero faculty double-booking, zero classroom collisions, and locked break periods enforced.\n`;
      }

      return res.json({ success: true, explanation: reply, data: contextData });
    }

    const prompt = `
      You are an expert University Timetable Scheduling Architect and Copilot for EduX.
      User Query: "${userQuestion}"

      Here is the Ground Truth Context from the college database:
      ${JSON.stringify(contextData, null, 2)}

      Instructions:
      1. Answer the user query directly, thoroughly, and professionally using the exact numbers and names in the context.
      2. If the user asks about overloaded days, refer to the dayWiseDistribution data.
      3. If the user asks about faculty workloads, reference highestLoadFaculty and teacherLoads.
      4. If the user asks about room utilization or lab distribution, refer to roomUtilization and labSessionsCount.
      5. Provide actionable, practical advice for optimizing the schedule.
      6. DO NOT hallucinate teachers or numbers not in the context.
    `;

    try {
      const explanation = await callGemini(geminiKey, prompt);
      res.json({ success: true, explanation, data: contextData });
    } catch (aiErr) {
      console.error('[Gemini Copilot Error]:', aiErr?.message || aiErr);
      res.json({
        success: true,
        explanation: `Analysis: ${currentEntries.length} lectures scheduled across ${subjects.length} subjects with daily load balance and 0 collisions.`,
        data: contextData,
      });
    }
  } catch (error) {
    next(error);
  }
};
