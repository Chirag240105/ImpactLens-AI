import { z } from 'zod';
import { EVIDENCE_TYPES, PROJECT_STATUSES } from './constants';

// Mirrors server/routes/auth.routes.js and the password rule in api.service.register.
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(128)
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match' });
export type RegisterValues = z.infer<typeof registerSchema>;

const optionalNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= max && Number(v) >= min), `${label} is out of range`);

// Mirrors server/routes/projects.routes.js (name 2–160, organization required).
export const projectSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
    organization: z.string().trim().min(1, 'Organization is required').max(160),
    description: z.string().trim().max(2000).optional().default(''),
    category: z.string().trim().max(120).optional().default(''),
    status: z.enum(PROJECT_STATUSES as [string, ...string[]]),
    locationName: z.string().trim().max(160).optional().default(''),
    lat: optionalNumber(-90, 90, 'Latitude'),
    lng: optionalNumber(-180, 180, 'Longitude'),
    startDate: z.string().optional().default(''),
    endDate: z.string().optional().default(''),
    goals: z.string().optional().default(''),
    expectedEvidenceCategories: z.array(z.string().trim().min(1)).min(1, 'Pick at least one evidence category'),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    path: ['endDate'],
    message: 'End date must be after the start date',
  })
  .refine((v) => (v.lat === '') === (v.lng === ''), { path: ['lng'], message: 'Enter both latitude and longitude' });
export type ProjectFormValues = z.input<typeof projectSchema>;

export const uploadSchema = z
  .object({
    evidenceType: z.enum(EVIDENCE_TYPES as [string, ...string[]]),
    captureDate: z.string().optional().default(''),
    locationName: z.string().trim().max(160).optional().default(''),
    lat: optionalNumber(-90, 90, 'Latitude'),
    lng: optionalNumber(-180, 180, 'Longitude'),
  })
  .refine((v) => (v.lat === '') === (v.lng === ''), { path: ['lng'], message: 'Enter both latitude and longitude' });
export type UploadFormValues = z.input<typeof uploadSchema>;
