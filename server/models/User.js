const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'VIEWER' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
module.exports = mongoose.model('User', schema);
