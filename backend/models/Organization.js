const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

organizationSchema.index({ name: 1 });
organizationSchema.index({ isActive: 1 });

module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
