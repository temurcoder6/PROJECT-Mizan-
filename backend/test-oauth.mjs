import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Google va GitHub OAuth 2.0 oqimi, PKCE/state himoyasi, hisob ulash va Range static xizmati testlari.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mizan-oauth-'));
fs.mkdirSync(path.join(tmp, 'dist', 'assets'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'dist', 'index.html'), '<html>Mizan</html>');
fs.writeFileSync(path.join(tmp, 'dist', 'tanitish.mp4'), '0123456789ABCDEF');
fs.writeFileSync(path.join(tmp, 'dist', 'assets', 'test.woff2'), 'WOFF2DATA');

process.env.DB_PATH = ':memory:';
process.env.STATIC_DIR = path.join(tmp, 'dist');

const srv = await import('./server.mjs');
await new Promise((r) => srv.server.listen(0, '127.0.0.1', r));
const port = srv.server.address().port;
const base = `http://127.0.0.1:${port}`;

// Soxta Google va GitHub OAuth provayder serveri
const codes = new Map();
let lastGoogleAuth = null;
const mockProvider = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'POST' && url.pathname === '/google/token') {
    let raw = '';
    for await (const c of req) raw += c;
    const params = new URLSearchParams(raw);
    const entry = codes.get(params.get('code'));
    if (!entry || params.get('client_id') !== 'g-id' || params.get('client_secret') !== 'g-sec') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'invalid_grant' }));
    }
    const expected = crypto.createHash('sha256').update(params.get('code_verifier') || '').digest('base64url');
    if (expected !== entry.challenge) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'pkce_mismatch' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ access_token: `tok-${entry.sub}` }));
  }
  if (req.method === 'GET' && url.pathname === '/google/user') {
    const sub = String(req.headers.authorization || '').replace('Bearer tok-', '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ sub, email: `${sub}@gmail.com`, name: sub }));
  }
  if (req.method === 'POST' && url.pathname === '/github/token') {
    let raw = '';
    for await (const c of req) raw += c;
    const params = new URLSearchParams(raw);
    const entry = codes.get(params.get('code'));
    if (!entry || params.get('client_id') !== 'gh-id' || params.get('client_secret') !== 'gh-sec') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'bad_verification_code' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ access_token: `gh-${entry.id}` }));
  }
  if (req.method === 'GET' && url.pathname === '/github/user') {
    const id = String(req.headers.authorization || '').replace('Bearer gh-', '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ id: Number(id), login: id === '101' ? 'temur' : `gh_${id}`, email: null }));
  }
  if (req.method === 'GET' && url.pathname === '/github/emails') {
    const id = String(req.headers.authorization || '').replace('Bearer gh-', '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify([{ email: `u${id}@users.noreply.github.com`, primary: true, verified: true }]));
  }
  res.writeHead(404);
  res.end();
});
await new Promise((r) => mockProvider.listen(0, '127.0.0.1', r));
const mBase = `http://127.0.0.1:${mockProvider.address().port}`;
srv.OAUTH_ENDPOINTS.google = { auth: `${mBase}/google/auth`, token: `${mBase}/google/token`, user: `${mBase}/google/user` };
srv.OAUTH_ENDPOINTS.github = { auth: `${mBase}/github/auth`, token: `${mBase}/github/token`, user: `${mBase}/github/user`, emails: `${mBase}/github/emails` };

class Client {
  cookies = new Map();
  saveCookies(res) {
    for (const raw of res.headers.getSetCookie?.() || []) {
      const [nv, ...attrs] = raw.split(';').map((x) => x.trim());
      const eq = nv.indexOf('=');
      const name = nv.slice(0, eq);
      const val = nv.slice(eq + 1);
      if (!val || attrs.some((a) => /^Max-Age=0$/i.test(a))) this.cookies.delete(name);
      else this.cookies.set(name, val);
    }
  }
  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async req(method, p, body) {
    const c = this.cookieHeader();
    const res = await fetch(base + p, {
      method,
      redirect: 'manual',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(c ? { Cookie: c } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    this.saveCookies(res);
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, data, location: res.headers.get('location') || '' };
  }
}

let passed = 0;
const ok = (name) => {
  passed++;
  console.log('  ok  ' + name);
};

// 1. Kalit yo'q holatda demo o'chiq (real rejim), keyin test uchun ENABLE_DEMO_AUTH=1 yoqiladi
let r = await new Client().req('GET', '/api/auth/providers');
assert.deepEqual(r.data, { google: false, github: false, demo: false });
assert.equal((await new Client().req('POST', '/api/auth/demo', { provider: 'google' })).status, 403);
process.env.ENABLE_DEMO_AUTH = '1';
r = await new Client().req('GET', '/api/auth/providers');
assert.deepEqual(r.data, { google: false, github: false, demo: true });
r = await new Client().req('GET', '/api/auth/google');
assert.equal(r.status, 302);
assert.match(r.location, /oauth_error=not_configured&provider=google#\/kirish/);
ok("kalitsiz holatda demo o'chiq va OAuth halol 'sozlanmagan' qaytaradi");

const demoCli = new Client();
r = await demoCli.req('POST', '/api/auth/demo', { provider: 'google' });
assert.equal(r.status, 200);
assert.equal(r.data.demo, true);
assert.equal(r.data.user.username, 'demo_google');
assert.equal((await demoCli.req('GET', '/api/me')).data.user.username, 'demo_google');
ok('lokal demo kirish (Google) kalitsiz ishlaydi');

// Kartalar (faqat oxirgi 4 raqam saqlanadi, CVV va to\'liq raqam kesiladi)
await demoCli.req('PUT', '/api/data', {
  baseRevision: 0,
  cards: [{ id: 'c1', label: 'Uzcard', network: 'uzcard', last4: '8600123456784812', balance: 500000, cvv: '999', createdAt: 1 }],
});
const gotCards = (await demoCli.req('GET', '/api/data')).data.cards;
assert.equal(gotCards.length, 1);
assert.equal(gotCards[0].last4, '4812');
assert.equal(gotCards[0].cvv, undefined); ok("kartada faqat oxirgi 4 raqam saqlanadi (CVV va to'liq raqam olinmaydi)");

// Kalitlarni yoqamiz
process.env.GOOGLE_CLIENT_ID = 'g-id';
process.env.GOOGLE_CLIENT_SECRET = 'g-sec';
process.env.GITHUB_CLIENT_ID = 'gh-id';
process.env.GITHUB_CLIENT_SECRET = 'gh-sec';

r = await new Client().req('GET', '/api/auth/providers');
assert.deepEqual(r.data, { google: true, github: true, demo: true }); ok('provayderlar holati ko\'rinadi');

// 2. Google OAuth + PKCE + yangi hisob ochish
const g1 = new Client();
r = await g1.req('GET', '/api/auth/google?next=%23bosh');
assert.equal(r.status, 302);
const authUrl = new URL(r.location);
const state1 = authUrl.searchParams.get('state');
const challenge1 = authUrl.searchParams.get('code_challenge');
assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
assert.ok(state1 && challenge1);
lastGoogleAuth = { state: state1, challenge: challenge1 };

// CSRF: noto'g'ri state rad etiladi
const bad = new Client();
r = await bad.req('GET', `/api/auth/google/callback?code=x&state=${state1}`);
assert.equal(r.status, 302);
assert.match(r.location, /oauth_error=invalid_state/);
assert.equal((await bad.req('GET', '/api/me')).status, 401); ok("cookie'siz/begona state bilan OAuth callback rad etiladi (CSRF)");

// Haqiqiy callback
codes.set('gcode1', { sub: 'ali_google', challenge: lastGoogleAuth.challenge });
r = await g1.req('GET', `/api/auth/google/callback?code=gcode1&state=${state1}`);
assert.equal(r.status, 302);
assert.ok(r.location.endsWith('/#bosh'));
const me1 = await g1.req('GET', '/api/me');
assert.equal(me1.status, 200);
assert.equal(me1.data.user.username, 'ali_google');
assert.equal(me1.data.user.hasPassword, false);
assert.equal(me1.data.user.oauth[0].provider, 'google'); ok("Google orqali yangi hisob ochiladi va sessiya boshlanadi");

// Bir martalik state qayta ishlamaydi
r = await g1.req('GET', `/api/auth/google/callback?code=gcode1&state=${state1}`);
assert.match(r.location, /oauth_error=invalid_state/); ok('OAuth state bir martalik (qayta ishlamaydi)');

// Yozuv saqlaymiz va qayta Google bilan kirganda o'sha hisobga tushishini tekshiramiz
await g1.req('PUT', '/api/data', { baseRevision: 0, transactions: [{ id: 'tx1', type: 'expense', title: 'non', amount: 5000, category: 'oziq', date: '2026-11-26', method: 'naqd', planned: true, note: '', createdAt: 1 }] });
const g2 = new Client();
r = await g2.req('GET', '/api/auth/google');
const u2 = new URL(r.location);
codes.set('gcode2', { sub: 'ali_google', challenge: u2.searchParams.get('code_challenge') });
r = await g2.req('GET', `/api/auth/google/callback?code=gcode2&state=${u2.searchParams.get('state')}`);
assert.equal((await g2.req('GET', '/api/data')).data.transactions.length, 1); ok('qayta Google bilan kirganda eski hisob va ma\'lumot qaytadi');

// 3. Oxirgi kirish usulini uzish taqiqlanadi; parol o'rnatish ishlaydi
r = await g2.req('DELETE', '/api/auth/oauth/google');
assert.equal(r.status, 400); ok('parolsiz hisobdan oxirgi OAuth usulini uzib bo\'lmaydi');

r = await g2.req('POST', '/api/password', { newPassword: 'yangi-kuchli-parol1' });
assert.equal(r.status, 200);
assert.ok(r.data.recoveryCode);
assert.equal(r.data.user.hasPassword, true); ok("OAuth foydalanuvchi parol va tiklash kodini qo'sha oladi");

const gPass = new Client();
assert.equal((await gPass.req('POST', '/api/login', { username: 'ali_google', password: 'yangi-kuchli-parol1' })).status, 200); ok("o'rnatilgan parol bilan oddiy kirish ishlaydi");

// Endi Google ulanishini uzsa bo'ladi (chunki parol bor)
assert.equal((await gPass.req('DELETE', '/api/auth/oauth/google')).status, 200);
assert.equal((await gPass.req('GET', '/api/me')).data.user.oauth.length, 0); ok('parol bo\'lganda Google ulanishini uzish mumkin');

// 4. GitHub OAuth + nom to'qnashuvi + kirilgan hisobga ulash
const pwdUser = new Client();
await pwdUser.req('POST', '/api/register', { username: 'temur', password: 'temur-parol-123' });

const gh = new Client();
r = await gh.req('GET', '/api/auth/github');
const ghState = new URL(r.location).searchParams.get('state');
codes.set('ghcode1', { id: 101 });
r = await gh.req('GET', `/api/auth/github/callback?code=ghcode1&state=${ghState}`);
assert.ok(r.location.endsWith('/#bosh'));
const ghMe = (await gh.req('GET', '/api/me')).data.user;
assert.notEqual(ghMe.username, 'temur');
assert.match(ghMe.username, /^temur_/);
assert.equal(ghMe.oauth[0].email, 'u101@users.noreply.github.com'); ok('GitHub OAuth nom to\'qnashuvini hal qiladi va private emailni oladi');

// Kirilgan foydalanuvchi o'z hisobiga yangi GitHub hisobini ulaydi
r = await pwdUser.req('GET', '/api/auth/github?next=%23sozlamalar');
const linkState = new URL(r.location).searchParams.get('state');
codes.set('ghcode2', { id: 202 });
r = await pwdUser.req('GET', `/api/auth/github/callback?code=ghcode2&state=${linkState}`);
assert.match(r.location, /oauth=linked&provider=github#\/?sozlamalar/);
assert.equal((await pwdUser.req('GET', '/api/me')).data.user.oauth[0].provider, 'github'); ok('kirilgan hisobga GitHub ulanadi');

// Boshqa foydalanuvchi ulangan GitHub ID ni ololmaydi
const thief = new Client();
await thief.req('POST', '/api/register', { username: 'boshqa_1', password: 'boshqa-parol-123' });
r = await thief.req('GET', '/api/auth/github');
const thiefState = new URL(r.location).searchParams.get('state');
codes.set('ghcode3', { id: 202 });
r = await thief.req('GET', `/api/auth/github/callback?code=ghcode3&state=${thiefState}`);
assert.match(r.location, /oauth_error=already_linked/); ok('boshqa hisobga ulangan GitHub hisobini olib bo\'lmaydi');

// 5. OAuth-only hisobni nom tasdig'i bilan o'chirish
assert.equal((await gh.req('DELETE', '/api/account', { confirmUsername: 'xato' })).status, 400);
assert.equal((await gh.req('DELETE', '/api/account', { confirmUsername: ghMe.username })).status, 200);
assert.equal((await gh.req('GET', '/api/me')).status, 401); ok("parolsiz OAuth hisobini nom tasdig'i bilan o'chirish ishlaydi");

// 6. Static MIME va HTTP Range (video/woff2)
const mp4 = await fetch(`${base}/tanitish.mp4`, { headers: { Range: 'bytes=0-5' } });
assert.equal(mp4.status, 206);
assert.equal(mp4.headers.get('content-type'), 'video/mp4');
assert.equal(mp4.headers.get('content-range'), 'bytes 0-5/16');
assert.equal(await mp4.text(), '012345'); ok('video (.mp4) uchun 206 Partial Content va Range ishlaydi');

const badRange = await fetch(`${base}/tanitish.mp4`, { headers: { Range: 'bytes=999-1000' } });
assert.equal(badRange.status, 416); ok("noto'g'ri Range 416 qaytaradi");

const font = await fetch(`${base}/assets/test.woff2`);
assert.equal(font.headers.get('content-type'), 'font/woff2'); ok('.woff2 MIME turi to\'g\'ri');

// 7. Admin rol va ruxsat nazorati
assert.equal((await pwdUser.req('GET', '/api/me')).data.user.isAdmin, false);
assert.equal((await pwdUser.req('GET', '/api/admin/overview')).status, 403);
assert.equal((await pwdUser.req('GET', '/api/admin/tickets')).status, 403);
ok("oddiy foydalanuvchi admin API ga kira olmaydi (403)");

process.env.ADMIN_USERNAMES = 'temur';
assert.equal((await pwdUser.req('GET', '/api/me')).data.user.isAdmin, true);
const sup = await pwdUser.req('POST', '/api/support', { category: 'taklif', message: 'Admin panel tekshiruvi uchun murojaat' });
assert.equal(sup.status, 201);
const ov = await pwdUser.req('GET', '/api/admin/overview');
assert.equal(ov.status, 200);
assert.ok(ov.data.counts.users >= 1);
assert.equal(ov.data.transactions, undefined);
const tk = await pwdUser.req('GET', '/api/admin/tickets');
assert.equal(tk.status, 200);
assert.ok(tk.data.tickets.some((x) => x.id === sup.data.id));
assert.equal((await pwdUser.req('POST', '/api/admin/tickets/reply', { id: sup.data.id, reply: 'Rahmat, ko\'rib chiqildi', status: 'answered' })).status, 200);
ok('administrator tizim holati va murojaatlarni boshqara oladi');

console.log(`\n${passed} ta OAuth, Admin va Range tekshiruvi o'tdi`);
mockProvider.close();
srv.server.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
