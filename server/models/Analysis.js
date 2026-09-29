const mongoose = require('mongoose');
const { ANALYSIS_TYPES } = require('../config/constants');
module.exports = mongoose.model(
  'Analysis',
  new mongoose.Schema(
    {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
      },
      mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' }],
      analysisType: { type: String, enum: ANALYSIS_TYPES, required: true },
      result: mongoose.Schema.Types.Mixed,
      confidence: Number,
      model: String,
      provider: String,
      version: String,
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  ),
);
