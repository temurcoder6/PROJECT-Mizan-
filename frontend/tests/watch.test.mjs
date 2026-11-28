import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeAlerts, pendingPushes, pushKey, visibleAlerts, SEVERITY_RANK } from '../src/lib/watch.js';
import { addDays } from '../src/lib/format.js';

const TODAY = '2026-11-26';
// Mahalliy tushda vaqt: ms yozuvlar sana bilan bir kunda qolsin.
const at = (iso) => new Date(`${iso}T12:00:00`).getTime();
const tx = (o = {}) => ({ id: uid(), type: 'expense', title: 'xarajat', amount: 0, category: 'oziq', date: TODAY, method: 'naqd', createdAt: 5000, ...o });
let n = 0;
const uid = () => `t${++n}`;
// Kunlik reja: 850 000 / 9 kun = 94 444 so'm kuniga (xarajat qo'shilganda ham shu kattalik qoladi).
const store = (o = {}) => ({
  profile: { cash: 850000, cashDate: TODAY, cashSetAt: 1000, nextIncome: addDays(TODAY, 9), ...(o.profile || {}) },
  transactions: o.transactions || [],
  debts: o.debts || [],
  goals: o.goals || [],
});
const run = (o) => computeAlerts({ store: store(o), today: TODAY });
const byKind = (list, kind) => list.filter((a) => a.kind === kind);

// (a) Kunlik limit
test('kunlik limit: limitdan oshgan xarajat — xavfli ogohlantirish', () => {
  const alerts = byKind(run({ transactions: [tx({ amount: 100000 })] }), 'daily-limit');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'danger');
  assert.equal(alerts[0].page, 'yozuvlar');
  assert.match(alerts[0].text, /100 000 so'm/);
});

test('kunlik limit: 80% ga yetgan xarajat — ogohlantirish, oshmagan bo\'lsa xavfli emas', () => {
  const warn = byKind(run({ transactions: [tx({ amount: 80000 })] }), 'daily-limit');
  assert.equal(warn.length, 1);
  assert.equal(warn[0].severity, 'warn');
});

test('kunlik limit: xarajat yo\'q yoki kam bo\'lsa ogohlantirish yo\'q', () => {
  assert.equal(byKind(run({}), 'daily-limit').length, 0);
  assert.equal(byKind(run({ transactions: [tx({ amount: 20000 })] }), 'daily-limit').length, 0);
});

// (b) Qarz muddati
test('qarz: muddati 3 kun ichida — olingan qarz uchun ogohlantirish', () => {
  const debts = [{ id: 'd1', direction: 'borrowed', person: "Do'kon", amount: 150000, payments: [], dueDate: addDays(TODAY, 2) }];
  const alerts = byKind(run({ debts }), 'debt');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'warn');
  assert.equal(alerts[0].id, 'debt:d1:warn');
  assert.equal(alerts[0].page, 'qarzlar');
});

test('qarz: muddati o\'tib ketgan — xavfli ogohlantirish', () => {
  const debts = [{ id: 'd2', direction: 'borrowed', person: 'Bank', amount: 150000, payments: [], dueDate: addDays(TODAY, -1) }];
  const alerts = byKind(run({ debts }), 'debt');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'danger');
  assert.match(alerts[0].text, /1 kun oldin o'tgan/);
});

test('qarz: muddat uzoq bo\'lsa yoki qarz to\'langan bo\'lsa ogohlantirish yo\'q', () => {
  const far = [{ id: 'd3', direction: 'borrowed', person: 'Bank', amount: 150000, payments: [], dueDate: addDays(TODAY, 10) }];
  const paid = [{ id: 'd4', direction: 'borrowed', person: 'Bank', amount: 150000, payments: [{ amount: 150000 }], dueDate: addDays(TODAY, 1) }];
  assert.equal(byKind(run({ debts: far }), 'debt').length, 0);
  assert.equal(byKind(run({ debts: paid }), 'debt').length, 0);
});

test('qarz: berilgan qarz (qaytarilishi kerak) — faqat ma\'lumot darajasida', () => {
  const debts = [{ id: 'd5', direction: 'lent', person: 'Alisher', amount: 200000, payments: [], dueDate: addDays(TODAY, 1) }];
  const alerts = byKind(run({ debts }), 'debt');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'info');
});

// (c) Maqsad: orqada qolish, muddat o'tishi, pul qo'shilmagan
test('maqsad: haftalik kerakli summa boshlang\'ichdan oshgan — orqada qolyapti', () => {
  const goals = [{ id: 'g1', name: 'Telefon', target: 1000000, saved: 0, createdAt: addDays(TODAY, -14), deadline: addDays(TODAY, 14), adds: [] }];
  const lag = run({ goals }).filter((a) => a.id === 'goal-lag:g1');
  assert.equal(lag.length, 1);
  assert.equal(lag[0].severity, 'warn');
  assert.match(lag[0].text, /500 000 so'm/);
});

test('maqsad: rejada bo\'lsa orqada qolish ogohlantirishi yo\'q', () => {
  const goals = [{ id: 'g1', name: 'Telefon', target: 1000000, saved: 500000, createdAt: addDays(TODAY, -14), deadline: addDays(TODAY, 14), adds: [{ amount: 500000, at: at(addDays(TODAY, -1)) }] }];
  assert.equal(run({ goals }).filter((a) => a.kind === 'goal').length, 0);
});

test('maqsad: 7 kundan beri pul qo\'shilmagan — ma\'lumot darajasida', () => {
  const goals = [{ id: 'g2', name: 'Kurs', target: 1000000, saved: 0, createdAt: addDays(TODAY, -10), deadline: addDays(TODAY, 200), adds: [] }];
  const idle = run({ goals }).filter((a) => a.id === 'goal-idle:g2');
  assert.equal(idle.length, 1);
  assert.equal(idle[0].severity, 'info');
  assert.match(idle[0].text, /10 kundan beri/);
});

test('maqsad: yaqinda qo\'shilgan bo\'lsa "pul qo\'shilmagan" chiqmaydi', () => {
  const goals = [{ id: 'g2', name: 'Kurs', target: 1000000, saved: 1000, createdAt: addDays(TODAY, -10), deadline: addDays(TODAY, 200), adds: [{ amount: 1000, at: at(addDays(TODAY, -1)) }] }];
  assert.equal(run({ goals }).filter((a) => a.id === 'goal-idle:g2').length, 0);
});

test('maqsad: muddati o\'tgan — ogohlantirish', () => {
  const goals = [{ id: 'g3', name: 'Sayohat', target: 1000000, saved: 100000, createdAt: addDays(TODAY, -60), deadline: addDays(TODAY, -2), adds: [{ amount: 100000, at: at(addDays(TODAY, -3)) }] }];
  const over = run({ goals }).filter((a) => a.id === 'goal-lag:g3');
  assert.equal(over.length, 1);
  assert.match(over[0].title, /muddati o'tib/);
});

// (d) Toifa keskin oshishi
test('toifa: 7 kunlik xarajat oldingi o\'rtachadan keskin yuqori — ogohlantirish', () => {
  const transactions = [tx({ category: 'bozor', amount: 30000, date: addDays(TODAY, -20) }), tx({ category: 'bozor', amount: 300000, date: TODAY })];
  const cat = byKind(run({ transactions }), 'category');
  assert.equal(cat.length, 1);
  assert.equal(cat[0].id, 'category:bozor:warn');
  assert.equal(cat[0].severity, 'warn');
  assert.match(cat[0].text, /300 000 so'm/);
});

test('toifa: o\'rtachaga yaqin yoki kichik farq — ogohlantirish yo\'q', () => {
  const normal = [tx({ category: 'bozor', amount: 30000, date: addDays(TODAY, -20) }), tx({ category: 'bozor', amount: 9000, date: TODAY })];
  const small = [tx({ category: 'bozor', amount: 3000, date: addDays(TODAY, -20) }), tx({ category: 'bozor', amount: 20000, date: TODAY })];
  assert.equal(byKind(run({ transactions: normal }), 'category').length, 0);
  assert.equal(byKind(run({ transactions: small }), 'category').length, 0);
});

// (e) Pul yetmasligi
test('pul yetmasligi: keyingi daromadgacha reja manfiy — xavfli ogohlantirish', () => {
  const debts = [{ id: 'd6', direction: 'borrowed', person: 'Bank', amount: 200000, payments: [], dueDate: addDays(TODAY, 2) }];
  const alerts = run({ profile: { cash: 100000 }, debts }).filter((a) => a.id === 'deficit:danger');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'danger');
  assert.match(alerts[0].text, /100 000 so'm/);
});

test('pul yetmasligi: yetarli pul bo\'lsa ogohlantirish yo\'q', () => {
  assert.equal(run({}).filter((a) => a.kind === 'deficit').length, 0);
});

// Umumiy: tartib, shakl, bo'sh ma'lumot
test('ogohlantirishlar eng jiddiysidan boshlanadi va to\'liq shaklda', () => {
  const transactions = [tx({ amount: 100000 }), tx({ category: 'bozor', amount: 30000, date: addDays(TODAY, -20) }), tx({ category: 'bozor', amount: 300000, date: TODAY })];
  const debts = [{ id: 'd7', direction: 'lent', person: 'Alisher', amount: 200000, payments: [], dueDate: addDays(TODAY, 1) }];
  const alerts = run({ transactions, debts });
  assert.ok(alerts.length >= 3);
  for (let i = 1; i < alerts.length; i++) {
    assert.ok(SEVERITY_RANK[alerts[i - 1].severity] <= SEVERITY_RANK[alerts[i].severity], 'tartib buzilgan');
  }
  for (const a of alerts) {
    for (const k of ['id', 'severity', 'title', 'text', 'page', 'kind', 'ask']) assert.ok(a[k], `maydon yo'q: ${k}`);
    assert.ok(['info', 'warn', 'danger'].includes(a.severity));
  }
});

test('bo\'sh ma\'lumot: hech qanday ogohlantirish chiqmaydi, xato ham bo\'lmaydi', () => {
  assert.deepEqual(computeAlerts({ store: {}, today: TODAY }), []);
  assert.deepEqual(computeAlerts({ store: { profile: { cash: null } }, today: TODAY }), []);
});

// Yopish va bildirishnoma (sof funksiyalar)
test('yopilgan ogohlantirish shu kun yashirin, ertasi kuni qaytadi', () => {
  const alerts = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(visibleAlerts(alerts, { a: TODAY }, TODAY).map((x) => x.id), ['b']);
  assert.deepEqual(visibleAlerts(alerts, { a: TODAY }, addDays(TODAY, 1)).map((x) => x.id), ['a', 'b']);
});

test('bildirishnoma: faqat xavfli/ogohlantirish, tur+daraja uchun kuniga bir marta, info yo\'q', () => {
  const alerts = [
    { id: 'debt:1:danger', kind: 'debt', severity: 'danger' },
    { id: 'debt:2:danger', kind: 'debt', severity: 'danger' },
    { id: 'debt:3:info', kind: 'debt', severity: 'info' },
    { id: 'deficit:danger', kind: 'deficit', severity: 'danger' },
  ];
  assert.deepEqual(pendingPushes(alerts, {}, TODAY).map((a) => a.id), ['debt:1:danger', 'deficit:danger']);
  assert.deepEqual(pendingPushes(alerts, { [pushKey(alerts[0])]: TODAY }, TODAY).map((a) => a.id), ['deficit:danger']);
  assert.deepEqual(pendingPushes(alerts, { [pushKey(alerts[0])]: '2026-11-20' }, TODAY).map((a) => a.id), ['debt:1:danger', 'deficit:danger']);
});
