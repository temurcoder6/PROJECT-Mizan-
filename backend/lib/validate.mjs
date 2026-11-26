// Input validation, canonical normalization, password policy, and state sanitization helpers for Mizan backend.

export const LIMITS = {
  transactions: 50000,
  debts: 3000,
  goals: 300,
  bills: 300,
  noSpend: 5000,
  payments: 500,
  adds: 3000,
  cards: 50,
};

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Control characters are stripped from stored text to prevent terminal escape spoofing in admin tools.
export const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export const CARD_NETWORKS = ['uzcard', 'humo', 'visa', 'mastercard', 'naqd', 'boshqa'];
export const SECRET_CARD_KEYS = ['cvv', 'cvc', 'cvv2', 'cvc2', 'pin', 'pan', 'cardNumber', 'card_number', 'fullNumber', 'expiry', 'exp', 'expMonth', 'expYear'];

const MAX_MONEY = 1e13;

export const str = (v, max) => (typeof v === 'string' ? v.slice(0, max).replace(CONTROL, '') : '');
export const num = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_MONEY, Math.max(-MAX_MONEY, n));
};
export const int = (v) => Math.trunc(num(v));
export const bool = (v) => (v ? 1 : 0);
export const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
export const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

/** Verify YYYY-MM-DD represents a real Gregorian calendar date (e.g. rejects 2026-02-31). */
export function isValidISODate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const y = Number(v.slice(0, 4));
  const m = Number(v.slice(5, 7));
  const d = Number(v.slice(8, 10));
  if (y < 1900 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const date = (v) => (isValidISODate(v) ? v : '');

export function dedupe(items) {
  const map = new Map();
  for (const it of items) if (it.id) map.set(it.id, it);
  return [...map.values()];
}

const WEAK_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000',
  '12341234', 'password', 'password1', 'qwerty123', 'qwertyui', 'qwertyuiop',
  'abcd1234', 'admin123', 'iloveyou', 'parol123', 'parol1234', 'parolparol',
  'uzbekistan', 'tashkent1',
]);

/** Return Uzbek error string if password is invalid/weak, otherwise null. */
export function passwordIssue(password, username) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return "Parol kamida 8 belgi bo'lishi kerak.";
  }
  const p = password.toLowerCase();
  if (WEAK_PASSWORDS.has(p) || (username && p === String(username).toLowerCase()) || new Set(p).size < 3) {
    return 'Parol juda oson topiladi. Boshqa, qiyinroq parol tanlang.';
  }
  return null;
}

/** Check whether a card payload includes forbidden full PAN, CVV, PIN, or expiry fields. */
export function findForbiddenCardKey(raw) {
  if (!raw || typeof raw !== 'object') return null;
  for (const key of Object.keys(raw)) {
    if (SECRET_CARD_KEYS.includes(key)) return key;
  }
  return null;
}

/** Normalize a single card record. Never stores PAN, expiry, PIN, or CVV (only label & last 4 digits). */
export function sanitizeCard(c, fallbackId = '') {
  const network = oneOf(c?.network, CARD_NETWORKS, 'uzcard');
  const rawLast4 = str(c?.last4, 32).replace(/\D/g, '');
  const last4 = network === 'naqd' ? '' : rawLast4.slice(-4);
  return {
    id: str(c?.id || fallbackId, 64),
    label: str(c?.label, 60).trim() || 'Karta',
    network,
    last4,
    balance: Math.max(0, num(c?.balance)),
    createdAt: int(c?.createdAt) || Date.now(),
  };
}

/** Validate and clean full client sync payload into database-ready arrays & profile. */
export function cleanState(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const transactions = dedupe(
    list(body.transactions, LIMITS.transactions).map((t) => ({
      id: str(t?.id, 64),
      type: oneOf(t?.type, ['income', 'expense'], 'expense'),
      title: str(t?.title, 200),
      amount: Math.max(0, num(t?.amount)),
      category: str(t?.category, 40) || 'boshqa',
      date: date(t?.date),
      method: str(t?.method, 20) || 'naqd',
      planned: t?.planned === false ? 0 : 1,
      note: str(t?.note, 500),
      dayTotal: bool(t?.dayTotal),
      createdAt: int(t?.createdAt),
      sample: bool(t?.sample),
    })),
  ).filter((t) => t.date);

  const debts = dedupe(
    list(body.debts, LIMITS.debts).map((d) => ({
      id: str(d?.id, 64),
      direction: oneOf(d?.direction, ['lent', 'borrowed'], 'lent'),
      person: str(d?.person, 100),
      amount: Math.max(0, num(d?.amount)),
      date: date(d?.date),
      dueDate: date(d?.dueDate),
      note: str(d?.note, 500),
      remind: d?.remind === false ? 0 : 1,
      createdAt: int(d?.createdAt),
      sample: bool(d?.sample),
      payments: list(d?.payments, LIMITS.payments)
        .map((p) => ({ id: str(p?.id, 64), amount: Math.max(0, num(p?.amount)), date: date(p?.date), at: int(p?.at) }))
        .filter((p) => p.date),
    })),
  ).filter((d) => d.date);

  const goals = dedupe(
    list(body.goals, LIMITS.goals).map((g) => ({
      id: str(g?.id, 64),
      name: str(g?.name, 100),
      target: Math.max(0, num(g?.target)),
      saved: Math.max(0, num(g?.saved)),
      deadline: date(g?.deadline),
      createdAt: str(g?.createdAt, 40),
      sample: bool(g?.sample),
      adds: list(g?.adds, LIMITS.adds).map((a) => ({ amount: Math.max(0, num(a?.amount)), at: int(a?.at) })),
    })),
  );

  const p = body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile) ? body.profile : {};
  const profile = {
    cash: p.cash === null || p.cash === undefined || p.cash === '' ? null : num(p.cash),
    cashDate: date(p.cashDate),
    cashSetAt: int(p.cashSetAt),
    nextIncome: date(p.nextIncome),
    includeGoals: p.includeGoals === false ? 0 : 1,
    bills: dedupe(
      list(p.bills, LIMITS.bills).map((b) => ({
        id: str(b?.id, 64),
        name: str(b?.name, 100),
        amount: Math.max(0, num(b?.amount)),
        dueDate: date(b?.dueDate),
        repeat: oneOf(b?.repeat, ['none', 'weekly', 'monthly'], 'none'),
        paidThrough: date(b?.paidThrough),
      })),
    ).filter((b) => b.dueDate),
    noSpend: [...new Set(list(p.noSpend, LIMITS.noSpend).map(date).filter(Boolean))],
    reminder: {
      enabled: bool(p.reminder?.enabled),
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(p.reminder?.time || '') ? p.reminder.time : '21:00',
      last: date(p.reminder?.last),
    },
  };

  const cards = dedupe(list(body.cards, LIMITS.cards).map((c) => sanitizeCard(c)));
  return { transactions, debts, goals, profile, cards };
}
