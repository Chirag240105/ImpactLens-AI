import { describe, expect, it } from 'vitest';
import { cn, formatBytes, formatPercent, initials, pluralize, titleCase, toDateInput } from './utils';
import { projectSchema, registerSchema } from './schemas';
import { toFormValues, toProjectInput } from './projectForm';

describe('cn', () => {
  it('keeps custom font sizes alongside colour classes (regression: tailwind-merge dropped text-label)', () => {
    expect(cn('text-label text-accent')).toBe('text-label text-accent');
    expect(cn('text-meta', 'text-ink-3')).toBe('text-meta text-ink-3');
  });
  it('still resolves real conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-label', 'text-meta')).toBe('text-meta');
  });
});

describe('formatters', () => {
  it('formats numbers, bytes and percentages', () => {
    expect(pluralize(1, 'asset')).toBe('1 asset');
    expect(pluralize(45, 'asset')).toBe('45 assets');
    expect(formatPercent(0.784)).toBe('78%');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(initials('Demo Manager')).toBe('DM');
    expect(titleCase('FIELD_EVIDENCE')).toBe('Field Evidence');
  });
  it('handles missing or invalid dates', () => {
    expect(toDateInput(undefined)).toBe('');
    expect(toDateInput('not a date')).toBe('');
    expect(toDateInput('2026-03-12T10:00:00Z')).toBe('2026-03-12');
  });
});

describe('registerSchema (mirrors the server password rule)', () => {
  const base = { name: 'Asha', email: 'asha@ngo.org', password: 'Strong123', confirm: 'Strong123' };
  it('accepts a valid account', () => expect(registerSchema.safeParse(base).success).toBe(true));
  it.each([
    ['short', 'Ab1'],
    ['no digit', 'StrongPass'],
    ['no uppercase', 'strong123'],
    ['no lowercase', 'STRONG123'],
  ])('rejects a password with %s', (_label, password) => {
    expect(registerSchema.safeParse({ ...base, password, confirm: password }).success).toBe(false);
  });
  it('requires matching confirmation', () => {
    const r = registerSchema.safeParse({ ...base, confirm: 'Different1' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['confirm']);
  });
});

describe('project form mapping', () => {
  it('requires both coordinates or neither', () => {
    const v = { ...toFormValues(), name: 'Canopy', organization: 'NGO', lat: '28.6', lng: '' };
    expect(projectSchema.safeParse(v).success).toBe(false);
  });
  it('round-trips into the API shape', () => {
    const v = { ...toFormValues(), name: ' Canopy ', organization: 'NGO', locationName: 'Delhi', lat: '28.6', lng: '77.2', goals: 'One\n\n Two ' };
    expect(projectSchema.safeParse(v).success).toBe(true);
    expect(toProjectInput(v)).toMatchObject({
      name: 'Canopy',
      location: { name: 'Delhi', lat: 28.6, lng: 77.2 },
      goals: ['One', 'Two'],
    });
  });
});
