const Semester = require('../models/Semester');

exports.getSemesters = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.departmentId) query.department = req.query.departmentId;
    const semesters = await Semester.find(query).populate('department', 'department_name short_name');
    res.json({ success: true, data: semesters });
  } catch (error) {
    next(error);
  }
};

exports.getSemesterById = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id).populate('department');
    if (!semester) return res.status(404).json({ error: 'Semester not found' });
    res.json({ semester });
  } catch (error) {
    next(error);
  }
};

exports.createSemester = async (req, res, next) => {
  try {
    const semester = await Semester.create(req.body);
    res.status(201).json({ message: 'Created', semester });
  } catch (error) {
    next(error);
  }
};

exports.updateSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!semester) return res.status(404).json({ error: 'Semester not found' });
    res.json({ message: 'Updated', semester });
  } catch (error) {
    next(error);
  }
};

exports.deleteSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findByIdAndDelete(req.params.id);
    if (!semester) return res.status(404).json({ error: 'Semester not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};
