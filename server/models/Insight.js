const mongoose = require('mongoose');
module.exports = mongoose.model(
  'Insight',
  new mongoose.Schema(
    {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
      },
      statement: { type: String, required: true },
      kind: { type: String, enum: ['OBSERVED', 'INFERRED', 'CLAIMED'], required: true },
      evidenceMediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' }],
      analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' },
      model: String,
      confidence: Number,
      generatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
  ),
);
