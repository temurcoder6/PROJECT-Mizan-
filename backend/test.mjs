import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.STATIC_DIR = new URL('./nonexistent', import.meta.url).pathname;
const { server } = await import('./server.mjs');
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

class Client {
  cookie = '';
  async call(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }
}

let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ' + name); };

const sample = () => ({
  transactions: [
    { id: 't1', type: 'expense', title: 'taksi', amount: 15000, category: 'transport', date: '2026-11-20', method: 'naqd', planned: true, note: '', createdAt: 1000 },
    { id: 't2', type: 'income', title: 'maosh', amount: 4000000, category: 'maosh', date: '2026-11-05', method: 'karta', planned: true, note: '', createdAt: 900 },
    { id: 't3', type: 'expense', title: 'Kun jami', amount: 80000, category: 'kunjami', date: '2026-11-21', method: 'naqd', planned: true, note: '', dayTotal: true, createdAt: 1100 },
  ],
  debts: [{ id: 'd1', direction: 'lent', person: 'Alisher', amount: 200000, date: '2026-11-10', dueDate: '2026-12-01', note: '', remind: true, createdAt: 800, payments: [{ id: 'p1', amount: 50000, date: '2026-11-15', at: 1200 }] }],
  goals: [{ id: 'g1', name: 'Telefon', target: 3000000, saved: 600000, deadline: '2027-02-23', createdAt: '2026-11-01', adds: [{ amount: 600000, at: 1300 }] }],
  profile: { cash: 500000, cashDate: '2026-11-25', cashSetAt: 5000, nextIncome: '2026-12-05', includeGoals: true, bills: [{ id: 'b1', name: 'Internet', amount: 70000, dueDate: '2026-12-01', repeat: 'monthly', paidThrough: '' }], noSpend: ['2026-11-22'], reminder: { enabled: true, time: '20:30', last: '' } },
});

const a = new Client();
const b = new Client();

assert.equal((await a.call('GET', '/api/data')).status, 401); ok('ma\'lumot kirishsiz berilmaydi');
assert.equal((await a.call('POST', '/api/register', { username: 'ab', password: '12345678' })).status, 400); ok('qisqa nom rad etiladi');
assert.equal((await a.call('POST', '/api/register', { username: 'temur', password: 'short' })).status, 400); ok('qisqa parol rad etiladi');
assert.equal((await a.call('POST', '/api/register', { username: 'temur', password: 'maxfiyparol1' })).status, 201); ok("ro'yxatdan o'tish");
assert.equal((await new Client().call('POST', '/api/register', { username: 'TEMUR', password: 'boshqaparol1' })).status, 409); ok('nom katta-kichik harfdan qat\'i nazar band');
assert.equal((await a.call('GET', '/api/me')).data.user.username, 'temur'); ok('/me sessiya bilan ishlaydi');

let r = await a.call('GET', '/api/data');
assert.equal(r.data.hasData, false); assert.equal(r.data.revision, 0); ok("yangi hisob bo'sh");

r = await a.call('PUT', '/api/data', { baseRevision: 0, ...sample() });
assert.equal(r.status, 200); assert.equal(r.data.revision, 1); ok('saqlash, revizya 1');

r = await a.call('GET', '/api/data');
const s = sample();
assert.equal(r.data.hasData, true);
assert.deepEqual(r.data.transactions.map((t) => t.id).sort(), ['t1', 't2', 't3']);
assert.equal(r.data.transactions.find((t) => t.id === 't3').dayTotal, true);
assert.equal(r.data.transactions.find((t) => t.id === 't1').planned, true);
assert.equal(r.data.debts[0].payments[0].amount, 50000);
assert.equal(r.data.debts[0].remind, true);
assert.equal(r.data.goals[0].adds[0].amount, 600000);
assert.equal(r.data.profile.cash, 500000);
assert.equal(r.data.profile.bills[0].repeat, 'monthly');
assert.deepEqual(r.data.profile.noSpend, ['2026-11-22']);
assert.equal(r.data.profile.reminder.time, '20:30');
assert.equal(r.data.profile.includeGoals, true);
ok("saqlangan ma'lumot aynan qaytadi");

r = await a.call('PUT', '/api/data', { baseRevision: 0, ...s });
assert.equal(r.status, 409); assert.equal(r.data.server.revision, 1); ok("eski revizya ziddiyat (409) beradi va server ma'lumotini qaytaradi");

const sw = sample(); sw.profile.bills.push({ id: 'b2', name: 'Kommunal', amount: 40000, dueDate: '2026-12-03', repeat: 'weekly', paidThrough: '' });
r = await a.call('PUT', '/api/data', { baseRevision: 1, ...sw });
assert.equal(r.data.revision, 2);
assert.equal((await a.call('GET', '/api/data')).data.profile.bills.find((b) => b.id === 'b2').repeat, 'weekly'); ok('haftalik davriy to\'lov bazada saqlanadi');

const s2 = sample(); s2.transactions.pop();
r = await a.call('PUT', '/api/data', { baseRevision: 2, ...s2 });
assert.equal(r.data.revision, 3);
assert.equal((await a.call('GET', '/api/data')).data.transactions.length, 2); ok("o'chirilgan yozuv bazadan ham o'chadi");

assert.equal((await b.call('POST', '/api/register', { username: 'boshqa', password: 'boshqaparol1' })).status, 201);
r = await b.call('GET', '/api/data');
assert.equal(r.data.hasData, false); assert.equal(r.data.transactions.length, 0); ok("boshqa foydalanuvchi ma'lumotni ko'rmaydi");

await b.call('PUT', '/api/data', { baseRevision: 0, ...sample() });
assert.equal((await a.call('GET', '/api/data')).data.transactions.length, 2);
assert.equal((await b.call('GET', '/api/data')).data.transactions.length, 3); ok('ikkala foydalanuvchida bir xil id lar to\'qnashmaydi');

r = await a.call('PUT', '/api/data', { baseRevision: 3, transactions: [{ id: 'x', type: 'bad', title: 'x'.repeat(1000), amount: 'abc', date: 'noto\'g\'ri' }, { id: 'y', type: 'expense', title: 'ok', amount: -50, date: '2026-11-01' }] });
assert.equal(r.status, 200);
const clean = (await a.call('GET', '/api/data')).data;
assert.equal(clean.transactions.length, 1); assert.equal(clean.transactions[0].amount, 0); ok("noto'g'ri ma'lumot tozalanadi, sana yo'q yozuv tashlanadi, manfiy summa 0");

r = await a.call('POST', '/api/login', { username: 'temur', password: 'xato' });
assert.equal(r.status, 401); ok("noto'g'ri parol rad etiladi");
for (let i = 0; i < 8; i++) await a.call('POST', '/api/login', { username: 'temur', password: 'xato' + i });
r = await new Client().call('POST', '/api/login', { username: 'temur', password: 'maxfiyparol1' });
assert.equal(r.status, 429); ok("ko'p xato urinishdan keyin bloklanadi");

r = await a.call('PUT', '/api/data', { baseRevision: 3, ...sample() }, { Origin: 'http://evil.example' });
assert.equal(r.status, 403); ok('begona Origin rad etiladi (CSRF)');

r = await a.call('POST', '/api/logout', {});
assert.equal(r.status, 200);
assert.equal((await a.call('GET', '/api/data')).status, 401); ok('chiqishdan keyin sessiya ishlamaydi');

const c = new Client();
r = await b.call('DELETE', '/api/account', { password: 'xato' });
assert.equal(r.status, 401);
r = await b.call('DELETE', '/api/account', { password: 'boshqaparol1' });
assert.equal(r.status, 200);
assert.equal((await b.call('GET', '/api/me')).status, 401); ok("hisobni o'chirish parol so'raydi va hamma ma'lumotni o'chiradi");
assert.equal((await c.call('POST', '/api/register', { username: 'boshqa', password: 'yangiparol123' })).status, 201);
assert.equal((await c.call('GET', '/api/data')).data.transactions.length, 0); ok("o'chirilgan hisob nomi bilan yangi hisobda eski ma'lumot yo'q");

// ---- yordam xizmati, parol almashtirish, barcha qurilmadan chiqish ----
const ticket = { category: 'muammo', message: "Maqsad sahifasida summa noto'g'ri chiqyapti", contact: '@temur', context: 'sahifa: maqsadlar' };
r = await new Client().call('POST', '/api/support', ticket);
assert.equal(r.status, 201); assert.ok(r.data.id > 0); ok('mehmon ham murojaat yubora oladi');
assert.equal((await new Client().call('POST', '/api/support', { ...ticket, category: 'xato' })).status, 400); ok("noto'g'ri tur rad etiladi");
assert.equal((await new Client().call('POST', '/api/support', { ...ticket, message: 'qisqa' })).status, 400); ok('juda qisqa xabar rad etiladi');
assert.equal((await new Client().call('GET', '/api/support/mine')).status, 401); ok('murojaatlar ro\'yxati kirishsiz berilmaydi');
await c.call('POST', '/api/support', { ...ticket, message: "Hisobimga kirganda nom ko'rinmayapti, yordam bering" });
r = await c.call('GET', '/api/support/mine');
assert.equal(r.data.tickets.length, 1); assert.equal(r.data.tickets[0].status, 'open'); ok("hisobli foydalanuvchi o'z murojaatini holati bilan ko'radi");

const d = new Client();
assert.equal((await d.call('POST', '/api/login', { username: 'boshqa', password: 'yangiparol123' })).status, 200);
assert.equal((await c.call('POST', '/api/password', { oldPassword: 'xato-parol', newPassword: 'yangi-parol-456' })).status, 401); ok("parol almashtirishda joriy parol so'raladi");
assert.equal((await c.call('POST', '/api/password', { oldPassword: 'yangiparol123', newPassword: 'short' })).status, 400); ok('yangi parol kamida 8 belgi');
assert.equal((await c.call('POST', '/api/password', { oldPassword: 'yangiparol123', newPassword: 'yangi-parol-456' })).status, 200);
assert.equal((await c.call('GET', '/api/me')).status, 200); ok('parol almashgach joriy qurilma tizimda qoladi');
assert.equal((await d.call('GET', '/api/me')).status, 401); ok('parol almashgach boshqa qurilmalar chiqarib yuboriladi');
assert.equal((await new Client().call('POST', '/api/login', { username: 'boshqa', password: 'yangiparol123' })).status, 401);
const e = new Client();
assert.equal((await e.call('POST', '/api/login', { username: 'boshqa', password: 'yangi-parol-456' })).status, 200); ok('yangi parol bilan kirish ishlaydi, eskisi ishlamaydi');
assert.equal((await e.call('POST', '/api/logout-all', {})).status, 200);
assert.equal((await c.call('GET', '/api/me')).status, 401); ok('barcha qurilmadan chiqish hamma sessiyani yopadi');

for (let i = 0; i < 3; i++) await new Client().call('POST', '/api/support', ticket);
assert.equal((await new Client().call('POST', '/api/support', ticket)).status, 429); ok("murojaat yuborish chegaralangan (soatiga 5 ta)");
assert.equal((await new Client().call('GET', '/api/health')).data.ok, true); ok('salomatlik tekshiruvi bazani tekshiradi');

// ---- parol tiklash kodi ----
const f = new Client();
r = await f.call('POST', '/api/register', { username: 'tiklash_sinov', password: 'birinchi-parol-1' });
assert.equal(r.status, 201);
assert.match(r.data.recoveryCode, /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/); ok("ro'yxatdan o'tganda bir martalik tiklash kodi beriladi");
const code1 = r.data.recoveryCode;
assert.equal((await f.call('GET', '/api/me')).data.user.hasRecovery, true);
await f.call('PUT', '/api/data', { baseRevision: 0, ...sample() });

const g = new Client();
assert.equal((await g.call('POST', '/api/recover', { username: 'tiklash_sinov', code: 'AAAAA-BBBBB-CCCCC-DDDDD', newPassword: 'ikkinchi-parol-2' })).status, 401); ok("noto'g'ri tiklash kodi rad etiladi");
assert.equal((await g.call('POST', '/api/recover', { username: 'mavjud_emas', code: code1, newPassword: 'ikkinchi-parol-2' })).status, 401); ok("mavjud bo'lmagan nom bilan ham bir xil xato");
assert.equal((await g.call('POST', '/api/recover', { username: 'tiklash_sinov', code: code1, newPassword: 'short' })).status, 400);
r = await g.call('POST', '/api/recover', { username: 'tiklash_sinov', code: code1.toLowerCase().replace(/-/g, ' '), newPassword: 'ikkinchi-parol-2' });
assert.equal(r.status, 200); assert.notEqual(r.data.recoveryCode, code1); ok("to'g'ri kod bilan parol tiklanadi (katta-kichik harf va chiziqchaga qarab turmaydi)");
const code2 = r.data.recoveryCode;
assert.equal((await g.call('GET', '/api/data')).data.transactions.length, 3); ok("tiklangandan keyin ma'lumot joyida");
assert.equal((await f.call('GET', '/api/me')).status, 401); ok('tiklash eski sessiyalarni yopadi');
assert.equal((await new Client().call('POST', '/api/login', { username: 'tiklash_sinov', password: 'birinchi-parol-1' })).status, 401);
assert.equal((await new Client().call('POST', '/api/login', { username: 'tiklash_sinov', password: 'ikkinchi-parol-2' })).status, 200);
assert.equal((await new Client().call('POST', '/api/recover', { username: 'tiklash_sinov', code: code1, newPassword: 'uchinchi-parol-3' })).status, 401); ok('ishlatilgan kod qayta ishlamaydi, yangisi beriladi');
assert.equal((await g.call('POST', '/api/recovery-code', { password: 'xato' })).status, 401);
r = await g.call('POST', '/api/recovery-code', { password: 'ikkinchi-parol-2' });
assert.equal(r.status, 200); assert.notEqual(r.data.recoveryCode, code2); ok("yangi kodni faqat parolni tasdiqlab olish mumkin");
const h = new Client();
for (let i = 0; i < 6; i++) await h.call('POST', '/api/recover', { username: 'tiklash_sinov', code: 'XXXXX-XXXXX-XXXXX-XXXXX', newPassword: 'toorta-parol-4' });
assert.equal((await h.call('POST', '/api/recover', { username: 'tiklash_sinov', code: r.data.recoveryCode, newPassword: 'toorta-parol-4' })).status, 429); ok("tiklash urinishlari chegaralangan (6 ta / soat)");

// ---- qurilmalar (sessiyalar) ----
{
  const { deviceLabel, SCHEMA_VERSION } = await import('./server.mjs');
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537 Edg/120'), 'Edge · Windows');
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537'), 'Chrome · Android');
  assert.equal(deviceLabel(undefined), 'Brauzer'); ok('qurilma nomi User-Agent dan');
  assert.ok(SCHEMA_VERSION >= 2); ok('sxema versiyasi bor');
  const d1 = new Client(); const d2 = new Client();
  await d1.call('POST', '/api/register', { username: 'qurilma_sinov', password: 'qurilma-parol-1' }, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537' });
  await d2.call('POST', '/api/login', { username: 'qurilma_sinov', password: 'qurilma-parol-1' }, { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604' });
  const sr = await d1.call('GET', '/api/sessions');
  assert.equal(sr.data.sessions.length, 2);
  assert.equal(sr.data.sessions.filter((x) => x.current).length, 1);
  assert.ok(sr.data.sessions.some((x) => x.device === 'Safari · iOS')); ok("qurilmalar ro'yxati, joriysi belgilangan");
  assert.ok(!JSON.stringify(sr.data).includes('token'));
  const other = sr.data.sessions.find((x) => !x.current);
  assert.equal((await new Client().call('GET', '/api/sessions')).status, 401);
  assert.equal((await d1.call('DELETE', '/api/sessions/' + other.id)).status, 200);
  assert.equal((await d2.call('GET', '/api/me')).status, 401); ok('boshqa qurilmani uzish ishlaydi');
  assert.equal((await d1.call('DELETE', '/api/sessions/' + other.id)).status, 404); ok("qayta uzib bo'lmaydi (404)");
  const stranger = new Client();
  await stranger.call('POST', '/api/register', { username: 'begona_sinov', password: 'begona-parol-1' });
  const mine = (await stranger.call('GET', '/api/sessions')).data.sessions[0];
  assert.equal((await d1.call('DELETE', '/api/sessions/' + mine.id)).status, 404);
  assert.equal((await stranger.call('GET', '/api/me')).status, 200); ok("birovning qurilmasini uzib bo'lmaydi");
}

console.log(`\n${passed} ta tekshiruv o'tdi`);
server.close();
process.exit(0);
