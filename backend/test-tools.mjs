// stats.mjs va restore.mjs: vaqtinchalik papkada, haqiqiy bazaga tegmasdan sinaladi.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mizan-tools-'));
const env = { ...process.env, DB_PATH: path.join(tmp, 'pulim.db'), BACKUP_DIR: path.join(tmp, 'backups'), PORT: '59998', BOT_TOKEN: '' };
const run = (file, ...args) => spawnSync(process.execPath, [path.join(here, file), ...args], { env, encoding: 'utf8' });

let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ' + name); };

try {
  // baza va bitta zaxira nusxa yaratamiz (server modulini ochib, backupNow chaqiramiz)
  const mk = spawnSync(process.execPath, ['-e', "const m = await import('./server.mjs'); console.log(m.backupNow()); process.exit(0)"], { cwd: here, env, encoding: 'utf8' });
  assert.equal(mk.status, 0, mk.stderr);
  const backups = fs.readdirSync(env.BACKUP_DIR).filter((f) => /^pulim-\d{12}\.db$/.test(f));
  assert.equal(backups.length, 1); ok('zaxira nusxa yaratildi');
  const name = backups[0];

  const st = run('stats.mjs');
  assert.equal(st.status, 0, st.stderr);
  assert.match(st.stdout, /Hisoblar\s+0/); ok('stats: bo\'sh bazani ko\'rsatadi');

  const list = run('restore.mjs');
  assert.equal(list.status, 0);
  assert.ok(list.stdout.includes(name)); ok("restore: zaxiralar ro'yxatini ko'rsatadi");

  const marker = fs.readFileSync(env.DB_PATH);
  const dry = run('restore.mjs', name);
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /--yes/);
  assert.deepEqual(fs.readFileSync(env.DB_PATH), marker); ok('restore: --yes bo\'lmasa hech narsa o\'zgarmaydi');

  for (const bad of ['../pulim.db', 'pulim-1.db', '..\\x.db', 'pulim-202611260000.db']) {
    const r = run('restore.mjs', bad, '--yes');
    assert.notEqual(r.status, 0, bad);
  }
  ok("restore: noto'g'ri yoki mavjud bo'lmagan nom rad etiladi");

  // buzilgan zaxirani tiklamaydi
  const broken = 'pulim-202601010000.db';
  fs.writeFileSync(path.join(env.BACKUP_DIR, broken), 'bu baza emas');
  const rb = run('restore.mjs', broken, '--yes');
  assert.notEqual(rb.status, 0);
  assert.deepEqual(fs.readFileSync(env.DB_PATH), marker); ok('restore: buzilgan zaxirani rad etadi, bazaga tegmaydi');
  fs.rmSync(path.join(env.BACKUP_DIR, broken));

  const yes = run('restore.mjs', name, '--yes');
  assert.equal(yes.status, 0, yes.stderr);
  assert.ok(fs.readdirSync(tmp).some((f) => f.startsWith('before-restore-'))); ok('restore: oldin hozirgi bazani saqlaydi va tiklaydi');
  assert.equal(run('stats.mjs').status, 0); ok('tiklangan baza ochiladi');

  console.log(`\n${passed} ta test o'tdi (tools)`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
