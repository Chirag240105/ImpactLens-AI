import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom type scale so `text-label`/`text-meta` aren't mistaken for colours.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['label', 'meta'] }] } },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const numberFmt = new Intl.NumberFormat('en-US');
const relFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const valid = (d?: string | number | Date | null) => {
  if (d === undefined || d === null || d === '') return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
};

export const formatDate = (d?: string | Date | null, fallback = '—') => {
  const x = valid(d);
  return x ? dateFmt.format(x) : fallback;
};
export const formatDateTime = (d?: string | Date | null, fallback = '—') => {
  const x = valid(d);
  return x ? dateTimeFmt.format(x) : fallback;
};
export const formatNumber = (n?: number | null) => (n === undefined || n === null ? '—' : numberFmt.format(n));
export const formatPercent = (ratio?: number | null) =>
  ratio === undefined || ratio === null ? '—' : `${Math.round(ratio * 100)}%`;

export function formatRelative(d?: string | Date | null) {
  const x = valid(d);
  if (!x) return '—';
  const diff = (x.getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) if (Math.abs(diff) >= secs) return relFmt.format(Math.round(diff / secs), unit);
  return 'just now';
}

export function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

/** yyyy-mm-dd for <input type="date">. */
export const toDateInput = (d?: string | Date | null) => {
  const x = valid(d);
  return x ? x.toISOString().slice(0, 10) : '';
};

export const initials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const titleCase = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const pluralize = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export const publicReportUrl = (slug: string) => `${window.location.origin}/reports/${slug}`;
