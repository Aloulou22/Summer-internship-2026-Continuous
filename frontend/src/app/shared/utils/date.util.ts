const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RelativeDeadline {
  text: string;
  overdue: boolean;
  dueSoon: boolean; // due within 2 days, not yet overdue — worth calling out
}

/** Whole-day difference between two dates, ignoring time-of-day. */
function dayDiff(date: Date, from: Date): number {
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const b = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a - b) / DAY_MS);
}

export function formatRelativeDeadline(iso: string, now: Date = new Date()): RelativeDeadline {
  const date = new Date(iso);
  const days = dayDiff(date, now);
  return {
    text: RELATIVE_FORMATTER.format(days, 'day'),
    overdue: days < 0,
    dueSoon: days >= 0 && days <= 2,
  };
}

/** True if updatedAt is within a few seconds of createdAt — i.e. never edited since creation. */
export function wasJustCreated(createdAt: string, updatedAt: string): boolean {
  return Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) < 5000;
}

/**
 * Date -> "YYYY-MM-DDT00:00:00.000Z", built from the picked calendar day's
 * own Y/M/D rather than via `.toISOString()` on the Date directly — that
 * would convert through the browser's local timezone first and can shift
 * the date by a day.
 */
export function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000Z`;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) return RELATIVE_FORMATTER.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return RELATIVE_FORMATTER.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return RELATIVE_FORMATTER.format(diffDays, 'day');
}
