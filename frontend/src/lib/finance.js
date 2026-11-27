import { addDays, daysBetween, endOfMonth, startOfWeek } from './format.js';
import { normalize } from './text.js';

// ---------- Periods and summaries ----------

export function periodRange(kind, refIso) {
  if (kind === 'week') {
    const from = startOfWeek(refIso);
    return { from, to: addDays(from, 6) };
  }
  const from = `${refIso.slice(0, 8)}01`;
  return { from, to: endOfMonth(from) };
}

export function inRange(list, from, to) {
  return list.filter((t) => t.date >= from && t.date <= to);
}

export function summarize(txs) {
  let income = 0;
  let expense = 0;
  let planned = 0;
  let unplanned = 0;
  const byCat = {};
  const byMethod = {};
  for (const t of txs) {
    if (t.type === 'income') {
      income += t.amount;
      continue;
    }
    expense += t.amount;
    if (t.planned === false) unplanned += t.amount;
    else planned += t.amount;
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    byMethod[t.method] = (byMethod[t.method] || 0) + t.amount;
  }
  const share = (sum) => (expense ? sum / expense : 0);
  const categories = Object.entries(byCat)
    .map(([id, sum]) => ({ id, sum, pct: share(sum) }))
    .sort((a, b) => b.sum - a.sum);
  const methods = Object.entries(byMethod)
    .map(([id, sum]) => ({ id, sum, pct: share(sum) }))
    .sort((a, b) => b.sum - a.sum);
  return { income, expense, balance: income - expense, planned, unplanned, categories, methods };
}

// ---------- Recurring expenses ("odat tuzog'i") ----------
// An expense with the same name, entered 3+ times on at least two different days within
// the window, counts as recurring. Monthly estimate = average amount × entries per day × 30.

export function detectRecurring(txs, today, windowDays = 90) {
  const since = addDays(today, -windowDays);
  const groups = new Map();
  for (const t of txs) {
    if (t.type !== 'expense' || t.date < since || t.date > today) continue;
    const key = normalize(t.title) || t.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const result = [];
  for (const [key, items] of groups) {
    if (items.length < 3) continue;
    const dates = items.map((t) => t.date).sort();
    const span = daysBetween(dates[0], dates[dates.length - 1]);
    if (span < 1) continue;
    const total = items.reduce((s, t) => s + t.amount, 0);
    const avg = total / items.length;
    const perDay = (items.length - 1) / span;
    const monthly = avg * perDay * 30;
    result.push({
      key,
      title: items[items.length - 1].title || key,
      category: items[0].category,
      count: items.length,
      avg,
      span,
      interval: span / (items.length - 1),
      monthly,
      yearly: monthly * 12,
    });
  }
  return result.sort((a, b) => b.monthly - a.monthly);
}

export function frequencyLabel(interval) {
  if (interval <= 1.5) return 'deyarli har kuni';
  if (interval <= 5) return `o'rtacha har ${Math.round(interval)} kunda`;
  if (interval <= 9) return "o'rtacha haftada bir";
  if (interval <= 22) return `o'rtacha har ${Math.round(interval)} kunda`;
  if (interval <= 40) return "o'rtacha oyda bir";
  return `o'rtacha har ${Math.round(interval)} kunda`;
}

// ---------- Debts ----------

export function debtPaid(d) {
  return (d.payments || []).reduce((s, p) => s + p.amount, 0);
}

export function debtRemaining(d) {
  return Math.max(d.amount - debtPaid(d), 0);
}

export function debtStatus(d, today, soonDays = 7) {
  if (debtRemaining(d) <= 0) return { kind: 'closed', days: null };
  if (!d.dueDate) return { kind: 'open', days: null };
  const days = daysBetween(today, d.dueDate);
  if (days < 0) return { kind: 'overdue', days };
  return { kind: days <= soonDays ? 'soon' : 'open', days };
}

// Equal weekly installments from today up to the due date; the last one falls on the due date.
// Returns null when there is nothing to plan (closed or no due date).
export function debtPlan(debt, today) {
  const remaining = debtRemaining(debt);
  if (remaining <= 0 || !debt.dueDate) return null;
  const days = daysBetween(today, debt.dueDate);
  if (days <= 0) return { overdue: true, remaining, days };
  const weeks = Math.min(Math.max(Math.ceil(days / 7), 1), 104);
  const base = Math.floor(remaining / weeks);
  const installments = [];
  for (let i = 1; i <= weeks; i++) {
    installments.push({
      date: i === weeks ? debt.dueDate : addDays(today, i * 7),
      amount: i === weeks ? remaining - base * (weeks - 1) : base,
    });
  }
  return { remaining, days, weeks, base, installments };
}

export function debtTotals(debts) {
  let owedToMe = 0;
  let iOwe = 0;
  for (const d of debts) {
    const r = debtRemaining(d);
    if (d.direction === 'lent') owedToMe += r;
    else iOwe += r;
  }
  return { owedToMe, iOwe };
}

export function dueReminders(debts, today, withinDays) {
  return debts
    .filter((d) => d.remind && d.dueDate && debtRemaining(d) > 0 && daysBetween(today, d.dueDate) <= withinDays)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// ---------- Savings goals ----------

export const AVG_MONTH_DAYS = 30.44;

export function goalPlan(goal, today) {
  const remaining = Math.max(goal.target - goal.saved, 0);
  const progress = goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0;
  if (remaining === 0) return { done: true, remaining, progress };
  if (!goal.deadline) return { noDeadline: true, remaining, progress };
  const daysLeft = daysBetween(today, goal.deadline);
  if (daysLeft <= 0) return { overdue: true, remaining, progress, daysLeft };
  const weeks = daysLeft / 7;
  const months = daysLeft / AVG_MONTH_DAYS;
  return {
    remaining,
    progress,
    daysLeft,
    weeks,
    months,
    perDay: remaining / daysLeft,
    perWeek: remaining / Math.max(weeks, 1),
    perMonth: remaining / Math.max(months, 1),
  };
}

export function planForDays(amount, days) {
  const weeks = days / 7;
  const months = days / AVG_MONTH_DAYS;
  return {
    days,
    weeks,
    months,
    perDay: amount / days,
    perWeek: amount / Math.max(weeks, 1),
    perMonth: amount / Math.max(months, 1),
  };
}

// "What if I spend this money instead of saving it?"
export function whatIf(goal, spend, today, weeklyCapacity = 0) {
  const plan = goalPlan(goal, today);
  const newRemaining = plan.remaining + spend;
  const out = {
    spend,
    remaining: plan.remaining,
    newRemaining,
    shareOfTarget: goal.target ? spend / goal.target : 0,
  };
  if (plan.daysLeft > 0) {
    out.perWeekBefore = plan.perWeek;
    out.perWeekAfter = newRemaining / Math.max(plan.weeks, 1);
  }
  const pace = weeklyCapacity > 0 ? weeklyCapacity : plan.perWeek || 0;
  if (pace > 0) {
    out.pace = pace;
    out.paceFromUser = weeklyCapacity > 0;
    out.delayDays = Math.ceil((spend / pace) * 7);
    out.finishBefore = addDays(today, Math.ceil((plan.remaining / pace) * 7));
    out.finishAfter = addDays(today, Math.ceil((newRemaining / pace) * 7));
  }
  return out;
}

// Shaxsiy inflyatsiya va narxlar xotirasi: bir xil nomli xaridlarning oldingi va oxirgi narxini solishtiradi
export function computePriceMemory(transactions) {
  const byTitle = new Map();
  const sorted = [...(transactions || [])]
    .filter((t) => t.type === 'expense' && t.category !== 'kunjami' && t.title && Number(t.amount) > 0)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));

  for (const t of sorted) {
    const key = t.title.trim().toLowerCase();
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push({ title: t.title.trim(), amount: Number(t.amount), date: t.date });
  }

  const items = [];
  for (const [key, list] of byTitle.entries()) {
    if (list.length < 2) continue;
    const first = list[0];
    const last = list[list.length - 1];
    if (!first.amount) continue;
    const diff = last.amount - first.amount;
    const pct = (diff / first.amount) * 100;
    items.push({
      key,
      title: last.title,
      count: list.length,
      firstPrice: first.amount,
      firstDate: first.date,
      lastPrice: last.amount,
      lastDate: last.date,
      diff,
      pct,
    });
  }

  items.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const avgInflation = items.length ? items.reduce((s, i) => s + i.pct, 0) / items.length : 0;
  return { items: items.slice(0, 8), avgInflation };
}
