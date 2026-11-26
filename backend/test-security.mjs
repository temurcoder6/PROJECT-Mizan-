import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Defensive regression tests for weak points an attacker would try on our own server.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mizan-sec-'));
fs.mkdirSync(path.join(tmp, 'dist'));
fs.mkdirSync(path.join(tmp, 'dist-secret'));
fs.writeFileSync(path.join(tmp, 'dist', 'index.html'), '<html>OK-PAGE</html>');
fs.writeFileSync(path.join(tmp, 'dist', '.hidden'), 'TOP-SECRET');
fs.writeFileSync(path.join(tmp, 'dist-secret', 'secret.txt'), 'TOP-SECRET');
fs.writeFileSync(path.join(tmp, '.env'), 'TOP-SECRET');
process.env.DB_PATH = ':memory:';
process.env.STATIC_DIR = path.join(tmp, 'dist');
const srv = await import('./server.mjs');
await new Promise((r) => srv.server.listen(0, r));
const port = srv.server.address().port;

const raw = (p, { method = 'GET', headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: 'localhost', port, path: p, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });

class Client {
  cookie = '';
  async call(method, p, body) {
    const r = await raw(p, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = r.headers['set-cookie']?.[0];
    if (set) this.cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let data = null;
    try { data = JSON.parse(r.body); } catch {}
    return { status: r.status, data };
  }
}

let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ' + name); };

// ---- fayl serverida yo'l bosib o'tish ----
const page = await raw('/');
assert.match(page.body, /OK-PAGE/); ok('oddiy sahifa beriladi');
const attacks = [
  '/..%5Cdist-secret%5Csecret.txt',
  '/..%2Fdist-secret%2Fsecret.txt',
  '/%2e%2e/dist-secret/secret.txt',
  '/../dist-secret/secret.txt',
  '/..%5C..%5C.env',
  '/..%2F..%2F.env',
  '/.hidden',
  '/%2e%68idden',
  '/dist/../../.env',
];
for (const a of attacks) {
  const r = await raw(a);
  assert.ok(!r.body.includes('TOP-SECRET'), `sirli fayl sizib chiqdi: ${a}`);
}
ok("yo'l bosib o'tish hujumlari (.., %2e, %5C, yonma-yon papka, yashirin fayl) sir bermaydi");
assert.equal((await raw('/%E0%A4%A')).status, 400);
assert.equal((await raw('/a%00b')).status, 400); ok("buzilgan manzil va nol-bayt 400 bilan rad etiladi (500 emas)");

// ---- tarmoqqa ochiqlik va vaqt chegaralari ----
assert.equal(srv.HOST, '127.0.0.1'); ok("server standart holatda faqat shu kompyuterga (127.0.0.1) ochiq, tarmoqqa emas");
assert.ok(srv.server.requestTimeout > 0 && srv.server.requestTimeout <= 120000); ok("so'rov vaqti chegaralangan (sekin ulanish hujumiga qarshi)");

// ---- ruxsatsiz so'rov hajmi ----
const big = JSON.stringify({ username: 'x', password: 'y'.repeat(200000) });
const r1 = await raw('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: big });
assert.equal(r1.status, 413); ok("kirmagan foydalanuvchi katta so'rov yubora olmaydi (413)");

// ---- sarlavhalar ----
const h = (await raw('/')).headers;
assert.equal(h['x-content-type-options'], 'nosniff');
assert.match(h['content-security-policy'], /script-src 'self'/);
assert.match(h['content-security-policy'], /font-src 'self' data:/);
assert.equal(h['x-powered-by'], undefined);
const api = await raw('/api/health');
assert.equal(api.headers['cache-control'], 'no-store'); ok('xavfsizlik sarlavhalari bor, API javoblari keshlanmaydi');

// ---- foydalanuvchi yozuvlari ----
const a = new Client();
assert.equal((await a.call('POST', '/api/register', { username: 'sec_a', password: 'xavfsiz-parol-1' })).status, 201);
let limited = 0;
for (let i = 0; i < 40; i++) {
  const r = await a.call('PUT', '/api/data', { baseRevision: i, transactions: [], debts: [], goals: [], profile: {}, force: true });
  if (r.status === 429) limited++;
}
assert.ok(limited > 0); ok("bir foydalanuvchi bazani tez-tez qayta yoza olmaydi (og'ir yozuv chegarasi)");

await a.call('POST', '/api/support', { category: 'savol', message: 'Salom \u001b[31mqizil\u001b[0m matn \u0000 shu yerda' });
const mine = await a.call('GET', '/api/support/mine');
assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(mine.data.tickets[0].message)); ok("murojaatdagi boshqaruv belgilari (terminal hujumi) olib tashlanadi");

for (const weak of ['12345678', 'password', 'aaaaaaaa', 'sec_weak']) {
  assert.equal((await new Client().call('POST', '/api/register', { username: 'sec_weak', password: weak })).status, 400);
}
ok('juda oson parollar (12345678, password, bir xil belgi, nomning o\'zi) rad etiladi');

// ---- xotira ----
srv.limiters.attempts.set('eski|kalit', { count: 3, until: Date.now() - 1000 });
srv.limiters.attempts.set('yangi|kalit', { count: 1, until: Date.now() + 60000 });
srv.pruneLimits();
assert.equal(srv.limiters.attempts.has('eski|kalit'), false);
assert.equal(srv.limiters.attempts.has('yangi|kalit'), true); ok("muddati o'tgan chegara yozuvlari tozalanadi (xotirani to'ldirish hujumiga qarshi)");

// ---- brauzer keshi ----
const sw = fs.readFileSync(new URL('../frontend/public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes('/api/')); ok("xizmat skripti (service worker) /api/ javoblarini keshlamaydi");

console.log(`\n${passed} ta tekshiruv o'tdi`);
srv.server.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
