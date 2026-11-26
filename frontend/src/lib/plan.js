import { addDays, daysBetween, parseISODate, toISODate } from './format.js';
import { debtRemaining, goalPlan } from './finance.js';

export const DEFAULT_PROFILE = {
  cash: null,
  cashDate: '',
  cashSetAt: 0,
  nextIncome: '',
  includeGoals: true,
  bills: [],
  noSpend: [],
  reminder: { enabled: false, time: '21:00', last: '' },
};

export function normProfile(p) {
  const src = p && typeof p === 'object' ? p : {};
  return {
    ...DEFAULT_PROFILE,
    ...src,
    bills: Array.isArray(src.bills) ? src.bills : [],
    noSpend: Array.isArray(src.noSpend) ? src.noSpend : [],
    reminder: { ...DEFAULT_PROFILE.reminder, ...(src.reminder || {}) },
  };
}

export function profileHasData(p) {
  return p.cash !== null || Boolean(p.nextIncome) || p.bills.length > 0 || p.noSpend.length > 0;
}

export function addMonthsClamp(iso, k) {
  const d = parseISODate(iso);
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + k, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return toISODate(t);
}

// Payments of a bill that are still unpaid and fall in [from, to].
export function billDue(bill, from, to) {
  const out = [];
  const paid = bill.paidThrough || '';
  if (bill.repeat === 'weekly') {
    for (let k = 0; k < 1500; k++) {
      const d = addDays(bill.dueDate, 7 * k);
      if (d > to) break;
      if (d >= from && d > paid) out.push({ date: d, amount: bill.amount, overdue: false });
    }
  } else if (bill.repeat === 'monthly') {
    for (let k = 0; k < 120; k++) {
      const d = addMonthsClamp(bill.dueDate, k);
      if (d > to) break;
      if (d >= from && d > paid) out.push({ date: d, amount: bill.amount, overdue: false });
    }
  } else if (!paid && bill.dueDate <= to) {
    out.push({ date: bill.dueDate < from ? from : bill.dueDate, amount: bill.amount, overdue: bill.dueDate < from });
  }
  return out;
}

export function nextBillDate(bill, today) {
  const paid = bill.paidThrough || '';
  if (bill.repeat === 'weekly') {
    for (let k = 0; k < 1500; k++) {
      const d = addDays(bill.dueDate, 7 * k);
      if (d >= today && d > paid) return d;
    }
    return '';
  }
  if (bill.repeat === 'monthly') {
    for (let k = 0; k < 240; k++) {
      const d = addMonthsClamp(bill.dueDate, k);
      if (d >= today && d > paid) return d;
    }
    return '';
  }
  return paid ? '' : bill.dueDate;
}

// Recurring burden per month: monthly bills as they are, weekly bills × 52 ÷ 12. One-time bills are not recurring.
export function monthlyLoad(bills) {
  return bills.reduce((s, b) => s + (b.repeat === 'monthly' ? b.amount : b.repeat === 'weekly' ? (b.amount * 52) / 12 : 0), 0);
}

export function upcomingBills(bills, today, days) {
  const to = addDays(today, days);
  return bills
    .flatMap((b) => billDue(b, today, to).map((o) => ({ ...o, name: b.name, billId: b.id, repeat: b.repeat })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Money the user said they have, adjusted only by things recorded AFTER that statement,
// so past-dated entries added later never get subtracted twice.
export function cashNow(profile, transactions, debts, goals) {
  const since = profile.cashSetAt || 0;
  const sinceDate = profile.cashDate || '';
  let cash = Number(profile.cash) || 0;
  let spentToday = 0;
  const todayStr = toISODate(new Date());
  for (const t of transactions) {
    if (t.date < sinceDate || (t.createdAt || 0) <= since) continue;
    if (t.type === 'income') cash += t.amount;
    else {
      cash -= t.amount;
      if (t.date === todayStr) spentToday += t.amount;
    }
  }
  for (const d of debts) {
    if ((d.createdAt || 0) > since && d.date >= sinceDate) cash += d.direction === 'borrowed' ? d.amount : -d.amount;
    for (const p of d.payments || []) {
      if ((p.at || 0) > since) cash += d.direction === 'lent' ? p.amount : -p.amount;
    }
  }
  for (const g of goals) for (const a of g.adds || []) if ((a.at || 0) > since) cash -= a.amount;
  return { cash, spentToday };
}

// status: need_cash | need_income | income_passed | deficit | ok
export function dailyPlan({ profile, transactions, debts, goals, today }) {
  if (profile.cash === null || profile.cash === '' || profile.cash === undefined) return { status: 'need_cash' };
  if (!profile.nextIncome) return { status: 'need_income' };
  const days = daysBetween(today, profile.nextIncome);
  if (days < 1) return { status: 'income_passed' };

  const lastDay = addDays(profile.nextIncome, -1);
  const { cash, spentToday } = cashNow(profile, transactions, debts, goals);

  const bills = [];
  for (const b of profile.bills) for (const o of billDue(b, today, lastDay)) bills.push({ name: b.name, ...o, billId: b.id });
  const billsSum = bills.reduce((s, b) => s + b.amount, 0);

  const debtItems = debts
    .filter((d) => d.direction === 'borrowed' && debtRemaining(d) > 0 && d.dueDate && d.dueDate <= lastDay)
    .map((d) => ({ person: d.person, amount: debtRemaining(d), dueDate: d.dueDate }));
  const debtSum = debtItems.reduce((s, d) => s + d.amount, 0);

  const goalItems = [];
  if (profile.includeGoals) {
    for (const g of goals) {
      const p = goalPlan(g, today);
      if (p.daysLeft > 0 && p.remaining > 0) goalItems.push({ name: g.name, amount: Math.min(p.perDay * days, p.remaining) });
    }
  }
  const goalSum = goalItems.reduce((s, g) => s + g.amount, 0);

  const remaining = cash - billsSum - debtSum - goalSum;
  const base = { days, lastDay, cash, bills, billsSum, debtItems, debtSum, goalItems, goalSum, remaining, spentToday };
  if (remaining < 0) return { status: 'deficit', shortfall: -remaining, ...base };

  const todayBudget = (remaining + spentToday) / days;
  return { status: 'ok', todayBudget, leftToday: todayBudget - spentToday, perDay: remaining / days, ...base };
}

// ---------- missing days ----------

export function daysWithEntries(transactions) {
  const set = new Set();
  for (const t of transactions) if (t.type === 'expense') set.add(t.date);
  return set;
}

export function firstEntryDate(transactions) {
  let min = '';
  for (const t of transactions) if (!min || t.date < min) min = t.date;
  return min;
}

// Past days (since the first record, up to yesterday) with no expense and no "no spending" mark.
export function missingDays(transactions, noSpend, today, lookback = 7) {
  const first = firstEntryDate(transactions);
  if (!first) return [];
  const has = daysWithEntries(transactions);
  const skip = new Set(noSpend);
  const out = [];
  for (let i = 1; i <= lookback; i++) {
    const d = addDays(today, -i);
    if (d < first) break;
    if (!has.has(d) && !skip.has(d)) out.push(d);
  }
  return out;
}
