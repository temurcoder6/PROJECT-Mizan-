import assert from 'node:assert/strict';

// Mizan Pro: pro_until hisobi, sinov (demo) tugmasi, to'lov yo'naltirish, admin, referal qoidalari.

process.env.DB_PATH = ':memory:';
process.env.STATIC_DIR = new URL('./nonexistent', import.meta.url).pathname;
process.env.ADMIN_USERNAMES = 'boss_admin';
delete process.env.DEMO_PAYMENTS;
for (const n of ['PAYME', 'CLICK', 'UZUM']) delete process.env[`PAYMENT_PROVIDER_URL_${n}`];

const srv = await import('./server.mjs');
const { server, db, limiters, extendPro, proActive, SCHEMA_VERSION } = srv;
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

class Client {
  cookie = '';
  async call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
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
const DAY = 86400000;
const near = (iso, ms, tol = 5000) => Math.abs(Date.parse(iso) - ms) < tol;
const resetLimits = () => { for (const m of Object.values(limiters)) m.clear(); };

let n = 0;
async function newUser(name) {
  resetLimits();
  const c = new Client();
  const r = await c.call('POST', '/api/register', { username: name || `pro_user_${++n}`, password: 'maxfiyparol1' });
  assert.equal(r.status, 201);
  c.id = r.data.user.id;
  return c;
}

// ---------- pro_until hisobi ----------
assert.ok(SCHEMA_VERSION >= 6); ok('sxema versiyasi 6+ (pro_until migratsiyasi)');

const u1 = await newUser();
let me = (await u1.call('GET', '/api/me')).data.user;
assert.equal(me.isPro, false); assert.equal(me.proUntil, null); ok("yangi hisob bepul: isPro=false, proUntil=null");

assert.equal(proActive(null), false);
assert.equal(proActive(new Date(Date.now() - 1000).toISOString()), false);
assert.equal(proActive(new Date(Date.now() + 60000).toISOString()), true);
assert.equal(proActive('yaroqsiz-sana'), false); ok('proActive: null, o\'tgan, kelajak, yaroqsiz sana');

let until = extendPro(u1.id, 30);
assert.ok(near(until, Date.now() + 30 * DAY));
me = (await u1.call('GET', '/api/me')).data.user;
assert.equal(me.isPro, true); assert.equal(me.proUntil, until); ok("extendPro: bepuldan +30 kun, /api/me isPro=true");

const until2 = extendPro(u1.id, 30);
assert.ok(near(until2, Date.parse(until) + 30 * DAY, 50)); ok("faol Pro ustiga qo'shiladi (60 kunga yaqin)");

db.prepare('UPDATE users SET pro_until = ? WHERE id = ?').run(new Date(Date.now() - 5 * DAY).toISOString(), u1.id);
assert.equal((await u1.call('GET', '/api/me')).data.user.isPro, false); ok('muddati o\'tgan Pro endi faol emas');
const until3 = extendPro(u1.id, 7);
assert.ok(near(until3, Date.now() + 7 * DAY)); ok("muddati o'tgan Pro hozirdan boshlab uzayadi");

// Mijoz o'zini Pro qila olmaydi: profilga isPro yozish serverda hech narsani o'zgartirmaydi.
const guest = await newUser();
const put = await guest.call('PUT', '/api/data', { baseRevision: 0, transactions: [], debts: [], goals: [], cards: [], profile: { isPro: true, proUntil: '2099-01-01T00:00:00.000Z' } });
assert.equal(put.status, 200);
assert.equal((await guest.call('GET', '/api/me')).data.user.isPro, false);
assert.equal((await guest.call('GET', '/api/data')).data.profile.isPro, undefined); ok("PUT /api/data orqali Pro olib bo'lmaydi");

// ---------- sinov (demo) tugmasi ----------
const d = await newUser();
assert.equal((await new Client().call('GET', '/api/pro/options')).data.demo, false);
assert.equal((await d.call('POST', '/api/pro/demo', {})).status, 404);
assert.equal((await d.call('GET', '/api/me')).data.user.isPro, false); ok("DEMO_PAYMENTS yo'q: /api/pro/demo 404 va Pro berilmaydi");

process.env.DEMO_PAYMENTS = '1';
assert.equal((await new Client().call('GET', '/api/pro/options')).data.demo, true);
assert.equal((await new Client().call('POST', '/api/pro/demo', {})).status, 401); ok('DEMO_PAYMENTS=1: kirmagan foydalanuvchi 401');
let r = await d.call('POST', '/api/pro/demo', {});
assert.equal(r.status, 200); assert.equal(r.data.days, 7);
assert.equal(r.data.user.isPro, true); assert.ok(near(r.data.user.proUntil, Date.now() + 7 * DAY)); ok('sinov: serverda pro_until = +7 kun');
const first = (await d.call('GET', '/api/me')).data.user.proUntil;
r = await d.call('POST', '/api/pro/demo', {});
assert.equal(r.status, 409);
assert.equal((await d.call('GET', '/api/me')).data.user.proUntil, first); ok('sinov bir foydalanuvchi uchun bir marta');
delete process.env.DEMO_PAYMENTS;
assert.equal((await (await newUser()).call('POST', '/api/pro/demo', {})).status, 404); ok('env olib tashlansa sinov yana o\'chadi');

// ---------- to'lov yo'naltirish (karta so'ralmaydi) ----------
const pay = await newUser();
r = await pay.call('POST', '/api/pro/checkout', { plan: 'monthly', provider: 'payme' });
assert.equal(r.status, 503); ok("provayder URL yo'q: to'lov usuli o'chiq (503)");
process.env.PAYMENT_PROVIDER_URL_PAYME = 'https://checkout.example.test/pay';
process.env.PAYMENT_PROVIDER_URL_CLICK = 'http://example.test/insecure';
const opts = (await new Client().call('GET', '/api/pro/options')).data;
assert.equal(opts.providers.payme, true); assert.equal(opts.providers.click, false); assert.equal(opts.providers.uzum, false);
assert.deepEqual(opts.plans, { monthly: { amount: 19000, days: 30 }, yearly: { amount: 149000, days: 365 } });
assert.ok(!JSON.stringify(opts).includes('example.test')); ok("options: faqat yoqilgan usullar; URL va http (xavfsiz emas) ko'rsatilmaydi");
assert.equal((await new Client().call('POST', '/api/pro/checkout', { plan: 'monthly', provider: 'payme' })).status, 401);
assert.equal((await pay.call('POST', '/api/pro/checkout', { plan: 'haftalik', provider: 'payme' })).status, 400);
assert.equal((await pay.call('POST', '/api/pro/checkout', { plan: 'monthly', provider: 'paypal' })).status, 400);
assert.equal((await pay.call('POST', '/api/pro/checkout', { plan: 'monthly', provider: 'click' })).status, 503);
assert.equal((await pay.call('POST', '/api/pro/checkout', { plan: 'monthly', provider: 'payme', cardNumber: '8600123412341234' })).status, 400);
assert.equal((await pay.call('POST', '/api/pro/checkout', { plan: 'monthly', provider: 'payme', cvv: '123' })).status, 400); ok("noto'g'ri tarif/usul va karta maydonlari rad etiladi");
r = await pay.call('POST', '/api/pro/checkout', { plan: 'yearly', provider: 'payme' });
assert.equal(r.status, 200);
const target = new URL(r.data.url);
assert.equal(target.origin, 'https://checkout.example.test');
assert.equal(target.searchParams.get('plan'), 'yearly'); assert.equal(target.searchParams.get('amount'), '149000');
assert.equal(target.searchParams.get('order_id'), r.data.orderId);
const order = db.prepare('SELECT * FROM pro_orders WHERE id = ?').get(r.data.orderId);
assert.equal(order.status, 'pending'); assert.equal(order.amount, 149000);
assert.deepEqual(Object.keys(order).sort(), ['amount', 'created_at', 'id', 'plan', 'provider', 'status', 'user_id']);
assert.equal((await pay.call('GET', '/api/me')).data.user.isPro, false); ok("provayderga yo'naltiradi, buyurtma 'pending'; to'lovsiz Pro berilmaydi, karta maydoni yo'q");
delete process.env.PAYMENT_PROVIDER_URL_PAYME;
delete process.env.PAYMENT_PROVIDER_URL_CLICK;

// ---------- admin: Pro berish / olish ----------
const target1 = await newUser();
const regular = await newUser();
const boss = await newUser('boss_admin');
assert.equal((await regular.call('POST', '/api/admin/users/pro', { userId: target1.id, action: 'grant', days: 30 })).status, 403);
assert.equal((await new Client().call('POST', '/api/admin/users/pro', { userId: target1.id, action: 'grant' })).status, 401); ok("admin bo'lmagan Pro bera olmaydi");
r = await boss.call('POST', '/api/admin/users/pro', { userId: target1.id, action: 'grant', days: 45 });
assert.equal(r.status, 200); assert.equal(r.data.user.isPro, true); assert.ok(near(r.data.user.proUntil, Date.now() + 45 * DAY));
assert.equal((await boss.call('POST', '/api/admin/users/pro', { userId: target1.id, action: 'xato' })).status, 400);
assert.equal((await boss.call('POST', '/api/admin/users/pro', { userId: 999999, action: 'grant' })).status, 404);
const list = (await boss.call('GET', '/api/admin/users?q=pro_user')).data.users;
assert.equal(list.find((x) => x.id === target1.id).isPro, true); ok("admin Pro beradi, ro'yxatda ko'rinadi");
r = await boss.call('POST', '/api/admin/users/pro', { userId: target1.id, action: 'revoke' });
assert.equal(r.data.user.isPro, false); assert.equal(r.data.user.proUntil, null);
assert.equal((await target1.call('GET', '/api/me')).data.user.isPro, false); ok('admin Pro ni oladi');

// ---------- referal ----------
const A = await newUser('ref_taklif_qiluvchi');
const codeRes = (await A.call('GET', '/api/referral')).data;
assert.match(codeRes.code, /^[A-Z0-9]{8}$/);
assert.equal((await A.call('GET', '/api/referral')).data.code, codeRes.code);
assert.equal(codeRes.invited, 0);
assert.equal((await new Client().call('GET', '/api/referral')).status, 401); ok('har foydalanuvchida barqaror 8 belgili ref_code');

assert.equal((await A.call('POST', '/api/referral/claim', { code: codeRes.code })).status, 400); ok("o'z kodini ishlata olmaydi");
const B = await newUser();
assert.equal((await B.call('POST', '/api/referral/claim', { code: 'ABC' })).status, 400);
assert.equal((await B.call('POST', '/api/referral/claim', { code: 'ZZZZZZZZ' })).status, 404);
assert.equal((await new Client().call('POST', '/api/referral/claim', { code: codeRes.code })).status, 401); ok("noto'g'ri, noma'lum kod va kirmagan foydalanuvchi rad etiladi");

r = await B.call('POST', '/api/referral/claim', { code: codeRes.code.toLowerCase() });
assert.equal(r.status, 200); assert.equal(r.data.days, 30);
assert.equal(r.data.user.isPro, true); assert.ok(near(r.data.user.proUntil, Date.now() + 30 * DAY));
assert.ok(!JSON.stringify(r.data).includes('ref_taklif_qiluvchi')); // taklif qilgan odam ko'rsatilmaydi
const aMe = (await A.call('GET', '/api/me')).data.user;
assert.equal(aMe.isPro, true); assert.ok(near(aMe.proUntil, Date.now() + 30 * DAY));
const aRef = (await A.call('GET', '/api/referral')).data;
assert.equal(aRef.invited, 1); assert.equal(aRef.rewardedThisMonth, 1);
assert.deepEqual(Object.keys(aRef).sort(), ['bonusDays', 'code', 'invited', 'joinedViaInvite', 'monthlyMax', 'rewardedThisMonth']); // shaxsiy ma'lumot yo'q
assert.equal((await B.call('GET', '/api/referral')).data.joinedViaInvite, true); ok("do'st hisob ochgach ikkala tomonga +30 kun, shaxsiy ma'lumot oshkor bo'lmaydi");

r = await B.call('POST', '/api/referral/claim', { code: codeRes.code });
assert.equal(r.status, 409);
assert.ok(near((await B.call('GET', '/api/me')).data.user.proUntil, Date.now() + 30 * DAY)); ok('bir hisob ikkinchi marta bonus ololmaydi');

// A endi B ning kodidan foydalanib "o'zaro" bonus yig'a olmaydi
const bCode = (await B.call('GET', '/api/referral')).data.code;
assert.equal((await A.call('POST', '/api/referral/claim', { code: bCode })).status, 409); ok("o'zaro taklif (A→B, B→A) rad etiladi");

// Eski hisob (yangi emas) bonus ola olmaydi
const old = await newUser();
db.prepare('UPDATE users SET created_at = ? WHERE id = ?').run(Date.now() - 10 * DAY, old.id);
assert.equal((await old.call('POST', '/api/referral/claim', { code: codeRes.code })).status, 403);
assert.equal((await old.call('GET', '/api/me')).data.user.isPro, false); ok('faqat yangi hisob uchun (eski hisob 403)');

// Bir IP dan kuniga cheklangan miqdor (standart: 3). B bitta ishlatdi: yana 2 ta o'tadi, 3-si 429.
resetLimits();
db.prepare("DELETE FROM referrals WHERE referee_id != ?").run(B.id);
db.prepare('UPDATE referrals SET ip_hash = ? WHERE referee_id = ?').run('boshqa-ip', B.id);
const ipUsers = [];
for (let i = 0; i < 4; i++) ipUsers.push(await newUser());
const statuses = [];
for (const c of ipUsers) {
  statuses.push((await c.call('POST', '/api/referral/claim', { code: codeRes.code })).status);
}
assert.deepEqual(statuses, [200, 200, 200, 429]); ok('bir IP dan kuniga 3 ta bonusdan ko\'pi 429');
assert.equal((await ipUsers[3].call('GET', '/api/me')).data.user.isPro, false);

// Oyiga eng ko'pi bilan 12 ta mukofot: 12 tasi bor bo'lsa, do'st oladi, taklif qiluvchi ortiqcha kun olmaydi.
process.env.REFERRAL_IP_DAILY = '100';
const R = await newUser('ref_limit_egasi');
const rCode = (await R.call('GET', '/api/referral')).data.code;
const insRef = db.prepare('INSERT INTO referrals (referrer_id, referee_id, ip_hash, rewarded, created_at) VALUES (?, ?, ?, 1, ?)');
for (let i = 0; i < 12; i++) insRef.run(R.id, 900000 + i, `fake${i}`, Date.now() - i * 1000);
const X = await newUser();
r = await X.call('POST', '/api/referral/claim', { code: rCode });
assert.equal(r.status, 200); assert.equal(r.data.user.isPro, true);
const rMe = (await R.call('GET', '/api/me')).data.user;
assert.equal(rMe.isPro, false); assert.equal(rMe.proUntil, null);
const rRef = (await R.call('GET', '/api/referral')).data;
assert.equal(rRef.rewardedThisMonth, 12); assert.equal(rRef.invited, 13); ok("oyiga 12 ta mukofot chegarasi: do'st oladi, taklif qiluvchi ortiqcha kun olmaydi");

// 30 kundan eski mukofotlar hisobga olinmaydi
db.prepare('UPDATE referrals SET created_at = ? WHERE referrer_id = ? AND referee_id = 900000').run(Date.now() - 40 * DAY, R.id);
const Y = await newUser();
r = await Y.call('POST', '/api/referral/claim', { code: rCode });
assert.equal(r.status, 200);
assert.equal((await R.call('GET', '/api/me')).data.user.isPro, true); ok("30 kundan eski mukofotlar chegaraga kirmaydi");

delete process.env.REFERRAL_IP_DAILY;

// Taxmin qilib topishga urinish: bir IP dan soatiga 20 tadan ko'p urinish yo'q
resetLimits();
const brute = await newUser();
resetLimits();
let last = 0;
for (let i = 0; i < 21; i++) last = (await brute.call('POST', '/api/referral/claim', { code: 'QWERTY' + (10 + i) })).status;
assert.equal(last, 429); ok("kodni terib topishga urinishlar cheklanadi (429)");

console.log(`\n${passed} ta tekshiruv o'tdi`);
server.close();
process.exit(0);
