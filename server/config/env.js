const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const serverEnv = path.resolve(__dirname, '..', '.env');
const rootEnv = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(serverEnv)) dotenv.config({ path: serverEnv });
else if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length && process.env.NODE_ENV !== 'test')
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
const integer = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const apiKey =
  process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPEN_ROUTER_API_KEY || '';
const provider = (
  process.env.AI_PROVIDER ||
  (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPEN_ROUTER_API_KEY ? 'openai' : 'mock')
).toLowerCase();
const config = Object.freeze({
  port: integer(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/impactlens',
  jwtSecret: process.env.JWT_SECRET || 'test-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: Object.freeze({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    mode: process.env.CLOUDINARY_MODE === 'mock' ? 'mock' : 'auto',
  }),
  aiProvider: ['gemini', 'groq', 'openai', 'mock'].includes(provider) && apiKey ? provider : 'mock',
  aiApiKey: apiKey,
  aiModel: process.env.AI_MODEL || process.env.GEMINI_MODEL || process.env.API_MODEL_1_NAME || '',
  legacy: Object.freeze({
    mongodbUsername: process.env.MONGODB_USERNAME || '',
    mongodbPassword: process.env.MONGODB_PASSWORD || '',
    openRouterApiKey: process.env.OPEN_ROUTER_API_KEY || '',
    model2: process.env.API_MODEL_2_NAME || '',
    model3: process.env.API_MODEL_3_NAME || '',
    viteApiBaseUrl: process.env.VITE_API_BASE_URL || '',
  }),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  publicReportBaseUrl: process.env.PUBLIC_REPORT_BASE_URL || 'http://localhost:3000/reports',
  maxUploadMb: integer(process.env.MAX_UPLOAD_MB, 50),
  rateLimitWindowMs: integer(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  rateLimitMax: integer(process.env.RATE_LIMIT_MAX, 200),
});
module.exports = { config };
