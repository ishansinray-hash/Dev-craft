import { normalize } from "./normalize.js";

const WEEKDAYS: Record<string, number> = {
  somvar: 1, monday: 1, mon: 1, mangalvar: 2, tuesday: 2, tue: 2,
  budhwar: 3, budhvar: 3, wednesday: 3, wed: 3, guruvar: 4, thursday: 4, thu: 4,
  shukravar: 5, friday: 5, fri: 5, shanivar: 6, saturday: 6, sat: 6,
  ravivar: 0, sunday: 0, sun: 0,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8,
  sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

export interface DateResult { date: string | null; unresolvable: boolean; }

function formatDate(date: Date): string { return date.toISOString().slice(0, 10); }

/** Treat received_at as Asia/Kolkata time regardless of the machine's local timezone. */
function kolkataDate(receivedAt: string): Date {
  const received = new Date(receivedAt);
  return new Date(received.getTime() + 330 * 60 * 1000);
}

function plusDays(base: Date, days: number): string {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + days);
  return formatDate(result);
}

function nextWeekday(base: Date, weekday: number): string {
  const distance = ((weekday - base.getUTCDay()) + 7) % 7 || 7;
  return plusDays(base, distance);
}

/** Resolve the concrete date phrases used in customer messages. */
export function resolveDate(message: string, receivedAt: string): DateResult {
  const text = normalize(message);
  const base = kolkataDate(receivedAt);

  if (/\baaj\b/.test(text)) return { date: formatDate(base), unresolvable: false };
  if (/\bkal\b/.test(text)) return { date: plusDays(base, 1), unresolvable: false };
  if (/\bparso\b/.test(text)) return { date: plusDays(base, 2), unresolvable: false };
  if (/\b(?:narsu|tarso)\b/.test(text)) return { date: plusDays(base, 3), unresolvable: false };

  const days = text.match(/\b(\d+)\s+din\s+(?:me|mein|ke andar)\b/);
  if (days) return { date: plusDays(base, Number(days[1])), unresolvable: false };

  const absolute = text.match(/\b(\d{1,2})\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b/);
  if (absolute) {
    const candidate = new Date(Date.UTC(base.getUTCFullYear(), MONTHS[absolute[2]], Number(absolute[1])));
    if (candidate < new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()))) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
    return { date: formatDate(candidate), unresolvable: false };
  }

  const dayOfMonth = text.match(/\b(\d{1,2})\s*(?:tarikh|tareekh)\b/);
  if (dayOfMonth) {
    const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Number(dayOfMonth[1])));
    if (candidate.getUTCDate() !== Number(dayOfMonth[1])) return { date: null, unresolvable: true };
    if (candidate < new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()))) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    return { date: formatDate(candidate), unresolvable: false };
  }

  const weekdayPattern = /\b(?:(agle|next)\s+)?(somvar|monday|mon|mangalvar|tuesday|tue|budhwar|budhvar|wednesday|wed|guruvar|thursday|thu|shukravar|friday|fri|shanivar|saturday|sat|ravivar|sunday|sun)\b/g;
  const weekdayMatches: Array<{ name: string; index: number }> = [];
  let weekday: RegExpExecArray | null;
  while ((weekday = weekdayPattern.exec(text))) {
    if (!/^\s+ko\s+nahi\b/.test(text.slice(weekday.index + weekday[0].length))) weekdayMatches.push({ name: weekday[2], index: weekday.index });
  }
  if (weekdayMatches.length) {
    const selected = weekdayMatches[weekdayMatches.length - 1];
    return { date: nextWeekday(base, WEEKDAYS[selected.name]), unresolvable: false };
  }

  if (/\b(?:is weekend|is saturday)\b/.test(text)) return { date: nextWeekday(base, 6), unresolvable: false };
  if (/\b(?:agle hafte|next week)\b/.test(text) && !/\b(?:kabhi bhi)\b/.test(text)) return { date: plusDays(base, 7), unresolvable: false };

  const unresolvable = /\b(?:jaldi|asap|urgent|jitna jaldi|jab ho jaye|jab time mile|festival se pehle|next week kabhi bhi|agle mahine|mahine ke end tak|diwali se pehle|shaadi se pehle|exam ke baad|season shuru hone se pehle)\b/.test(text);
  return { date: null, unresolvable };
}
