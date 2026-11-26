import { addDays, daysBetween } from './format.js';
import { debtRemaining, detectRecurring, goalPlan, inRange, summarize } from './finance.js';
import { dailyPlan } from './plan.js';

// Weekly summary built only from what the user entered. With too little data it says so instead of concluding.
export function weeklySummary(transactions, debts, goals, today) {
  const from = addDays(today, -6);
  const week = inRange(transactions, from, today);
  const expenses = week.filter((t) => t.type === 'expense');
  const days = new Set(expenses.map((t) => t.date)).size;
  const enough = expenses.length >= 5 && days >= 3;
  const out = { from, to: today, enough, entries: expenses.length, days };
  if (!enough) return out;

  const s = summarize(week);
  out.expense = s.expense;
  out.top = s.categories[0] || null;

  const prevFrom = addDays(from, -7);
  const prev = inRange(transactions, prevFrom, addDays(from, -1)).filter((t) => t.type === 'expense');
  const prevDays = new Set(prev.map((t) => t.date)).size;
  if (prev.length >= 5 && prevDays >= 3 && out.top) {
    const prevSum = summarize(prev).categories.find((c) => c.id === out.top.id)?.sum || 0;
    if (prevSum > 0) out.topChange = (out.top.sum - prevSum) / prevSum;
  }

  const due = debts
    .filter((d) => debtRemaining(d) > 0 && d.dueDate)
    .map((d) => ({ debt: d, days: daysBetween(today, d.dueDate) }))
    .filter((x) => x.days <= 7)
    .sort((a, b) => a.days - b.days)[0];
  out.debtDue = due || null;

  out.goals = goals.map((g) => {
    const added = (g.adds || []).filter((a) => a.at >= new Date(from).getTime()).reduce((sum, a) => sum + a.amount, 0);
    return { id: g.id, name: g.name, added, progress: g.target ? Math.min(g.saved / g.target, 1) : 0 };
  });
  return out;
}

const DISCRETIONARY = ['dam', 'ijtimoiy', 'kiyim'];
const ESSENTIAL = ['kommunal', 'aloqa', 'salomatlik', 'talim', 'uy'];

// Advice built only from the user's own entries; every number comes from a formula shown to the user.
export function buildAdvice({ transactions, debts, goals, profile }, today) {
  const recent = transactions.filter((t) => t.type === 'expense' && t.date >= addDays(today, -13) && t.date <= today);
  const days = new Set(recent.map((t) => t.date)).size;
  const enough = recent.length >= 5 && days >= 3;
  const items = [];

  const plan = profile ? dailyPlan({ profile, transactions, debts, goals, today }) : null;
  if (plan && plan.status === 'ok' && plan.leftToday < 0 && plan.days > 1) {
    const top = summarize(inRange(transactions, today, today)).categories[0];
    items.push({ t: 'over', over: -plan.leftToday, today: plan.todayBudget, tomorrow: plan.remaining / (plan.days - 1), cat: top?.id || null });
  }

  if (enough) {
    const week = summarize(inRange(transactions, addDays(today, -6), today));
    const disc = week.categories.find((c) => DISCRETIONARY.includes(c.id));
    if (disc) {
      const monthly = (disc.sum / 7) * 30;
      items.push({ t: 'cat', cat: disc.id, week: disc.sum, share: Math.round(disc.pct * 100), monthly, half: monthly / 2 });
    }
    const habit = detectRecurring(transactions, today).find((h) => h.avg >= 8000 && !ESSENTIAL.includes(h.category));
    if (habit) items.push({ t: 'habit', title: habit.title, monthly: habit.monthly, half: habit.monthly / 2 });
  }

  if (!items.length) items.push({ t: enough ? 'none' : 'few', entries: recent.length, days });
  return items;
}

// Consecutive weeks (newest first) where the money added to a goal reached the current weekly plan.
// The current week is not counted against the user while it is still in progress.
export function savingStreak(goal, today) {
  const p = goalPlan(goal, today);
  if (!(p.perWeek > 0)) return 0;
  const end = new Date(addDays(today, 1)).getTime();
  const sums = Array(12).fill(0);
  for (const a of goal.adds || []) {
    const k = Math.floor((end - a.at) / (7 * 86400000));
    if (k >= 0 && k < 12) sums[k] += a.amount;
  }
  let streak = 0;
  for (let k = sums[0] >= p.perWeek ? 0 : 1; k < 12 && sums[k] >= p.perWeek; k++) streak++;
  return streak;
}

// One small next step for a goal. Never based on how many days were logged.
export function goalStep(goal, today) {
  const p = goalPlan(goal, today);
  if (p.done) return { kind: 'done' };
  if (p.overdue) return { kind: 'overdue', remaining: p.remaining };
  if (p.noDeadline) return { kind: 'nodeadline', remaining: p.remaining };
  const weekStart = new Date(addDays(today, -6)).getTime();
  const addedThisWeek = (goal.adds || []).filter((a) => a.at >= weekStart).reduce((s, a) => s + a.amount, 0);
  if (addedThisWeek >= p.perWeek) return { kind: 'ontrack', addedThisWeek, perWeek: p.perWeek };
  return { kind: 'step', amount: Math.max(p.perWeek - addedThisWeek, 0), perWeek: p.perWeek, addedThisWeek };
}
