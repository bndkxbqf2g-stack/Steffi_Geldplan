const DAY = 86400000;

export function dateOnly(value) {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(value, days) {
  const d = dateOnly(value);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(value) {
  const d = dateOnly(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function bavariaPublicHolidays(year) {
  const easter = easterSunday(year);
  return new Set([
    dateKey(new Date(year, 0, 1)),   // Neujahr
    dateKey(new Date(year, 0, 6)),   // Heilige Drei Könige
    dateKey(addDays(easter, -2)),     // Karfreitag
    dateKey(addDays(easter, 1)),      // Ostermontag
    dateKey(new Date(year, 4, 1)),    // Tag der Arbeit
    dateKey(addDays(easter, 39)),     // Christi Himmelfahrt
    dateKey(addDays(easter, 50)),     // Pfingstmontag
    dateKey(addDays(easter, 60)),     // Fronleichnam
    dateKey(new Date(year, 9, 3)),    // Tag der Deutschen Einheit
    dateKey(new Date(year, 10, 1)),   // Allerheiligen
    dateKey(new Date(year, 11, 25)),  // 1. Weihnachtstag
    dateKey(new Date(year, 11, 26))   // 2. Weihnachtstag
  ]);
}

function publicHolidays(year) {
  return bavariaPublicHolidays(year);
}

export function isWorkday(value) {
  const d = dateOnly(value);
  const weekday = d.getDay();
  if (weekday === 0 || weekday === 6) return false;
  return !publicHolidays(d.getFullYear()).has(dateKey(d));
}

export function lastWorkday(year, monthIndex) {
  const d = new Date(year, monthIndex + 1, 0);
  while (!isWorkday(d)) d.setDate(d.getDate() - 1);
  return dateOnly(d);
}


export function plannedPaydayForDate(value = new Date()) {
  const today = dateOnly(value);
  const thisMonthPayday = lastWorkday(today.getFullYear(), today.getMonth());
  if (today <= thisMonthPayday) return thisMonthPayday;
  let year = today.getFullYear();
  let month = today.getMonth() + 1;
  if (month > 11) { month = 0; year += 1; }
  return lastWorkday(year, month);
}

export function nextPaydayFrom(payday) {
  const d = dateOnly(payday);
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  return lastWorkday(year, month);
}

export function daysUntilPayday(from, nextPayday) {
  const start = dateOnly(from);
  const end = dateOnly(nextPayday);
  return Math.max(0, Math.round((end - start) / DAY));
}

export function segmentEnd(segmentStart, nextPayday) {
  const start = dateOnly(segmentStart);
  const payday = dateOnly(nextPayday);
  const dayBeforePayday = addDays(payday, -1);
  const daysToSaturday = (6 - start.getDay() + 7) % 7;
  const saturday = addDays(start, daysToSaturday);
  return saturday < dayBeforePayday ? saturday : dayBeforePayday;
}

export function segmentDays(segmentStart, nextPayday) {
  const start = dateOnly(segmentStart);
  const end = segmentEnd(start, nextPayday);
  if (end < start) return 0;
  return Math.round((end - start) / DAY) + 1;
}

export function nextSegmentStart(segmentStart, nextPayday) {
  const end = segmentEnd(segmentStart, nextPayday);
  const next = addDays(end, 1);
  return next < dateOnly(nextPayday) ? next : null;
}

export function cycleSegments(payday, nextPayday = nextPaydayFrom(payday)) {
  const segments = [];
  let start = dateOnly(payday);
  const endPayday = dateOnly(nextPayday);
  while (start < endPayday) {
    const end = segmentEnd(start, endPayday);
    segments.push({ start, end, days: segmentDays(start, endPayday) });
    const next = addDays(end, 1);
    if (next >= endPayday) break;
    start = next;
  }
  return segments;
}

export function calculateBudget({ giro, segmentStart, nextPayday }) {
  const remainingDays = daysUntilPayday(segmentStart, nextPayday);
  const days = segmentDays(segmentStart, nextPayday);
  const dailyBudget = remainingDays > 0 ? giro / remainingDays : 0;
  return {
    remainingDays,
    segmentDays: days,
    dailyBudget,
    weeklyBudget: dailyBudget * days
  };
}

export function maxAdditionalWithdrawal(weeklyBudget, existingCash) {
  return Math.max(0, Number(weeklyBudget || 0) - Math.max(0, Number(existingCash || 0)));
}
export function cycleForDate(value) {
  const today = dateOnly(value);
  const thisMonthPayday = lastWorkday(today.getFullYear(), today.getMonth());

  let payday;
  if (today >= thisMonthPayday) {
    payday = thisMonthPayday;
  } else {
    let year = today.getFullYear();
    let month = today.getMonth() - 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    payday = lastWorkday(year, month);
  }

  return { payday, nextPayday: nextPaydayFrom(payday) };
}

export function activeSegmentForDate(value, payday, nextPayday) {
  const today = dateOnly(value);
  const segments = cycleSegments(payday, nextPayday);
  return segments.find(({ start, end }) => today >= start && today <= end) || null;
}

export function budgetForDate({ giro, today, payday, nextPayday } = {}) {
  const date = dateOnly(today || new Date());
  const cycle = payday && nextPayday
    ? { payday: dateOnly(payday), nextPayday: dateOnly(nextPayday) }
    : cycleForDate(date);
  const segment = activeSegmentForDate(date, cycle.payday, cycle.nextPayday);

  if (!segment) {
    return {
      payday: cycle.payday,
      nextPayday: cycle.nextPayday,
      segmentStart: null,
      segmentEnd: null,
      remainingDays: 0,
      segmentDays: 0,
      dailyBudget: 0,
      weeklyBudget: 0
    };
  }

  return {
    payday: cycle.payday,
    nextPayday: cycle.nextPayday,
    segmentStart: segment.start,
    segmentEnd: segment.end,
    ...calculateBudget({
      giro,
      segmentStart: segment.start,
      nextPayday: cycle.nextPayday
    })
  };
}


export function nextWithdrawalOrPayday(from, nextPayday) {
  const today = dateOnly(from);
  const payday = dateOnly(nextPayday);
  const daysToSunday = (7 - today.getDay()) % 7;
  const sunday = addDays(today, daysToSunday);
  return payday < sunday ? payday : sunday;
}

export function isWithdrawalDay(value, payday, nextPayday) {
  const date = dateOnly(value);
  const cycle = payday && nextPayday
    ? { payday: dateOnly(payday), nextPayday: dateOnly(nextPayday) }
    : cycleForDate(date);
  const segment = activeSegmentForDate(date, cycle.payday, cycle.nextPayday);
  return Boolean(segment && date.getDay() === 0 && dateKey(segment.start) === dateKey(date));
}
