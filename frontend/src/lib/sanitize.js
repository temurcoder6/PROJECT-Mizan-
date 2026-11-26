// Import qilingan faylni tozalaydi: noto'g'ri yozuvlar tashlanadi, ilova qulamaydi.
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const str = (x, max = 200) => (typeof x === 'string' ? x.slice(0, max) : '');
const MAX_ITEMS = 50000;

export function cleanTransactions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_ITEMS)
    .filter((t) => isObj(t) && num(t.amount) && t.amount >= 0 && /^\d{4}-\d{2}-\d{2}/.test(String(t.date)))
    .map((t) => ({
      ...t,
      id: str(String(t.id ?? ''), 64) || `i${Math.random().toString(36).slice(2, 10)}`,
      type: t.type === 'income' ? 'income' : 'expense',
      title: str(t.title),
      category: str(t.category, 40) || 'boshqa',
      date: String(t.date).slice(0, 10),
      note: str(t.note, 500),
    }));
}

export function cleanDebts(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_ITEMS)
    .filter((d) => isObj(d) && num(d.amount) && d.amount >= 0)
    .map((d) => ({ ...d, id: str(String(d.id ?? ''), 64) || `d${Math.random().toString(36).slice(2, 10)}`, direction: d.direction === 'borrowed' ? 'borrowed' : 'lent', person: str(d.person), note: str(d.note, 500), payments: Array.isArray(d.payments) ? d.payments.filter((p) => isObj(p) && num(p.amount)) : [] }));
}

export function cleanGoals(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_ITEMS)
    .filter((g) => isObj(g) && num(g.target) && g.target > 0)
    .map((g) => ({ ...g, id: str(String(g.id ?? ''), 64) || `g${Math.random().toString(36).slice(2, 10)}`, name: str(g.name), saved: num(g.saved) && g.saved >= 0 ? g.saved : 0, adds: Array.isArray(g.adds) ? g.adds.filter((a) => isObj(a) && num(a.amount)) : [] }));
}

export function cleanCards(list) {
  if (!Array.isArray(list)) return [];
  const allowed = new Set(['uzcard', 'humo', 'visa', 'mastercard', 'naqd', 'boshqa']);
  return list
    .slice(0, 50)
    .filter((c) => isObj(c))
    .map((c) => ({
      id: str(String(c.id ?? ''), 64) || `c${Math.random().toString(36).slice(2, 10)}`,
      label: str(c.label, 60) || 'Karta',
      network: allowed.has(c.network) ? c.network : 'uzcard',
      last4: String(c.last4 ?? '').replace(/\D/g, '').slice(-4),
      balance: num(c.balance) && c.balance >= 0 ? c.balance : 0,
      createdAt: num(c.createdAt) ? Math.trunc(c.createdAt) : 0,
    }));
}
