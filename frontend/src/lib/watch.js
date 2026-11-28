// Proaktiv kuzatuvchi: sayt holatini faqat mahalliy qoidalar bilan tekshiradi.
// AI bu yerda chaqirilmaydi (xarajatsiz); AI faqat foydalanuvchi "tushuntirsin" degandagina ishlaydi.
import { categoryLabel } from './categories.js';
import { addDays, dateLabel, daysBetween, money, toISODate } from './format.js';
import { debtRemaining, goalPlan, inRange, summarize } from './finance.js';
import { dailyPlan, normProfile } from './plan.js';

export const SEVERITY_RANK = { danger: 0, warn: 1, info: 2 };

// Qoida parametrlari (mezonlar). Matnda o'ylab topilgan raqam yo'q: hamma raqam hisob-kitobdan chiqadi.
export const RULES = {
  limitWarnShare: 0.8, // kunlik limitning shu ulushidan oshsa "yaqinlashdingiz"
  debtSoonDays: 3, // qarz muddati shuncha kun ichida bo'lsa
  goalLagRatio: 1.2, // haftalik kerakli summa boshlang'ichdan shuncha marta oshsa
  idleDays: 7, // shuncha kun hech narsa qo'shilmasa
  spikeRatio: 1.8, // 7 kunlik xarajat oldingi o'rtachadan shuncha marta katta bo'lsa
  spikeMinExcess: 100000, // va farq kamida shuncha so'm bo'lsa (kichik toifalar shovqin bermasin)
  baselineDays: 30, // taqqoslash uchun oldingi kunlar soni (7 kundan oldin)
};

// Sana qiymatini YYYY-MM-DD ko'rinishiga keltiradi (eski yozuvlarda ms yoki bo'sh bo'lishi mumkin).
function isoOf(v) {
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '';
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return toISODate(new Date(v));
  return '';
}

// 1) Kunlik limit: bugungi xarajat dailyPlan hisoblagan kunlik limitdan oshdi yoki yaqinlashdi.
function dailyLimitAlerts(plan) {
  if (plan.status !== 'ok' || !(plan.spentToday > 0)) return [];
  const budget = plan.todayBudget;
  const spent = plan.spentToday;
  if (spent > budget) {
    return [
      {
        id: 'daily-limit:danger',
        kind: 'daily-limit',
        severity: 'danger',
        page: 'yozuvlar',
        title: 'Kunlik limitdan oshdi',
        text: `Bugun ${money(spent)} sarflandi, kunlik limit ${money(budget)}. Limitdan ${money(spent - budget)} oshdi.`,
        push: 'Bugungi kunlik limit oshdi.',
        ask: 'Nega bugungi limitdan oshdim? Qolgan kunlarda qanday tejashim mumkin?',
      },
    ];
  }
  if (spent >= budget * RULES.limitWarnShare) {
    return [
      {
        id: 'daily-limit:warn',
        kind: 'daily-limit',
        severity: 'warn',
        page: 'yozuvlar',
        title: 'Kunlik limitga yaqinlashdingiz',
        text: `Bugun ${money(spent)} sarflandi, kunlik limit ${money(budget)}. Qolgani ${money(budget - spent)}.`,
        push: 'Kunlik limitga yaqinlashildi.',
        ask: "Bugungi limitimga yaqinlashyapman. Qaysi xarajatni kamaytirsam bo'ladi?",
      },
    ];
  }
  return [];
}

// 2) Pul yetmasligi: keyingi daromadgacha rejadagi to'lovlar puldan ortiq.
function deficitAlerts(plan, profile) {
  if (plan.status !== 'deficit') return [];
  return [
    {
      id: 'deficit:danger',
      kind: 'deficit',
      severity: 'danger',
      page: 'bosh',
      title: 'Daromadgacha pul yetmasligi mumkin',
      text: `Keyingi daromadgacha (${dateLabel(profile.nextIncome)}) hisob-kitob bo'yicha ${money(plan.shortfall)} kam chiqyapti. Rejalangan to'lov va maqsadlarni ko'rib chiqing.`,
      push: 'Daromad sanasigacha pul yetmasligi mumkin.',
      ask: "Keyingi daromadgacha pul yetmayapti. Rejani qanday to'g'rilasam bo'ladi?",
    },
  ];
}

// 3) Qarz muddati: 3 kun ichida yoki o'tib ketgan. Berilgan qarz (lent) — info, olingan qarz — ogohlantirish/xavf.
function debtAlerts(debts, today) {
  const out = [];
  for (const d of debts) {
    if (!d.dueDate || !(debtRemaining(d) > 0)) continue;
    const days = daysBetween(today, d.dueDate);
    if (days > RULES.debtSoonDays) continue;
    const lent = d.direction === 'lent';
    const overdue = days < 0;
    const severity = lent ? 'info' : overdue ? 'danger' : 'warn';
    const when = overdue ? `${-days} kun oldin o'tgan` : days === 0 ? 'bugun tugaydi' : `${days} kun qoldi`;
    const amount = money(debtRemaining(d));
    const who = d.person || 'Kishi';
    out.push({
      id: `debt:${d.id}:${severity}`,
      kind: 'debt',
      severity,
      page: 'qarzlar',
      title: lent
        ? overdue
          ? "Qaytarilishi kerak bo'lgan qarz muddati o'tgan"
          : "Qaytarilishi kerak bo'lgan qarz muddati yaqin"
        : overdue
          ? "Qarz muddati o'tib ketgan"
          : 'Qarz muddati yaqinlashmoqda',
      text: lent ? `${who} sizga ${amount} qaytarishi kerak: muddat ${when}.` : `Siz ${who}ga ${amount} qaytarishingiz kerak: muddat ${when}.`,
      push: lent ? "Qaytarilishi kerak bo'lgan qarz muddati yaqin." : overdue ? "Qarz muddati o'tib ketgan." : 'Qarz muddati yaqinlashmoqda.',
      ask: lent ? 'Menga qaytarilishi kerak bo\'lgan qarzni qanday eslatsam bo\'ladi?' : "Qarz muddatim yaqin. Qanday qilib to'lashni rejalashtirsam bo'ladi?",
    });
  }
  return out;
}

// Maqsad boshida kerak bo'lgan haftalik summa (boshlanish sanasi va hozirgi holatdan tiklanadi).
function initialWeekly(g) {
  const start = isoOf(g.createdAt);
  if (!start || !g.deadline) return 0;
  const weeks = daysBetween(start, g.deadline) / 7;
  if (!(weeks > 0)) return 0;
  const added = (g.adds || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const savedAtStart = Math.max((Number(g.saved) || 0) - added, 0);
  const remainingAtStart = Math.max((Number(g.target) || 0) - savedAtStart, 0);
  return remainingAtStart / Math.max(weeks, 1);
}

// 4) Maqsad: muddati o'tgan, boshlang'ichdan orqada (haftalik summa oshgan) yoki 7 kundan beri pul qo'shilmagan.
function goalAlerts(goals, today) {
  const out = [];
  for (const g of goals) {
    const p = goalPlan(g, today);
    if (p.done) continue;
    const name = g.name || 'Maqsad';

    if (p.overdue) {
      out.push({
        id: `goal-lag:${g.id}`,
        kind: 'goal',
        severity: 'warn',
        page: 'maqsadlar',
        title: "Maqsad muddati o'tib ketgan",
        text: `«${name}» muddati o'tgan, yana ${money(p.remaining)} kerak.`,
        push: "Maqsad muddati o'tib ketgan.",
        ask: `«${name}» maqsadimning muddati o'tib ketdi. Yangi muddatni qanday belgilasam bo'ladi?`,
      });
    } else if (p.perWeek) {
      const was = initialWeekly(g);
      if (was > 0 && p.perWeek > was * RULES.goalLagRatio) {
        out.push({
          id: `goal-lag:${g.id}`,
          kind: 'goal',
          severity: 'warn',
          page: 'maqsadlar',
          title: 'Maqsad orqada qolyapti',
          text: `«${name}»: haftalik kerakli summa ${money(p.perWeek)} ga oshdi (boshida ${money(was)} edi).`,
          push: 'Maqsad orqada qolyapti.',
          ask: `«${name}» maqsadim orqada qolyapti. Haftalik summani qanday kamaytirsam bo'ladi?`,
        });
      }
    }

    const last = (g.adds || []).reduce((m, a) => {
      const d = isoOf(a.at);
      return d && d > m ? d : m;
    }, '');
    const since = last || isoOf(g.createdAt);
    const idle = since ? daysBetween(since, today) : 0;
    if (since && idle >= RULES.idleDays) {
      out.push({
        id: `goal-idle:${g.id}`,
        kind: 'goal',
        severity: 'info',
        page: 'maqsadlar',
        title: "Maqsadga pul qo'shilmagan",
        text: `«${name}»: ${idle} kundan beri hech narsa qo'shilmagan. Yana ${money(p.remaining)} kerak.`,
        push: '',
        ask: `«${name}» maqsadimga uzoq vaqt pul qo'shmadim. Qanday kichik qadam qo'yishim mumkin?`,
      });
    }
  }
  return out;
}

// 5) Toifa: oxirgi 7 kunda xarajat oldingi 30 kun haftalik o'rtachasidan keskin yuqori.
function categoryAlerts(transactions, today) {
  const expense = (t) => t.type === 'expense' && t.category !== 'kunjami';
  const base = inRange(transactions, addDays(today, -(RULES.baselineDays + 6)), addDays(today, -7)).filter(expense);
  if (!base.length) return [];
  const week = inRange(transactions, addDays(today, -6), today).filter(expense);
  const baseSum = Object.fromEntries(summarize(base).categories.map((c) => [c.id, c.sum]));

  const out = [];
  for (const c of summarize(week).categories) {
    const weekly = ((baseSum[c.id] || 0) / RULES.baselineDays) * 7;
    if (weekly <= 0 || c.sum < weekly * RULES.spikeRatio || c.sum - weekly < RULES.spikeMinExcess) continue;
    const label = categoryLabel(c.id);
    out.push({
      id: `category:${c.id}:warn`,
      kind: 'category',
      severity: 'warn',
      page: 'hisobot',
      title: `${label} xarajati keskin oshdi`,
      text: `«${label}» ga oxirgi 7 kunda ${money(c.sum)} sarflangan. Oldingi 30 kunda haftalik o'rtacha ${money(weekly)} edi: ${Math.round((c.sum / weekly - 1) * 100)}% ko'p.`,
      push: 'Bir toifadagi xarajat keskin oshdi.',
      ask: `«${label}» toifasidagi xarajatim nega keskin oshdi? Nimani kamaytirsam bo'ladi?`,
    });
  }
  return out;
}

// Barcha ogohlantirishlar, eng jiddiylari birinchi. Hisob-kitob faqat foydalanuvchi kiritgan ma'lumotdan.
// store: { profile, transactions, debts, goals }; today: YYYY-MM-DD
export function computeAlerts({ store = {}, today }) {
  const profile = normProfile(store.profile);
  const transactions = Array.isArray(store.transactions) ? store.transactions : [];
  const debts = Array.isArray(store.debts) ? store.debts : [];
  const goals = Array.isArray(store.goals) ? store.goals : [];
  const plan = dailyPlan({ profile, transactions, debts, goals, today });
  return [
    ...dailyLimitAlerts(plan),
    ...deficitAlerts(plan, profile),
    ...debtAlerts(debts, today),
    ...goalAlerts(goals, today),
    ...categoryAlerts(transactions, today),
  ].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

// Bugun yopilmagan (dismissed[id] !== today) ogohlantirishlar.
export function visibleAlerts(alerts, dismissed, today) {
  return alerts.filter((a) => !dismissed || dismissed[a.id] !== today);
}

// Bildirishnoma kaliti: tur (kind) + daraja. Kuniga har kalit uchun bir marta; danger/warn bo'lsa yuboriladi.
export function pushKey(a) {
  return `${a.kind}:${a.severity}`;
}

export function pendingPushes(alerts, notified, today) {
  const seen = new Set();
  const out = [];
  for (const a of alerts) {
    if (a.severity === 'info') continue;
    const key = pushKey(a);
    if (seen.has(key) || (notified && notified[key] === today)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}
