const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function wallClock(now: Date) {
  const values = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/** The calendar day in Manila, as YYYY-MM-DD. Rate limits reset when it changes. */
export function manilaDay(now: Date): string {
  const { year, month, day } = wallClock(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The next midnight in Manila, as an ISO UTC string (used for `resetsAt`). */
export function nextManilaMidnight(now: Date): string {
  const w = wallClock(now);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  const offsetMs = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(w.year, w.month - 1, w.day + 1) - offsetMs).toISOString();
}
