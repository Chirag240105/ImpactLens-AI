const mongoose = require('mongoose');
const { PROJECT_STATUS, DEFAULT_CATEGORIES } = require('../config/constants');
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    organization: { type: String, required: true },
    category: String,
    location: { name: String, lat: Number, lng: Number },
    startDate: Date,
    endDate: Date,
    goals: [String],
    status: { type: String, enum: PROJECT_STATUS, default: 'DRAFT' },
    expectedEvidenceCategories: { type: [String], default: DEFAULT_CATEGORIES },
    // Integrity check: media further than this from the project location is flagged; null = multi-site.
    siteRadiusKm: { type: Number, default: 50, min: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
schema.index({ createdBy: 1, status: 1 });
schema.index({ organization: 1 });
module.exports = mongoose.model('Project', schema);
