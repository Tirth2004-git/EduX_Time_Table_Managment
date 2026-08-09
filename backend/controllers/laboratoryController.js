const Laboratory = require('../models/Laboratory');

exports.getLaboratories = async (req, res, next) => {
  try {
    const laboratories = await Laboratory.find();
    res.json({ laboratories });
  } catch (error) {
    next(error);
  }
};

exports.getLaboratoryById = async (req, res, next) => {
  try {
    const laboratory = await Laboratory.findById(req.params.id);
    if (!laboratory) return res.status(404).json({ error: 'Laboratory not found' });
    res.json({ laboratory });
  } catch (error) {
    next(error);
  }
};

exports.createLaboratory = async (req, res, next) => {
  try {
    const laboratory = await Laboratory.create(req.body);
    res.status(201).json({ message: 'Created', laboratory });
  } catch (error) {
    next(error);
  }
};

exports.updateLaboratory = async (req, res, next) => {
  try {
    const laboratory = await Laboratory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!laboratory) return res.status(404).json({ error: 'Laboratory not found' });
    res.json({ message: 'Updated', laboratory });
  } catch (error) {
    next(error);
  }
};

exports.deleteLaboratory = async (req, res, next) => {
  try {
    const laboratory = await Laboratory.findByIdAndDelete(req.params.id);
    if (!laboratory) return res.status(404).json({ error: 'Laboratory not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};
