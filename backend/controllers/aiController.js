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

      const jsonStr = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      parsedResult = JSON.parse(jsonStr);
    } catch (err) {
      console.error('[Gemini] Failed to get or parse AI response:', err?.message || err);
      parsedResult = {
        bestTeacherId: availableTeachers[0].id,
        bestTeacherName: availableTeachers[0].name,
        reason: `${availableTeachers[0].name} was selected automatically based on the lowest current workload (AI response unavailable).`,
      };
    }

    const suggestedId = parsedResult.bestTeacherId;
    const suggested = {
      name: parsedResult.bestTeacherName,
      reason: parsedResult.reason,
    };
    const otherOptions = availableTeachers.filter(t => t.id !== suggestedId);

    res.json({ suggested, otherOptions });

  } catch (error) {
    next(error);
  }
};
