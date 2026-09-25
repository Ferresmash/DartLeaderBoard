// Swedish Time (Europe/Stockholm) Date Utilities

export const SWEDISH_TZ = 'Europe/Stockholm';

// Single reused formatter instance to avoid expensive ICU context creation in loops
const swedishFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SWEDISH_TZ,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false
});

const DAY_MAP = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };

// Timestamp lookup cache to completely eliminate repetitive formatting
const partsCache = new Map();

/**
 * Extracts Swedish date parts (year, month 1-12, day 1-31, weekday 1=Mon..7=Sun, hour 0-23, minute, second)
 * @param {number|Date} timestamp 
 */
export function getSwedishParts(timestamp = Date.now()) {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  const cached = partsCache.get(ts);
  if (cached) return cached;

  const parts = swedishFormatter.formatToParts(ts);
  const obj = {};
  for (let i = 0; i < parts.length; i++) {
    obj[parts[i].type] = parts[i].value;
  }

  const weekdayNum = DAY_MAP[obj.weekday] || 1;

  const result = {
    year: parseInt(obj.year, 10),
    month: parseInt(obj.month, 10), // 1 - 12
    day: parseInt(obj.day, 10),     // 1 - 31
    weekday: weekdayNum,           // 1 (Mon) - 7 (Sun)
    weekdayShort: obj.weekday,
    hour: parseInt(obj.hour === '24' ? '0' : obj.hour, 10),
    minute: parseInt(obj.minute, 10),
    second: parseInt(obj.second, 10)
  };

  if (partsCache.size > 10000) {
    partsCache.clear();
  }
  partsCache.set(ts, result);
  return result;
}

/**
 * Converts a date specified in Swedish local time to an exact Unix timestamp in milliseconds.
 */
export function getStockholmTimestamp(year, month, day, hour = 0, minute = 0, second = 0) {
  const testMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = getSwedishParts(testMs);

  const targetMinutes = hour * 60 + minute;
  const actualMinutes = parts.hour * 60 + parts.minute;
  let diffMinutes = targetMinutes - actualMinutes;

  if (parts.day !== day) {
    if (parts.day < day || (day === 1 && parts.day > 1)) {
      diffMinutes += 24 * 60;
    } else {
      diffMinutes -= 24 * 60;
    }
  }

  return testMs + diffMinutes * 60 * 1000;
}

/**
 * Returns ISO week number for a given date in Swedish timezone
 */
export function getWeekNumber(date) {
  const ts = typeof date === 'number' ? date : date.getTime();
  const p = getSwedishParts(ts);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

let cachedWeekBounds = null;
let lastWeekBoundsCheck = 0;

/**
 * Returns the exact start (Monday 00:00:00) and end (next Monday 00:00:00) of "This Week" in Swedish time.
 */
export function getThisWeekBounds(nowMs = Date.now()) {
  if (cachedWeekBounds && Math.abs(nowMs - lastWeekBoundsCheck) < 60000) {
    return cachedWeekBounds;
  }

  const p = getSwedishParts(nowMs);
  const daysSinceMonday = p.weekday - 1; // 0 for Mon, 6 for Sun

  // Date of Monday
  const mondayDate = new Date(nowMs - daysSinceMonday * 86400000);
  const monParts = getSwedishParts(mondayDate.getTime());
  const start = getStockholmTimestamp(monParts.year, monParts.month, monParts.day, 0, 0, 0);
  
  // Next Monday start
  const nextMondayDate = new Date(start + 7 * 86400000 + 3600000); // add 7 days + buffer
  const nextMonParts = getSwedishParts(nextMondayDate.getTime());
  const end = getStockholmTimestamp(nextMonParts.year, nextMonParts.month, nextMonParts.day, 0, 0, 0);

  const bounds = { start, end };
  cachedWeekBounds = bounds;
  lastWeekBoundsCheck = nowMs;
  return bounds;
}

let cachedMonthBounds = null;
let lastMonthBoundsCheck = 0;

/**
 * Returns the exact start (1st 00:00:00) and end (1st of next month 00:00:00) of "This Month" in Swedish time.
 */
export function getThisMonthBounds(nowMs = Date.now()) {
  if (cachedMonthBounds && Math.abs(nowMs - lastMonthBoundsCheck) < 60000) {
    return cachedMonthBounds;
  }

  const p = getSwedishParts(nowMs);
  const start = getStockholmTimestamp(p.year, p.month, 1, 0, 0, 0);

  const nextMonth = p.month === 12 ? 1 : p.month + 1;
  const nextYear = p.month === 12 ? p.year + 1 : p.year;
  const end = getStockholmTimestamp(nextYear, nextMonth, 1, 0, 0, 0);

  const bounds = { start, end };
  cachedMonthBounds = bounds;
  lastMonthBoundsCheck = nowMs;
  return bounds;
}

/**
 * Checks if a match falls into the chosen time span ('this_week', 'this_month', 'all_time')
 */
export function isMatchInTimeSpan(match, timeSpan, cachedBounds = null, nowMs = Date.now()) {
  if (!match || !match.timestamp) return false;
  if (timeSpan === 'all_time') return true;

  if (timeSpan === 'this_week' || timeSpan === '7_days') {
    const bounds = cachedBounds || getThisWeekBounds(nowMs);
    return match.timestamp >= bounds.start && match.timestamp < bounds.end;
  }

  if (timeSpan === 'this_month' || timeSpan === '30_days') {
    const bounds = cachedBounds || getThisMonthBounds(nowMs);
    return match.timestamp >= bounds.start && match.timestamp < bounds.end;
  }

  return true;
}

/**
 * Checks if a match took place during Swedish office hours (Mon-Fri 07:00-18:00 Swedish time)
 * with at least 2 non-guest participants.
 */
export function isInOfficeMatch(match) {
  if (!match || !match.timestamp) return false;

  if (!match.participantIds || !Array.isArray(match.participantIds)) return false;

  let nonGuestCount = 0;
  for (let i = 0; i < match.participantIds.length; i++) {
    const id = match.participantIds[i];
    if (typeof id === 'string' && !id.startsWith('guest')) {
      nonGuestCount++;
      if (nonGuestCount > 1) break;
    }
  }
  if (nonGuestCount < 2) return false;

  const parts = getSwedishParts(match.timestamp);
  return parts.weekday >= 1 && parts.weekday <= 5 && parts.hour >= 7 && parts.hour < 18;
}

/**
 * Generates day slots for "This Week" (Monday through Sunday) in Swedish time
 */
export function getThisWeekDays(nowMs = Date.now()) {
  const { start } = getThisWeekBounds(nowMs);
  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const dayApprox = start + i * 86400000 + 3600000;
    const p = getSwedishParts(dayApprox);
    const dayStart = getStockholmTimestamp(p.year, p.month, p.day, 0, 0, 0);
    const dayEnd = dayStart + 86400000;

    days.push({
      start: dayStart,
      end: dayEnd,
      name: dayNames[i],
      fullDate: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
    });
  }

  return days;
}

/**
 * Generates day slots for "This Month" (1st to last day of month) in Swedish time
 */
export function getThisMonthDays(nowMs = Date.now()) {
  const p = getSwedishParts(nowMs);
  const daysInMonth = new Date(p.year, p.month, 0).getDate();
  const days = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = monthNames[p.month - 1];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = getStockholmTimestamp(p.year, p.month, d, 0, 0, 0);
    const dayEnd = dayStart + 86400000;

    days.push({
      start: dayStart,
      end: dayEnd,
      name: `${monthLabel} ${d}`,
      shortName: `${d}`,
      fullDate: `${p.year}-${String(p.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    });
  }

  return days;
}
