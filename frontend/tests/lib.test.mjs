import assert from 'node:assert/strict';
import { test } from 'node:test';
import { respond } from '../src/lib/assistant/assistant.js';
import { repliesFor } from '../src/lib/assistant/replies.js';
import { detectLang, scanNumbers, isAmbiguous } from '../src/lib/assistant/nlp.js';
import { matchCategory, guessCategory } from '../src/lib/categories.js';
import { debtPlan, debtRemaining, debtStatus, detectRecurring, goalPlan, summarize, whatIf } from '../src/lib/finance.js';
import { addDays, daysBetween, formatDigitsInput, parseDigits } from '../src/lib/format.js';
import { savingStreak, weeklySummary } from '../src/lib/insights.js';
import { billDue, cashNow, dailyPlan, DEFAULT_PROFILE, missingDays, monthlyLoad, nextBillDate, normProfile } from '../src/lib/plan.js';
import { checkMessage } from '../src/lib/scam.js';
import { cyrToLat, latToCyr } from '../src/lib/text.js';

const TODAY = '2026-11-26';
const profile = (o = {}) => normProfile({ cash: 850000, cashDate: TODAY, cashSetAt: 1000, nextIncome: addDays(TODAY, 9), ...o });
const plan = (o = {}, extra = {}) => dailyPlan({ profile: profile(o), transactions: [], debts: [], goals: [], today: TODAY, ...extra });

test('kunlik reja: 850 000 / 9 kun = 94 444', () => {
  const p = plan();
  assert.equal(p.status, 'ok');
  assert.equal(p.days, 9);
  assert.equal(Math.round(p.todayBudget), 94444);
});

test('kunlik reja: ma\'lumot yetmasa raqam chiqarmaydi', () => {
  assert.equal(plan({ cash: null }).status, 'need_cash');
  assert.equal(plan({ nextIncome: '' }).status, 'need_income');
  assert.equal(plan({ nextIncome: TODAY }).status, 'income_passed');
  assert.equal(plan({ nextIncome: addDays(TODAY, -3) }).status, 'income_passed');
});

test('kunlik reja: pul 0 bo\'lsa ham to\'g\'ri (yetishmaydi emas)', () => {
  const p = plan({ cash: 0 });
  assert.equal(p.status, 'ok');
  assert.equal(p.todayBudget, 0);
});

test('kunlik reja: to\'lov va qarz pul yetmasa «yetishmaydi»', () => {
  const p = plan({ cash: 100000, bills: [{ id: 'b', name: 'ijara', amount: 300000, dueDate: addDays(TODAY, 3), repeat: 'none', paidThrough: '' }] });
  assert.equal(p.status, 'deficit');
  assert.equal(p.shortfall, 200000);
});

test('kunlik reja: qarz muddati daromaddan keyin bo\'lsa ajratilmaydi, oldin bo\'lsa ajratiladi', () => {
  const debts = (due) => [{ id: 'd', direction: 'borrowed', person: 'A', amount: 100000, date: '2026-11-01', dueDate: due, payments: [], createdAt: 1 }];
  assert.equal(plan({}, { debts: debts(addDays(TODAY, 20)) }).debtSum, 0);
  assert.equal(plan({}, { debts: debts(addDays(TODAY, 5)) }).debtSum, 100000);
  const lent = [{ id: 'l', direction: 'lent', person: 'B', amount: 50000, date: '2026-11-01', dueDate: addDays(TODAY, 2), payments: [], createdAt: 1 }];
  assert.equal(plan({}, { debts: lent }).debtSum, 0);
});

test('kunlik reja: pul kiritilgandan keyingi yozuvlar hisobga kiradi, oldingi sanali keyin qo\'shilgani ikki marta ayirilmaydi', () => {
  const now = 5000;
  const tx = [
    { id: '1', type: 'expense', amount: 10000, date: TODAY, createdAt: now + 1 },
    { id: '2', type: 'expense', amount: 99999, date: addDays(TODAY, -3), createdAt: now + 2 },
    { id: '3', type: 'expense', amount: 77777, date: TODAY, createdAt: now - 1 },
    { id: '4', type: 'income', amount: 5000, date: TODAY, createdAt: now + 3 },
  ];
  const r = cashNow(profile({ cashSetAt: now }), tx, [], []);
  assert.equal(r.cash, 850000 - 10000 + 5000);
});

test('kunlik reja: qarz va maqsadga qo\'shilgan pul pul qoldig\'iga ta\'sir qiladi', () => {
  const since = 1000;
  const debts = [
    { id: 'a', direction: 'lent', amount: 20000, date: TODAY, createdAt: since + 1, payments: [{ amount: 5000, at: since + 2 }] },
    { id: 'b', direction: 'borrowed', amount: 30000, date: TODAY, createdAt: since + 1, payments: [] },
  ];
  const goals = [{ id: 'g', adds: [{ amount: 7000, at: since + 5 }] }];
  const r = cashNow(profile({ cashSetAt: since }), [], debts, goals, TODAY);
  assert.equal(r.cash, 850000 - 20000 + 5000 + 30000 - 7000);
});

test('kunlik reja: cashNow bugungi xarajatni berilgan today sanasi bo\'yicha sanaydi', () => {
  const since = 1000;
  const tx = [
    { id: '1', type: 'expense', amount: 12000, date: TODAY, createdAt: since + 1 },
    { id: '2', type: 'expense', amount: 9000, date: addDays(TODAY, -1), createdAt: since + 2 },
  ];
  const r = cashNow(profile({ cashSetAt: since }), tx, [], [], TODAY);
  assert.equal(r.spentToday, 12000);
  assert.equal(r.cash, 850000 - 12000);
});

test('davriy to\'lov: oylik, haftalik, oy oxiri qisqartirish', () => {
  const monthly = { id: 'm', name: 'x', amount: 100, dueDate: '2026-01-31', repeat: 'monthly', paidThrough: '' };
  const dates = billDue(monthly, '2026-01-01', '2026-04-30').map((o) => o.date);
  assert.deepEqual(dates, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  const weekly = { id: 'w', name: 'y', amount: 100, dueDate: '2026-11-26', repeat: 'weekly', paidThrough: '' };
  assert.deepEqual(billDue(weekly, '2026-11-26', '2026-12-10').map((o) => o.date), ['2026-11-26', '2026-12-03', '2026-12-10']);
  assert.equal(nextBillDate({ ...weekly, paidThrough: '2026-11-26' }, '2026-11-26'), '2026-12-03');
  assert.equal(nextBillDate({ id: 'o', amount: 1, dueDate: '2026-12-01', repeat: 'none', paidThrough: '2026-12-01' }, TODAY), '');
  assert.equal(Math.round(monthlyLoad([weekly, monthly, { amount: 5, repeat: 'none' }])), Math.round((100 * 52) / 12 + 100));
});

test('unutilgan kunlar: faqat birinchi yozuvdan keyin, yozilgan va «xarajat bo\'lmadi» kunlarsiz', () => {
  const tx = [{ type: 'expense', date: '2026-11-20' }, { type: 'expense', date: '2026-11-24' }];
  assert.deepEqual(missingDays(tx, ['2026-11-22'], TODAY), ['2026-11-25', '2026-11-23', '2026-11-21']);
  assert.deepEqual(missingDays([], [], TODAY), []);
});

test('qarz: qoldiq, holat, jadval', () => {
  const d = { id: 'd', direction: 'borrowed', person: 'A', amount: 150000, date: '2026-11-01', dueDate: '2026-12-12', payments: [{ amount: 30000 }] };
  assert.equal(debtRemaining(d), 120000);
  const p = debtPlan(d, TODAY);
  assert.equal(p.weeks, 3);
  assert.equal(p.installments.reduce((s, i) => s + i.amount, 0), 120000);
  assert.equal(p.installments.at(-1).date, '2026-12-12');
  assert.equal(debtStatus({ ...d, dueDate: '2026-11-20' }, TODAY).kind, 'overdue');
  assert.equal(debtStatus({ ...d, dueDate: addDays(TODAY, 3) }, TODAY).kind, 'soon');
  assert.equal(debtStatus({ ...d, payments: [{ amount: 150000 }] }, TODAY).kind, 'closed');
  assert.equal(debtPlan({ ...d, payments: [{ amount: 150000 }] }, TODAY), null);
  assert.equal(debtPlan({ ...d, dueDate: '' }, TODAY), null);
  assert.equal(debtPlan({ ...d, dueDate: '2026-11-20' }, TODAY).overdue, true);
  const one = debtPlan({ ...d, amount: 100, payments: [], dueDate: addDays(TODAY, 1) }, TODAY);
  assert.equal(one.weeks, 1); assert.equal(one.installments[0].amount, 100);
});

test('maqsad: haftalik formula, muddat o\'tgan, bajarilgan', () => {
  const g = { target: 3000000, saved: 600000, deadline: addDays(TODAY, 90), adds: [] };
  const p = goalPlan(g, TODAY);
  assert.equal(Math.round(p.perWeek), 186667);
  assert.equal(goalPlan({ ...g, saved: 3000000 }, TODAY).done, true);
  assert.equal(goalPlan({ ...g, deadline: '2026-11-01' }, TODAY).overdue, true);
  assert.equal(goalPlan({ ...g, deadline: '' }, TODAY).noDeadline, true);
  const w = whatIf(g, 50000, TODAY);
  assert.equal(Math.round(w.perWeekAfter), 190556);
});

test('ketma-ket haftalar: joriy hafta hali bajarilmagan bo\'lsa jazolamaydi', () => {
  const g = { target: 1400000, saved: 0, deadline: addDays(TODAY, 70), adds: [] };
  const need = goalPlan(g, TODAY).perWeek;
  const DAY = 86400000;
  const end = new Date(addDays(TODAY, 1)).getTime();
  g.adds = [{ amount: need, at: end - 8 * DAY }, { amount: need, at: end - 15 * DAY }];
  assert.equal(savingStreak(g, TODAY), 2);
  g.adds.push({ amount: need, at: end - 1 * DAY });
  assert.equal(savingStreak(g, TODAY), 3);
  assert.equal(savingStreak({ ...g, adds: [] }, TODAY), 0);
});

test('hisobot: summa, toifa, rejalangan/kutilmagan', () => {
  const s = summarize([
    { type: 'income', amount: 1000, category: 'maosh', method: 'karta' },
    { type: 'expense', amount: 300, category: 'oziq', method: 'naqd', planned: true },
    { type: 'expense', amount: 100, category: 'dam', method: 'karta', planned: false },
  ]);
  assert.equal(s.income, 1000); assert.equal(s.expense, 400); assert.equal(s.balance, 600);
  assert.equal(s.unplanned, 100); assert.equal(s.categories[0].id, 'oziq');
});

test('odat tuzog\'i: 10 kun har kuni 12 000 = oyiga 360 000', () => {
  const tx = Array.from({ length: 10 }, (_, i) => ({ type: 'expense', title: 'kofe', amount: 12000, category: 'oziq', date: addDays(TODAY, -i) }));
  const r = detectRecurring(tx, TODAY)[0];
  assert.equal(Math.round(r.monthly), 360000);
  assert.deepEqual(detectRecurring(tx.slice(0, 2), TODAY), []);
});

test('haftalik jamlanma: ma\'lumot kam bo\'lsa xulosa chiqarmaydi', () => {
  const few = weeklySummary([{ type: 'expense', amount: 1, category: 'oziq', date: TODAY }], [], [], TODAY);
  assert.equal(few.enough, false);
});

test('summa tahlili: ming, mln, bo\'shliqli minglar, so\'zli raqamlar', () => {
  const v = (s, lang = 'uz') => scanNumbers(s, lang).amounts.map((a) => a.value);
  assert.deepEqual(v('12 ming'), [12000]);
  assert.deepEqual(v('1 500 000 so\'m'), [1500000]);
  assert.deepEqual(v('2.5 mln'), [2500000]);
  assert.deepEqual(v('15k', 'en'), [15000]);
  assert.deepEqual(v('20 тысяч', 'ru'), [20000]);
  assert.deepEqual(v("o'n ikki ming"), [12000]);
  assert.equal(isAmbiguous(scanNumbers('12').amounts[0]), true);
  assert.equal(isAmbiguous(scanNumbers('12 ming').amounts[0]), false);
});

test('til aniqlash', () => {
  assert.equal(detectLang("Bugun yo'lga 12 ming sarfladim"), 'uz');
  assert.equal(detectLang('Бугун йўлга 12 минг сарфладим'), 'uz-cyrl');
  assert.equal(detectLang('Сегодня потратил 20 тысяч на такси'), 'ru');
  assert.equal(detectLang('Spent 15k on lunch yesterday'), 'en');
});

test('kirill-lotin aylantirish ikki yo\'nalishda ishlaydi', () => {
  assert.equal(cyrToLat('Бугун йўлга'), "Bugun yo'lga");
  assert.equal(cyrToLat(latToCyr('bugun yolga sarfladim')).replace(/'/g, ''), 'bugun yolga sarfladim');
});

test('toifa aniqlash', () => {
  assert.equal(matchCategory('taksi'), 'transport');
  assert.equal(matchCategory('такси'), 'transport');
  assert.equal(matchCategory('lunch'), 'oziq');
  assert.equal(matchCategory('qwerty'), null);
  assert.equal(guessCategory('qwerty'), 'boshqa');
});

const data = { transactions: [], debts: [], goals: [{ id: 'g1', name: 'Telefon', target: 3000000, saved: 600000, deadline: '2027-02-23', adds: [] }], profile: null };
const ask = (q, d = data, pending = null) => respond(q, { data: d, today: TODAY, pending });

test('yordamchi: xarajat qoralamasi, tasdiqsiz hech narsa saqlanmaydi, to\'rt tilda', () => {
  const cases = [
    ["Bugun yo'lga 12 ming sarfladim", 12000, 'transport'],
    ['Бугун йўлга 12 минг сарфладим', 12000, 'transport'],
    ['Сегодня потратил 20 тысяч на такси', 20000, 'transport'],
    ['Spent 15k on lunch yesterday', 15000, 'oziq'],
    ['non 5000', 5000, 'oziq'],
  ];
  for (const [q, amount, cat] of cases) {
    const { reply } = ask(q);
    assert.equal(reply.drafts?.length, 1, q);
    assert.equal(reply.drafts[0].kind, 'tx');
    assert.equal(reply.drafts[0].data.amount, amount, q);
    assert.equal(reply.drafts[0].data.category, cat, q);
  }
  assert.equal(ask('Spent 15k on lunch yesterday').reply.drafts[0].data.date, '2026-11-25');
});

test('yordamchi: noaniq summani so\'raydi, taxmin qilmaydi', () => {
  const { reply, pending } = ask("12 sarfladim yo'lga");
  assert.ok(reply.choices?.length === 2);
  assert.ok(!reply.drafts);
  const r2 = ask('12 ming', data, pending);
  assert.equal(r2.reply.drafts[0].data.amount, 12000);
});

test('yordamchi: bir nechta xarajat, daromad, qarz, to\'lov', () => {
  assert.equal(ask('nonga 5000 va taksiga 15000 sarfladim').reply.drafts.length, 2);
  assert.equal(ask('Maosh 4 mln tushdi').reply.drafts[0].data.type, 'income');
  const debt = ask('Alisherga 100 ming qarz berdim, 2 haftaga').reply.drafts[0];
  assert.equal(debt.kind, 'debt'); assert.equal(debt.data.direction, 'lent'); assert.equal(debt.data.person, 'Alisher');
  assert.equal(debt.data.dueDate, '2026-12-10');
  const withDebt = { ...data, debts: [{ id: 'd1', direction: 'lent', person: 'Alisher', amount: 200000, date: '2026-11-10', dueDate: '', payments: [] }] };
  const pay = ask('Alisher 30 ming qaytardi', withDebt).reply.drafts[0];
  assert.equal(pay.kind, 'payment'); assert.equal(pay.data.amount, 30000);
});

test('yordamchi: "50 ming sarflasam" xarajat emas, savol', () => {
  const r = ask("50 ming sarflasam, telefon rejam nima bo'ladi?").reply;
  assert.ok(!r.drafts);
  assert.match(r.text, /2 450 000/);
});

test('yordamchi: juda uzun va g\'alati matn qotmaydi va xato bermaydi', () => {
  for (const s of ['a'.repeat(5000), '1 '.repeat(3000), '', '   ', "'".repeat(500), '12 ming ' + 'va '.repeat(400), '\u0000\u001b[31m']) {
    const t0 = performance.now();
    const r = ask(s);
    assert.ok(typeof r.reply.text === 'string');
    assert.ok(performance.now() - t0 < 500);
  }
});

test('shubhali xabar: firibgarlik belgilari topiladi, oddiy xabar «yo\'q»', () => {
  assert.equal(checkMessage('Kartangiz bloklandi! Darhol http://payme-uz.top/tasdiq ga kiring va SMS kodni yuboring').verdict, 'high');
  assert.equal(checkMessage('Salom, ertaga uchrashamiz').verdict, 'none');
  assert.notEqual(checkMessage('Bonus yutdingiz! bit.ly/abc').verdict, 'none');
});

test('sana yordamchilari', () => {
  assert.equal(daysBetween('2026-11-26', '2026-12-05'), 9);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.deepEqual(DEFAULT_PROFILE.bills, []);
});

import { cleanTransactions, cleanDebts, cleanGoals } from '../src/lib/sanitize.js';
import { sameShape } from '../src/lib/storage.js';

test('sanitize: buzilgan yozuvlar tashlanadi', () => {
  const tx = cleanTransactions([null, 5, { amount: 'x', date: '2026-01-01' }, { amount: 1000, date: 'bad' }, { amount: 5000, date: '2026-02-03', type: 'zzz', title: 'non' }]);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].type, 'expense');
  assert.ok(tx[0].id);
  assert.deepEqual(cleanTransactions('x'), []);
  const debts = cleanDebts([{ amount: 100, payments: 'bad' }, { amount: NaN }]);
  assert.equal(debts.length, 1);
  assert.deepEqual(debts[0].payments, []);
  assert.equal(cleanGoals([{ target: 0 }, { target: 100, saved: 'x' }])[0].saved, 0);
});

test('useStored: shakl mos kelmasa boshlangich qiymat', () => {
  assert.equal(sameShape({}, []), false);
  assert.equal(sameShape([], []), true);
  assert.equal(sameShape([], {}), false);
  assert.equal(sameShape(null, {}), false);
  assert.equal(sameShape('a', 5), false);
  assert.equal(sameShape(5, true), false);
});

test('ovozdan kelgan matn: apostrofsiz, so\'zli raqam, aralash summa, "oylik" daromad', () => {
  const tx = (q) => ask(q).reply.drafts?.map((d) => d.data);
  // apostrof tushib qolgan ("yolga", "goshtga") toifani buzmasligi kerak
  assert.equal(tx('yolga 12 ming sarfladim')[0].category, 'transport');
  assert.equal(tx('goshtga 50 ming toladim')[0].category, 'oziq');
  // "on sakkiz ming" = "o'n sakkiz ming"
  assert.equal(tx('on sakkiz ming taksiga sarfladim')[0].amount, 18000);
  // bir gapda raqam va so'z bilan aytilgan ikki summa
  const two = tx("metroga yigirma besh ming va shashlikga 12 000 to'ladim");
  assert.deepEqual(two.map((d) => d.amount), [25000, 12000]);
  // "80000 oylik" muddat emas, ish haqi
  const pay = tx('80000 oylik tushdi');
  assert.equal(pay[0].type, 'income'); assert.equal(pay[0].amount, 80000);
  assert.equal(tx('buyurtmadan 150 ming berdi')[0].type, 'income');
  // "otgan kuni" (apostrofsiz) = 2 kun oldin
  assert.equal(tx('otgan kuni taksiga 10 ming sarfladim')[0].date, '2026-11-24');
});

test('ovozdan kelgan matn: ruscha "сколько денег осталось" va oylik kamaysa savollari javob oladi', () => {
  for (const q of ['сколько денег осталось', 'oylik kamaysa nima qilaman', 'how much is left']) {
    const r = ask(q).reply;
    assert.ok(!r.drafts, q);
    assert.notEqual(r.text, repliesFor(r.lang).fallback(), q);
  }
});

test('sarlavhaga so\'zli raqam kirmaydi', () => {
  const t = ask('bugun yolga on ikki ming sarfladim').reply.drafts[0].data;
  assert.equal(t.amount, 12000);
  assert.ok(!/ikki|\bon\b/.test(t.title), t.title);
});

test('summa kiritishda raqamlar orasiga bo\'shliq qo\'yiladi', () => {
  assert.equal(formatDigitsInput(''), '');
  assert.equal(formatDigitsInput('0'), '0');
  assert.equal(formatDigitsInput('000'), '0');
  assert.equal(formatDigitsInput('00500'), '500');
  assert.equal(formatDigitsInput('12000'), '12 000');
  assert.equal(formatDigitsInput('850000'), '850 000');
  assert.equal(formatDigitsInput('1250000'), '1 250 000');
  assert.equal(formatDigitsInput('1 500 000 so\'m'), '1 500 000');
  assert.equal(parseDigits('1 500 000'), 1500000);
  assert.equal(parseDigits(''), 0);
});

test('hamkor reklamasi: iPhone savoliga omonat + nasiya kartalari, oddiy xarajatga yo\'q', async () => {
  const { adPartnerIds, pickPartners } = await import('../src/lib/assistant/partnerAds.js');
  const ids = adPartnerIds("iPhone olmoqchiman, narxi 20 million, pulim 3,5 million, qancha yig'ishim kerak?");
  assert.equal(ids[0], 'anor_black');
  assert.ok(ids.length >= 2 && ids.length <= 3);
  assert.deepEqual(adPartnerIds('taksiga 20 ming'), []);
  assert.deepEqual(adPartnerIds('Chet elga ketmoqchiman, aviachipta'), ['ipak_visa', 'kapital_bank', 'tbc_salom']);
  const catalog = [{ id: 'anor_black' }, { id: 'texnomart' }];
  assert.deepEqual(pickPartners(catalog, ['anor_black', 'yoq', 'anor_black', 'texnomart']).map((p) => p.id), ['anor_black', 'texnomart']);
});

test("mahalliy 'olmoqchiman' javobi tasdiq tugmali maqsad kartasini qaytaradi, hech narsa saqlamaydi", () => {
  const data = { transactions: [], debts: [], goals: [], profile: {} };
  const { reply } = respond("iPhone olmoqchiman, narxi 20 million, pulim 3,5 million, qancha yig'ishim kerak?", { data, today: TODAY, pending: null });
  assert.equal(reply.action?.action, 'create_goal');
  assert.equal(reply.action.name.toLowerCase(), 'iphone');
  assert.equal(reply.action.target, 20000000);
  assert.equal(reply.action.saved, 3500000);
  assert.equal(reply.action.months, 12);
  assert.equal(reply.action.daily, Math.round(16500000 / 365));
  assert.equal(reply.drafts, undefined);
});
