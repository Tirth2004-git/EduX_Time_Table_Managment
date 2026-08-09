const mongoose = require('mongoose');
const constraintSchema = new mongoose.Schema({
  hard_constraints: [{ type: String }],
  soft_constraints: [{ type: String }]
});
module.exports = mongoose.model('SchedulingConstraint', constraintSchema);