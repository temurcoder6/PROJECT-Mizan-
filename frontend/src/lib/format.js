const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

export function money(n, currency = "so'm") {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toLocaleString('en-US').replace(/,/g, ' ')} ${currency}`;
}

export function percent(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISODate(new Date());

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(fromIso, toIso) {
  return Math.round((parseISODate(toIso) - parseISODate(fromIso)) / 86400000);
}

export function startOfWeek(iso) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISODate(d);
}

export function endOfMonth(iso) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function shiftMonth(iso, n) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function monthLabel(iso) {
  const d = parseISODate(iso);
  const name = MONTHS[d.getMonth()];
  return `${name[0].toUpperCase()}${name.slice(1)} ${d.getFullYear()}`;
}

export function dateLabel(iso) {
  const d = parseISODate(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const byDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);
