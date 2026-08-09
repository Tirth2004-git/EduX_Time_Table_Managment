const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateKey(date) {
  const d = startOfDay(date);
  return d.toISOString().slice(0, 10);
}

function getDayName(date) {
  return DAYS[startOfDay(date).getDay()];
}

function eachDateInRange(startDate, endDate) {
  const dates = [];
  const current = startOfDay(startDate);
  const end = startOfDay(endDate);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function isSameDay(a, b) {
  return formatDateKey(a) === formatDateKey(b);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return startOfDay(d);
}

function getWeekRange(fromDate = new Date()) {
  const start = startOfDay(fromDate);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = addDays(start, 6);
  return { start, end };
}

module.exports = {
  DAYS,
  startOfDay,
  endOfDay,
  formatDateKey,
  getDayName,
  eachDateInRange,
  isSameDay,
  addDays,
  getWeekRange,
};
