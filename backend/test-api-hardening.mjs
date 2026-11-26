import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Granular Cards REST, JSON Export, ETag/304, calendar & payload validation, race safety, Admin users/backups, and Bot /kartalar tests.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mizan-hardening-'));
fs.mkdirSync(path.join(tmp, 'dist'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'dist', 'index.html'), '<html>Mizan Hardening</html>');

process.env.DB_PATH = path.join(tmp, 'pulim.db');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.STATIC_DIR = path.join(tmp, 'dist');
process.env.ADMIN_USERNAMES = 'boss_admin';
process.env.BOT_TOKEN = 'test-token';

const srv = await import('./server.mjs');
const { createBot } = await import('./bot.mjs');
await new Promise((r) => srv.server.listen(0, '127.0.0.1', r));
const port = srv.server.address().port;
const base = `http://127.0.0.1:${port}`;

const raw = (p, { method = 'GET', headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });

class Client {
  cookie = '';
  async call(method, p, body, extraHeaders = {}) {
    const r = await raw(p, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = r.headers['set-cookie']?.[0];
    if (set) this.cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let data = null;
    try {
      data = JSON.parse(r.body);
    } catch {}
    return { status: r.status, data, headers: r.headers, rawBody: r.body };
  }
}

let passed = 0;
const ok = (name) => {
  passed++;
  console.log('  ok  ' + name);
};

try {
  // 1. Health & Conditional ETag / 304
  const h = await new Client().call('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.data.ok, true);
  assert.equal(h.data.db, 'ok');
  assert.ok(h.data.schemaVersion >= 5);
  ok('/api/health batafsil baza va sxema holatini qaytaradi');

  const st1 = await raw('/');
  assert.equal(st1.status, 200);
  assert.ok(st1.headers.etag);
  const st2 = await raw('/', { headers: { 'If-None-Match': st1.headers.etag } });
  assert.equal(st2.status, 304);
  ok('statik server ETag va 304 Not Modified qo\'llaydi');

  // 2. Invalid Origin & malformed payload protection (no 500s)
  for (const badOrigin of ['null', 'not-a-url', 'http://evil.uz']) {
    const r = await raw('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: badOrigin },
      body: JSON.stringify({ username: 'x', password: 'y' }),
    });
    assert.equal(r.status, 403, `Origin=${badOrigin}`);
  }
  ok("noto'g'ri yoki null Origin 500 emas, 403 qaytaradi");

  const adminCli = new Client();
  assert.equal((await adminCli.call('POST', '/api/register', { username: 'boss_admin', password: 'admin-parol-2026' })).status, 201);

  assert.equal((await adminCli.call('PUT', '/api/data', null)).status, 400);
  assert.equal((await adminCli.call('PUT', '/api/data', [])).status, 400);
  assert.equal((await adminCli.call('PUT', '/api/data', { baseRevision: 'abc', transactions: [] })).status, 400);
  assert.equal((await adminCli.call('PUT', '/api/data', { baseRevision: -1, transactions: [] })).status, 400);
  ok("noto'g'ri /api/data tanasi va manfiy/NaN baseRevision 400 bilan rad etiladi");

  // 3. Calendar date sanitization (leap year ok, 2026-02-31 rejected)
  const dRes = await adminCli.call('PUT', '/api/data', {
    baseRevision: 0,
    transactions: [
      { id: 'leap', type: 'expense', title: 'Kabisa', amount: 10000, date: '2024-02-29', category: 'oziq' },
      { id: 'fake', type: 'expense', title: 'Soxta', amount: 10000, date: '2026-02-31', category: 'oziq' },
      { id: 'huge', type: 'expense', title: 'Katta', amount: 1e20, date: '2026-11-26', category: 'oziq' },
    ],
  });
  assert.equal(dRes.status, 200);
  const got = await adminCli.call('GET', '/api/data');
  assert.equal(got.data.transactions.length, 2);
  assert.equal(got.data.transactions.find((t) => t.id === 'fake'), undefined);
  assert.ok(got.data.transactions.find((t) => t.id === 'huge').amount <= 1e13);
  ok("haqiqiy kalendar sanalari tekshiriladi (2026-02-31 tashlanadi, kabisa qoladi)");

  // 4. Concurrent registration race -> never 500
  const race = await Promise.all([
    new Client().call('POST', '/api/register', { username: 'poyga_user', password: 'poyga-parol-123' }),
    new Client().call('POST', '/api/register', { username: 'poyga_user', password: 'poyga-parol-123' }),
    new Client().call('POST', '/api/register', { username: 'poyga_user', password: 'poyga-parol-123' }),
  ]);
  const statuses = race.map((r) => r.status).sort();
  assert.equal(statuses.filter((s) => s === 201).length, 1);
  assert.equal(statuses.filter((s) => s === 409).length, 2);
  ok('parallel bir xil nom bilan ro\'yxatdan o\'tish 500 emas, 201 + 409 beradi');

  // 5. Granular Cards REST API + secret field rejection + Export
  const u1 = new Client();
  assert.equal((await u1.call('POST', '/api/register', { username: 'karta_egasi', password: 'karta-parol-123' })).status, 201);

  assert.equal((await u1.call('POST', '/api/cards', { label: 'Bad', cvv: '999' })).status, 400);
  assert.equal((await u1.call('POST', '/api/cards', { label: 'Bad', pin: '1234' })).status, 400);
  assert.equal((await u1.call('POST', '/api/cards', { label: 'Bad', expiry: '12/28' })).status, 400);
  ok('maxfiy karta maydonlari (cvv, pin, expiry) /api/cards da 400 bilan rad etiladi');

  const c1 = await u1.call('POST', '/api/cards', { label: 'Asosiy Uzcard', network: 'uzcard', last4: '8600123456784812', balance: 650000 });
  assert.equal(c1.status, 201);
  assert.equal(c1.data.card.last4, '4812');
  assert.equal(c1.data.revision, 1);

  const c2 = await u1.call('POST', '/api/cards', { label: 'Naqd hamyon', network: 'naqd', balance: 150000 });
  assert.equal(c2.status, 201);
  assert.equal(c2.data.card.last4, '');
  assert.equal(c2.data.revision, 2);

  const listR = await u1.call('GET', '/api/cards');
  assert.equal(listR.data.cards.length, 2);

  const patchR = await u1.call('PATCH', `/api/cards/${c1.data.card.id}`, { balance: 700000, label: 'Ish haqi Uzcard' });
  assert.equal(patchR.status, 200);
  assert.equal(patchR.data.card.balance, 700000);
  assert.equal(patchR.data.revision, 3);

  assert.equal((await adminCli.call('DELETE', `/api/cards/${c1.data.card.id}`)).status, 404);
  assert.equal((await u1.call('DELETE', `/api/cards/${c2.data.card.id}`)).status, 200);
  ok('/api/cards CRUD (POST/GET/PATCH/DELETE) revizyani yangilaydi va begona hisobdan himoyalangan');

  const exp = await u1.call('GET', '/api/export');
  assert.equal(exp.status, 200);
  assert.match(exp.headers['content-disposition'], /attachment; filename="mizan-export-/);
  assert.equal(exp.data.cards.length, 1);
  assert.ok(!exp.rawBody.includes('pw_hash'));
  ok('/api/export to\'liq foydalanuvchi zaxirasini attachment sifatida beradi');

  // 6. Admin Users, Role toggle, and Backups API
  assert.equal((await u1.call('GET', '/api/admin/users')).status, 403);
  assert.equal((await u1.call('GET', '/api/admin/backups')).status, 403);
  assert.equal((await u1.call('POST', '/api/admin/backup', {})).status, 403);
  ok("oddiy foydalanuvchi admin users va backups API ga kira olmaydi (403)");

  const usersR = await adminCli.call('GET', '/api/admin/users?q=karta');
  assert.equal(usersR.status, 200);
  assert.equal(usersR.data.users.length, 1);
  assert.equal(usersR.data.users[0].username, 'karta_egasi');
  assert.equal(usersR.data.users[0].cardCount, 1);
  assert.equal(usersR.data.users[0].cards, undefined);
  ok('/api/admin/users qidiruv bilan xavfsiz metama\'lumot qaytaradi (balanssiz)');

  assert.equal((await adminCli.call('POST', '/api/admin/users/role', { username: 'boss_admin', isAdmin: false })).status, 400);
  assert.equal((await adminCli.call('POST', '/api/admin/users/role', { username: 'karta_egasi', isAdmin: true })).status, 200);
  assert.equal((await u1.call('GET', '/api/me')).data.user.isAdmin, true);
  assert.equal((await adminCli.call('POST', '/api/admin/users/role', { username: 'karta_egasi', isAdmin: false })).status, 200);
  assert.equal((await u1.call('GET', '/api/me')).data.user.isAdmin, false);
  ok('admin rol berish/olish va o\'zini tushirishdan himoya ishlaydi');

  const bk = await adminCli.call('POST', '/api/admin/backup', {});
  assert.equal(bk.status, 200);
  assert.match(bk.data.file, /^pulim-\d{12}\.db$/);
  assert.ok(bk.data.backups.length >= 1);
  ok('/api/admin/backup on-demand SQLite VACUUM INTO nusxasini yaratadi');

  // 7. Telegram Bot /kartalar & tick resilience
  const sent = [];
  let block901 = false;
  const bot = createBot({
    call: async (method, params) => {
      if (block901 && method === 'sendMessage' && String(params.chat_id) === '901') {
        throw new Error('403 Forbidden: bot was blocked');
      }
      sent.push({ method, ...params });
      return {};
    },
    today: () => '2026-11-26',
    clock: () => new Date('2026-11-26T21:30:00'),
  });
  const code = (await u1.call('POST', '/api/telegram/link', {})).data.code;
  await bot.handle({ update_id: 1, message: { chat: { id: 800, type: 'private' }, text: `/ulash ${code}` } });
  await bot.handle({ update_id: 2, message: { chat: { id: 800, type: 'private' }, text: '/kartalar' } });
  const cardMsg = sent.at(-1).text;
  assert.match(cardMsg, /Ish haqi Uzcard/);
  assert.match(cardMsg, /4812/);
  assert.match(cardMsg, /700 000/);
  ok('Telegram bot /kartalar buyrug\'i karta qoldig\'ini ko\'rsatadi');

  // Broken chat 901 must not stop reminder delivery to chat 800
  const brokenCode = (await adminCli.call('POST', '/api/telegram/link', {})).data.code;
  await bot.handle({ update_id: 3, message: { chat: { id: 901, type: 'private' }, text: `/ulash ${brokenCode}` } });
  await bot.handle({ update_id: 4, message: { chat: { id: 901, type: 'private' }, text: '/eslatma 21:00' } });
  await bot.handle({ update_id: 5, message: { chat: { id: 800, type: 'private' }, text: '/eslatma 21:00' } });
  block901 = true;
  const beforeTick = sent.length;
  await bot.tick();
  assert.ok(sent.slice(beforeTick).some((m) => String(m.chat_id) === '800'));
  ok('Telegram bot tick() bir foydalanuvchi xatosida boshqalarga eslatmani to\'xtatmaydi');

  console.log(`\n${passed} ta backend mustahkamlash tekshiruvi o'tdi`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  srv.server.close();
  try {
    srv.db.close();
  } catch {}
  fs.rmSync(tmp, { recursive: true, force: true });
}
