const Division = require('../models/Division');

exports.getDivisions = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.departmentId) query.department = req.query.departmentId;
    if (req.query.semesterId) query.semester = req.query.semesterId;
    
    const divisions = await Division.find(query).populate('semester').populate('department');
    res.json({ success: true, data: divisions });
  } catch (error) {
    next(error);
  }
};

exports.getDivisionById = async (req, res, next) => {
  try {
    const division = await Division.findById(req.params.id).populate('semester department');
    if (!division) return res.status(404).json({ error: 'Division not found' });
    res.json({ division });
  } catch (error) {
    next(error);
  }
};

exports.createDivision = async (req, res, next) => {
  try {
    const division = await Division.create(req.body);
    res.status(201).json({ message: 'Created', division });
  } catch (error) {
    next(error);
  }
};

exports.updateDivision = async (req, res, next) => {
  try {
    const division = await Division.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!division) return res.status(404).json({ error: 'Division not found' });
    res.json({ message: 'Updated', division });
  } catch (error) {
    next(error);
  }
};

exports.deleteDivision = async (req, res, next) => {
  try {
    const division = await Division.findByIdAndDelete(req.params.id);
    if (!division) return res.status(404).json({ error: 'Division not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};
