const mongoose = require('mongoose');
const laboratorySchema = new mongoose.Schema({
  lab_id: { type: String },
  lab_name: { type: String, required: true },
  capacity: { type: Number, required: true },
  equipment: [{ type: String }]
});
module.exports = mongoose.model('Laboratory', laboratorySchema);