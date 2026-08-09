const AcademicYear = require('../models/AcademicYear');

exports.getAcademicYears = async (req, res, next) => {
  try {
    const years = await AcademicYear.find().sort({ startDate: -1 });
    res.json({ success: true, years });
  } catch (error) {
    next(error);
  }
};

exports.createAcademicYear = async (req, res, next) => {
  try {
    const { name, startDate, endDate, isCurrent, workingDays, semesters, examPeriods } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'name, startDate, and endDate are required' });
    }

    if (isCurrent) {
      await AcademicYear.updateMany({}, { $set: { isCurrent: false } });
    }

    const year = await AcademicYear.create({
      name,
      startDate,
      endDate,
      isCurrent: isCurrent || false,
      workingDays: workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      semesters: semesters || [],
      examPeriods: examPeriods || [],
    });

    res.status(201).json({ success: true, year });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentAcademicYear = async (req, res, next) => {
  try {
    let year = await AcademicYear.findOne({ isCurrent: true });
    if (!year) year = await AcademicYear.findOne().sort({ startDate: -1 });
    res.json({ success: true, year });
  } catch (error) {
    next(error);
  }
};

exports.updateAcademicYear = async (req, res, next) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!year) return res.status(404).json({ error: 'Academic year not found' });
    res.json({ success: true, year });
  } catch (error) {
    next(error);
  }
};
