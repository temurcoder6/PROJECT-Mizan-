import assert from 'node:assert/strict';
import http from 'node:http';

process.env.DB_PATH = ':memory:';
process.env.STATIC_DIR = new URL('./nonexistent', import.meta.url).pathname;
process.env.TRUST_PROXY = '1';
const srv = await import('./server.mjs');
await new Promise((r) => srv.server.listen(0, '127.0.0.1', r));
const port = srv.server.address().port;

const post = (p, body, xff) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'POST', headers: { 'Content-Type': 'application/json', ...(xff ? { 'X-Forwarded-For': xff } : {}) } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });

let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ' + name); };

// 12 ta turli hakam (turli manzil) ro'yxatdan o'ta oladi, hammasi bir proksi orqali kelsa ham
for (let i = 1; i <= 12; i++) {
  assert.equal(await post('/api/register', { username: `hakam_${i}`, password: `hakam-parol-${i}x` }, `203.0.113.${i}`), 201);
}
ok("proksi orqali kelgan 12 ta turli foydalanuvchi ro'yxatdan o'ta oladi (har birining o'z manzili bo'yicha)");

// bitta manzildan 10 tadan ko'pi bo'lmaydi
let blocked = 0;
for (let i = 1; i <= 12; i++) {
  if ((await post('/api/register', { username: `spam_${i}`, password: `spam-parol-${i}x` }, '198.51.100.7')) === 429) blocked++;
}
assert.ok(blocked >= 2); ok('bir manzildan ommaviy ro\'yxatdan o\'tish baribir cheklanadi');

console.log(`\n${passed} ta tekshiruv o'tdi`);
srv.server.close();
process.exit(0);
