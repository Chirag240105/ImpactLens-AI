const mongoose = require('mongoose');
module.exports = mongoose.model(
  'Report',
  new mongoose.Schema(
    {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
      },
      title: String,
      content: mongoose.Schema.Types.Mixed,
      mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' }],
      insightIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Insight' }],
      generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      publicSlug: { type: String, unique: true, sparse: true },
      isPublic: { type: Boolean, default: false },
      pdfUrl: String,
    },
    { timestamps: true },
  ),
);
