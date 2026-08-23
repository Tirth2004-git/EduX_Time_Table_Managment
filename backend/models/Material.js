const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['pdf', 'ppt', 'doc', 'video', 'link', 'other'], 
    required: true 
  },
  fileUrl: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', materialSchema);
