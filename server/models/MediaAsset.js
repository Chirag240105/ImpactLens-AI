const mongoose = require('mongoose');
const { EVIDENCE_TYPES, PROCESSING_STATUS, LOCATION_SOURCES } = require('../config/constants');
const score = { name: String, confidence: { type: Number, min: 0, max: 1, default: 0.5 } };
const schema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cloudinaryPublicId: { type: String, unique: true, sparse: true },
    secureUrl: { type: String, required: true },
    // Where the original lives: cloudinary, local disk fallback, or an external open-licence source.
    storage: { type: String, enum: ['cloudinary', 'local', 'external'], default: 'cloudinary' },
    phash: String,
    // Duplicate detection (exact bytes + perceptual) and camera metadata for integrity checks.
    fingerprint: { sha256: String, dhash: String },
    camera: { hasExif: Boolean, make: String, model: String, software: String },
    attribution: {
      source: String,
      title: String,
      url: String,
      author: String,
      license: String,
      licenseUrl: String,
    },
    resourceType: { type: String, enum: ['image', 'video'], default: 'image' },
    format: String,
    bytes: Number,
    width: Number,
    height: Number,
    duration: Number,
    originalFilename: String,
    captureDate: Date,
    uploadDate: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number,
      name: String,
      source: { type: String, enum: LOCATION_SOURCES, default: 'UNKNOWN' },
    },
    evidenceType: { type: String, enum: EVIDENCE_TYPES, default: 'FIELD_EVIDENCE' },
    tags: [String],
    objects: [score],
    activities: [score],
    environmentalSignals: [score],
    aiDescription: String,
    aiSummary: String,
    aiConfidence: Number,
    observedInferred: { observed: [String], inferred: [String] },
    processingStatus: { type: String, enum: PROCESSING_STATUS, default: 'PENDING' },
    processingError: String,
    attempts: { type: Number, default: 0 },
    originalAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', default: null },
    transformations: [
      {
        type: String,
        publicId: String,
        url: String,
        params: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    analysis: { model: String, provider: String, version: String, analyzedAt: Date },
    embedding: { type: [Number], select: false },
    embeddingModel: String,
  },
  { timestamps: true },
);
schema.index({ projectId: 1, captureDate: 1 });
schema.index({ 'fingerprint.sha256': 1 });
schema.index({ projectId: 1, processingStatus: 1 });
schema.index({ projectId: 1, 'activities.name': 1 });
schema.index({ tags: 'text', aiDescription: 'text', aiSummary: 'text', originalFilename: 'text' });
module.exports = mongoose.model('MediaAsset', schema);
