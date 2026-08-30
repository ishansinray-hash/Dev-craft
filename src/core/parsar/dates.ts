// Resolve relative date references like "aaj", "kal", "parso", etc.
// All dates resolve against received_at in Asia/Kolkata timezone

const WEEKDAYS_HI: Record<string, number> = {
  "somvar": 1, "monday": 1, "mon": 1,
  "mangalvar": 2, "tuesday": 2, "tue": 2,
  "budhwar": 3, "wednesday": 3, "wed": 3,
  "guruvar": 4, "thursday": 4, "thu": 4,
  "shukravar": 5, "friday": 5, "fri": 5,
  "shanivar": 6, "saturday": 6, "sat": 6,
  "ravivar": 0, "sunday": 0, "sun": 0,
};

const MONTHS_HI: Record<string, number> = {
  "january": 1, "jan": 1, "जनवरी": 1,
  "february": 2, "feb": 2, "फरवरी": 2,
  "march": 3, "mar": 3, "मार्च": 3,
  "april": 4, "apr": 4, "अप्रैल": 4,
  "may": 5, "मई": 5,
  "june": 6, "jun": 6, "जून": 6,
  "july": 7, "jul": 7, "जुलाई": 7,
  "august": 8, "aug": 8, "अगस्त": 8,
  "september": 9, "sep": 9, "सितंबर": 9,
  "october": 10, "oct": 10, "अक्टूबर": 10,
  "november": 11, "nov": 11, "नवंबर": 11,
  "december": 12, "dec": 12, "दिसंबर": 12,
};

// Convert ISO date string to Date object in Asia/Kolkata timezone
function parseReceivedAt(receivedAt: string): Date {
  return new Date(receivedAt);
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get date at a specific time in Asia/Kolkata timezone (UTC+5:30)
function getDateInKolkata(date: Date): Date {
  // IST is UTC+5:30 (+330 minutes). Shift by +330 minutes so getUTC*() methods return Asia/Kolkata date.
  const IST_OFFSET_MS = 330 * 60 * 1000;
  return new Date(date.getTime() + IST_OFFSET_MS);
}

export interface DateResult {
  date: string | null;
  unresolvable: boolean;
}

export function resolveDate(message: string, receivedAt: string): DateResult {
  const text = message.toLowerCase();
  const received = parseReceivedAt(receivedAt);
  
  // Create base date in Kolkata timezone
  const baseDate = getDateInKolkata(received);
  const baseDay = baseDate.getUTCDate();
  const baseMonth = baseDate.getUTCMonth();
  const baseYear = baseDate.getUTCFullYear();
  const baseDayOfWeek = baseDate.getUTCDay();
  
  // Relative day offsets
  if (/\baaj\b/.test(text)) {
    return { date: formatDate(baseDate), unresolvable: false };
  }
  if (/\bkal\b/.test(text)) {
    const nextDay = new Date(baseDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return { date: formatDate(nextDay), unresolvable: false };
  }
  if (/\bparso\b/.test(text)) {
    const in2Days = new Date(baseDate);
    in2Days.setUTCDate(in2Days.getUTCDate() + 2);
    return { date: formatDate(in2Days), unresolvable: false };
  }
  if (/\b(narsu|tarso)\b/.test(text)) {
    const in3Days = new Date(baseDate);
    in3Days.setUTCDate(in3Days.getUTCDate() + 3);
    return { date: formatDate(in3Days), unresolvable: false };
  }
  
  // Next weekday pattern: "agle mangalvar", "next monday"
  const nextWeekdayMatch = text.match(/(?:agle|next)\s+(\w+)/);
  if (nextWeekdayMatch) {
    const targetDay = WEEKDAYS_HI[nextWeekdayMatch[1].toLowerCase()];
    if (targetDay !== undefined) {
      const daysUntilTarget = ((targetDay - baseDayOfWeek) + 7) % 7 || 7; // Always get next week
      const targetDate = new Date(baseDate);
      targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilTarget);
      return { date: formatDate(targetDate), unresolvable: false };
    }
  }
  
  // "is weekend" -> upcoming Saturday
  if (/\b(is weekend|is saturday)\b/.test(text)) {
    const daysUntilSaturday = ((6 - baseDayOfWeek) + 7) % 7 || 7;
    const saturdayDate = new Date(baseDate);
    saturdayDate.setUTCDate(saturdayDate.getUTCDate() + daysUntilSaturday);
    return { date: formatDate(saturdayDate), unresolvable: false };
  }
  
  // Date of month: "<N> tarikh", "<N> tareekh", "<N> ko"
  const dateOfMonthMatch = text.match(/\b(\d{1,2})\s*(?:tarikh|tareekh|ko)\b/);
  if (dateOfMonthMatch) {
    const day = parseInt(dateOfMonthMatch[1], 10);
    if (day >= 1 && day <= 31) {
      let targetDate = new Date(baseDate);
      // If the day is >= today, it's this month; otherwise next month
      if (day >= baseDay) {
        targetDate.setUTCDate(day);
      } else {
        targetDate.setUTCMonth(baseMonth + 1);
        targetDate.setUTCDate(day);
      }
      return { date: formatDate(targetDate), unresolvable: false };
    }
  }
  
  // Unresolvable patterns from DATASET_CARD
  const unresolvablePatterns = [
    /\bjaldi\b/, /\basap\b/, /\burgent\b/, /\bjab ho jaye\b/,
    /\bfestival se pehle\b/, /\bnext week kabhi bhi\b/, /\bagle mahine\b/,
    /\bmahine ke end tak\b/, /\bdiwali se pehle\b/, /\bshaadi se pehle\b/,
    /\bexam ke baad\b/, /\bjab time mile\b/,
  ];
  
  // Check if message references a date but doesn't resolve it
  const hasDateReference = /\b(aaj|kal|parso|tarikh|tareekh|ko|jaldi|asap|urgent|weekend|din|dino|mahine|hafta|haftey|pehle|baad|se|tak)\b/.test(text);
  
  if (hasDateReference && unresolvablePatterns.some(p => p.test(text))) {
    return { date: null, unresolvable: true };
  }
  
  return { date: null, unresolvable: false };
}
