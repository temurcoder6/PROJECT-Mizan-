import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DB_PATH = process.env.DB_PATH || path.join(here, 'data', 'pulim.db');
const STATIC_DIR = process.env.STATIC_DIR || path.join(here, '..', 'frontend', 'dist');
const SECURE_COOKIE = process.env.COOKIE_SECURE === '1';
const SESSION_DAYS = 30;
const MAX_BODY = 10 * 1024 * 1024;
const SMALL_BODY = 64 * 1024;
// Default: reachable only from this computer. Set HOST=0.0.0.0 on purpose to open it to the network.
export const HOST = process.env.HOST || '127.0.0.1';
const LIMITS = { transactions: 50000, debts: 3000, goals: 300, bills: 300, noSpend: 5000, payments: 500, adds: 3000 };

const scrypt = promisify(crypto.scrypt);

if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pw_salt BLOB NOT NULL,
  pw_hash BLOB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  method TEXT NOT NULL,
  planned INTEGER NOT NULL,
  note TEXT NOT NULL,
  day_total INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  sample INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);

CREATE TABLE IF NOT EXISTS debts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  direction TEXT NOT NULL,
  person TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  note TEXT NOT NULL,
  remind INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  sample INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS debt_payments (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  debt_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, debt_id, idx)
);

CREATE TABLE IF NOT EXISTS goals (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  target REAL NOT NULL,
  saved REAL NOT NULL,
  deadline TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sample INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS goal_adds (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  amount REAL NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, goal_id, idx)
);

CREATE TABLE IF NOT EXISTS bills (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  repeat TEXT NOT NULL,
  paid_through TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS no_spend_days (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS profile (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cash REAL,
  cash_date TEXT NOT NULL,
  cash_set_at INTEGER NOT NULL,
  next_income TEXT NOT NULL,
  include_goals INTEGER NOT NULL,
  reminder_enabled INTEGER NOT NULL,
  reminder_time TEXT NOT NULL,
  reminder_last TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  contact TEXT NOT NULL,
  context TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reply TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, created_at);
CREATE TABLE IF NOT EXISTS telegram_links (
  code_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS telegram_chats (
  chat_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
`);

// Sxema versiyalari (PRAGMA user_version). Yangi o'zgarish = ro'yxat oxiriga yangi funksiya; eskisini o'zgartirmang.
function addColumn(table, def) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${def}`);
  } catch {
    // ustun allaqachon bor (eski bazalar)
  }
}
const MIGRATIONS = [
  () => {
    addColumn('users', 'recovery_salt BLOB');
    addColumn('users', 'recovery_hash BLOB');
  },
  () => {
    addColumn('sessions', 'device TEXT');
    addColumn('sessions', 'last_seen INTEGER');
  },
];
export const SCHEMA_VERSION = MIGRATIONS.length;
{
  let v = db.prepare('PRAGMA user_version').get().user_version;
  for (; v < MIGRATIONS.length; v++) {
    MIGRATIONS[v]();
    db.exec(`PRAGMA user_version = ${v + 1}`);
  }
}

const integrity = db.prepare('PRAGMA integrity_check').get();
if (integrity && Object.values(integrity)[0] !== 'ok') console.error('DIQQAT: baza tekshiruvi xato topdi:', integrity);

const DATA_TABLES = ['transactions', 'debt_payments', 'debts', 'goal_adds', 'goals', 'bills', 'no_spend_days', 'profile'];

const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  userById: db.prepare('SELECT id, username, revision, created_at, (recovery_hash IS NOT NULL) AS has_recovery FROM users WHERE id = ?'),
  setRecovery: db.prepare('UPDATE users SET recovery_salt = ?, recovery_hash = ? WHERE id = ?'),
  insertUser: db.prepare('INSERT INTO users (username, pw_salt, pw_hash, created_at) VALUES (?, ?, ?, ?)'),
  insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, device, last_seen) VALUES (?, ?, ?, ?, ?, ?)'),
  listSessions: db.prepare('SELECT rowid AS id, token_hash, device, created_at, last_seen FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY COALESCE(last_seen, created_at) DESC LIMIT 50'),
  deleteSessionById: db.prepare('DELETE FROM sessions WHERE rowid = ? AND user_id = ?'),
  touchSession: db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?'),
  sessionUser: db.prepare('SELECT user_id, last_seen FROM sessions WHERE token_hash = ? AND expires_at > ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  setPassword: db.prepare('UPDATE users SET pw_salt = ?, pw_hash = ? WHERE id = ?'),
  deleteOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
  deleteAllSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  insTicket: db.prepare('INSERT INTO support_tickets (user_id, category, message, contact, context, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  ticketsByUser: db.prepare('SELECT id, category, message, status, reply, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 50'),
  revision: db.prepare('SELECT revision FROM users WHERE id = ?'),
  bump: db.prepare('UPDATE users SET revision = revision + 1 WHERE id = ?'),
  insTx: db.prepare('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'),
  insDebt: db.prepare('INSERT INTO debts VALUES (?,?,?,?,?,?,?,?,?,?,?)'),
  insPay: db.prepare('INSERT INTO debt_payments VALUES (?,?,?,?,?,?,?)'),
  insGoal: db.prepare('INSERT INTO goals VALUES (?,?,?,?,?,?,?,?)'),
  insAdd: db.prepare('INSERT INTO goal_adds VALUES (?,?,?,?,?)'),
  insBill: db.prepare('INSERT INTO bills VALUES (?,?,?,?,?,?,?)'),
  insNoSpend: db.prepare('INSERT INTO no_spend_days VALUES (?,?)'),
  insProfile: db.prepare('INSERT INTO profile VALUES (?,?,?,?,?,?,?,?,?)'),
};

// ---------- validation ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Control characters are dropped from every stored string (they can spoof terminal output when the owner reads tickets).
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max).replace(CONTROL, '') : '');
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = (v) => Math.trunc(num(v));
const date = (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : '');
const bool = (v) => (v ? 1 : 0);
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

function dedupe(items) {
  const map = new Map();
  for (const it of items) if (it.id) map.set(it.id, it);
  return [...map.values()];
}

function clean(body) {
  const transactions = dedupe(
    list(body.transactions, LIMITS.transactions).map((t) => ({
      id: str(t?.id, 64),
      type: oneOf(t?.type, ['income', 'expense'], 'expense'),
      title: str(t?.title, 200),
      amount: Math.max(0, num(t?.amount)),
      category: str(t?.category, 40) || 'boshqa',
      date: date(t?.date),
      method: str(t?.method, 20) || 'naqd',
      planned: t?.planned === false ? 0 : 1,
      note: str(t?.note, 500),
      dayTotal: bool(t?.dayTotal),
      createdAt: int(t?.createdAt),
      sample: bool(t?.sample),
    })),
  ).filter((t) => t.date);

  const debts = dedupe(
    list(body.debts, LIMITS.debts).map((d) => ({
      id: str(d?.id, 64),
      direction: oneOf(d?.direction, ['lent', 'borrowed'], 'lent'),
      person: str(d?.person, 100),
      amount: Math.max(0, num(d?.amount)),
      date: date(d?.date),
      dueDate: date(d?.dueDate),
      note: str(d?.note, 500),
      remind: d?.remind === false ? 0 : 1,
      createdAt: int(d?.createdAt),
      sample: bool(d?.sample),
      payments: list(d?.payments, LIMITS.payments).map((p) => ({ id: str(p?.id, 64), amount: Math.max(0, num(p?.amount)), date: date(p?.date), at: int(p?.at) })),
    })),
  ).filter((d) => d.date);

  const goals = dedupe(
    list(body.goals, LIMITS.goals).map((g) => ({
      id: str(g?.id, 64),
      name: str(g?.name, 100),
      target: Math.max(0, num(g?.target)),
      saved: Math.max(0, num(g?.saved)),
      deadline: date(g?.deadline),
      createdAt: str(g?.createdAt, 40),
      sample: bool(g?.sample),
      adds: list(g?.adds, LIMITS.adds).map((a) => ({ amount: num(a?.amount), at: int(a?.at) })),
    })),
  );

  const p = body.profile && typeof body.profile === 'object' ? body.profile : {};
  const profile = {
    cash: p.cash === null || p.cash === undefined || p.cash === '' ? null : num(p.cash),
    cashDate: date(p.cashDate),
    cashSetAt: int(p.cashSetAt),
    nextIncome: date(p.nextIncome),
    includeGoals: p.includeGoals === false ? 0 : 1,
    bills: dedupe(
      list(p.bills, LIMITS.bills).map((b) => ({
        id: str(b?.id, 64),
        name: str(b?.name, 100),
        amount: Math.max(0, num(b?.amount)),
        dueDate: date(b?.dueDate),
        repeat: oneOf(b?.repeat, ['none', 'weekly', 'monthly'], 'none'),
        paidThrough: date(b?.paidThrough),
      })),
    ).filter((b) => b.dueDate),
    noSpend: [...new Set(list(p.noSpend, LIMITS.noSpend).map(date).filter(Boolean))],
    reminder: {
      enabled: bool(p.reminder?.enabled),
      time: /^\d{2}:\d{2}$/.test(p.reminder?.time || '') ? p.reminder.time : '21:00',
      last: date(p.reminder?.last),
    },
  };
  return { transactions, debts, goals, profile };
}

// ---------- data access ----------

function loadAll(userId) {
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date, created_at').all(userId).map((r) => {
    const t = {
      id: r.id, type: r.type, title: r.title, amount: r.amount, category: r.category, date: r.date, method: r.method,
      planned: r.planned === 1, note: r.note, createdAt: r.created_at,
    };
    if (r.day_total) t.dayTotal = true;
    if (r.sample) t.sample = true;
    return t;
  });

  const pays = db.prepare('SELECT * FROM debt_payments WHERE user_id = ? ORDER BY debt_id, idx').all(userId);
  const debts = db.prepare('SELECT * FROM debts WHERE user_id = ? ORDER BY date, created_at').all(userId).map((r) => {
    const d = {
      id: r.id, direction: r.direction, person: r.person, amount: r.amount, date: r.date, dueDate: r.due_date, note: r.note,
      remind: r.remind === 1, createdAt: r.created_at,
      payments: pays.filter((p) => p.debt_id === r.id).map((p) => ({ id: p.id, amount: p.amount, date: p.date, at: p.at })),
    };
    if (r.sample) d.sample = true;
    return d;
  });

  const adds = db.prepare('SELECT * FROM goal_adds WHERE user_id = ? ORDER BY goal_id, idx').all(userId);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at').all(userId).map((r) => {
    const g = {
      id: r.id, name: r.name, target: r.target, saved: r.saved, deadline: r.deadline, createdAt: r.created_at,
      adds: adds.filter((a) => a.goal_id === r.id).map((a) => ({ amount: a.amount, at: a.at })),
    };
    if (r.sample) g.sample = true;
    return g;
  });

  const pr = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(userId);
  const profile = {
    cash: pr ? pr.cash : null,
    cashDate: pr ? pr.cash_date : '',
    cashSetAt: pr ? pr.cash_set_at : 0,
    nextIncome: pr ? pr.next_income : '',
    includeGoals: pr ? pr.include_goals === 1 : true,
    bills: db.prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY due_date').all(userId).map((b) => ({
      id: b.id, name: b.name, amount: b.amount, dueDate: b.due_date, repeat: b.repeat, paidThrough: b.paid_through,
    })),
    noSpend: db.prepare('SELECT date FROM no_spend_days WHERE user_id = ? ORDER BY date').all(userId).map((r) => r.date),
    reminder: {
      enabled: pr ? pr.reminder_enabled === 1 : false,
      time: pr ? pr.reminder_time : '21:00',
      last: pr ? pr.reminder_last : '',
    },
  };

  const hasData = Boolean(
    transactions.length || debts.length || goals.length || profile.bills.length || profile.noSpend.length || profile.cash !== null || profile.nextIncome,
  );
  return { revision: q.revision.get(userId)?.revision ?? 0, hasData, transactions, debts, goals, profile };
}

class Conflict extends Error {}

function saveAll(userId, baseRevision, input, force) {
  const d = clean(input);
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = q.revision.get(userId).revision;
    if (!force && baseRevision !== current) throw new Conflict();
    for (const t of DATA_TABLES) db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
    for (const t of d.transactions) q.insTx.run(userId, t.id, t.type, t.title, t.amount, t.category, t.date, t.method, t.planned, t.note, t.dayTotal, t.createdAt, t.sample);
    for (const x of d.debts) {
      q.insDebt.run(userId, x.id, x.direction, x.person, x.amount, x.date, x.dueDate, x.note, x.remind, x.createdAt, x.sample);
      x.payments.forEach((p, i) => q.insPay.run(userId, x.id, i, p.id, p.amount, p.date, p.at));
    }
    for (const g of d.goals) {
      q.insGoal.run(userId, g.id, g.name, g.target, g.saved, g.deadline, g.createdAt, g.sample);
      g.adds.forEach((a, i) => q.insAdd.run(userId, g.id, i, a.amount, a.at));
    }
    for (const b of d.profile.bills) q.insBill.run(userId, b.id, b.name, b.amount, b.dueDate, b.repeat, b.paidThrough);
    for (const day of d.profile.noSpend) q.insNoSpend.run(userId, day);
    const p = d.profile;
    q.insProfile.run(userId, p.cash, p.cashDate, p.cashSetAt, p.nextIncome, p.includeGoals, p.reminder.enabled, p.reminder.time, p.reminder.last);
    q.bump.run(userId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return q.revision.get(userId).revision;
}

// ---------- auth ----------

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const attempts = new Map();
const registrations = new Map();
const supportLimit = new Map();
const globalLimit = new Map();
const writeLimit = new Map();
export const limiters = { attempts, registrations, supportLimit, globalLimit, writeLimit };

function pruneMap(map) {
  const now = Date.now();
  for (const [k, v] of map) if (v.until < now) map.delete(k);
}
export function pruneLimits() {
  for (const m of Object.values(limiters)) pruneMap(m);
}

function tooMany(map, key, max, windowMs) {
  const now = Date.now();
  const e = map.get(key);
  if (!e || e.until < now) return false;
  return e.count >= max;
}
function hit(map, key, windowMs) {
  const now = Date.now();
  if (map.size > 50000) {
    pruneMap(map);
    if (map.size > 50000) map.clear();
  }
  const e = map.get(key);
  if (!e || e.until < now) map.set(key, { count: 1, until: now + windowMs });
  else e.count += 1;
}

async function hashPassword(password, salt = crypto.randomBytes(16)) {
  return { salt, hash: await scrypt(password, salt, 64) };
}

// Recovery code: shown once, stored only as a salted scrypt hash. It lets a user reset the password without e-mail or phone.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normCode = (c) => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');

async function issueRecoveryCode(userId) {
  const raw = Array.from({ length: 20 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
  const { salt, hash } = await hashPassword(raw);
  q.setRecovery.run(salt, hash, userId);
  return raw.match(/.{5}/g).join('-');
}

async function verifyRecoveryCode(user, code) {
  if (!user || !user.recovery_hash) {
    await scrypt(normCode(code), DUMMY, 64);
    return false;
  }
  const hash = await scrypt(normCode(code), user.recovery_salt, 64);
  return crypto.timingSafeEqual(hash, user.recovery_hash);
}

// ---------- Telegram linking (the bot itself lives in bot.mjs) ----------

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BOT_USERNAME = (process.env.BOT_USERNAME || '').replace(/^@/, '');
const LINK_TTL = 10 * 60 * 1000;

export function createLinkCode(userId) {
  db.prepare('DELETE FROM telegram_links WHERE user_id = ? OR expires_at < ?').run(userId, Date.now());
  const code = Array.from({ length: 8 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
  db.prepare('INSERT INTO telegram_links (code_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(code), userId, Date.now() + LINK_TTL);
  return code;
}

export function consumeLinkCode(code, chatId) {
  const hash = sha(normCode(code));
  const row = db.prepare('SELECT user_id FROM telegram_links WHERE code_hash = ? AND expires_at > ?').get(hash, Date.now());
  if (!row) return null;
  db.prepare('DELETE FROM telegram_links WHERE code_hash = ?').run(hash);
  db.prepare('DELETE FROM telegram_chats WHERE user_id = ? OR chat_id = ?').run(row.user_id, String(chatId));
  db.prepare('INSERT INTO telegram_chats (chat_id, user_id, created_at) VALUES (?, ?, ?)').run(String(chatId), row.user_id, Date.now());
  return row.user_id;
}

export const userForChat = (chatId) => db.prepare('SELECT user_id FROM telegram_chats WHERE chat_id = ?').get(String(chatId))?.user_id ?? null;
export const unlinkChat = (chatId) => db.prepare('DELETE FROM telegram_chats WHERE chat_id = ?').run(String(chatId)).changes;
export const allChats = () => db.prepare('SELECT chat_id, user_id FROM telegram_chats').all();

// Rejects the passwords attackers try first. (Length is checked separately.)
const WEAK = new Set(['12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', 'password', 'password1', 'qwerty123', 'qwertyui', 'qwertyuiop', 'abcd1234', 'admin123', 'iloveyou', 'parol123', 'parol1234', 'parolparol', 'uzbekistan', 'tashkent1']);
function assertStrong(password, username) {
  const p = String(password).toLowerCase();
  if (WEAK.has(p) || p === String(username).toLowerCase() || new Set(p).size < 3) throw new HttpError(400, 'Parol juda oson topiladi. Boshqa, qiyinroq parol tanlang.');
}

const DUMMY = crypto.randomBytes(16);
async function verifyPassword(user, password) {
  if (!user) {
    await scrypt(password, DUMMY, 64);
    return false;
  }
  const hash = await scrypt(password, user.pw_salt, 64);
  return crypto.timingSafeEqual(hash, user.pw_hash);
}

// User-Agent'dan "Chrome · Windows" kabi qisqa nom (faqat ro'yxatda ko'rsatish uchun).
export function deviceLabel(ua) {
  const s = String(ua || '');
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Brauzer';
  const os = /Android/.test(s) ? 'Android' : /iPhone|iPad|iOS/.test(s) ? 'iOS' : /Windows/.test(s) ? 'Windows' : /Mac OS X|Macintosh/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : '';
  return (os ? `${browser} · ${os}` : browser).slice(0, 60);
}

function startSession(res, userId, req) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  q.insertSession.run(sha(token), userId, now, now + SESSION_DAYS * 86400000, deviceLabel(req?.headers?.['user-agent']), now);
  res.setHeader('Set-Cookie', cookie(token, SESSION_DAYS * 86400));
}

function cookie(value, maxAge) {
  return `pulim_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`;
}

function sessionToken(req) {
  const m = /(?:^|;\s*)pulim_session=([^;]+)/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}

function currentUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const now = Date.now();
  const s = q.sessionUser.get(sha(token), now);
  if (s && !(now - (s.last_seen || 0) < 300000)) q.touchSession.run(now, sha(token));
  return s ? q.userById.get(s.user_id) : null;
}

// ---------- http ----------

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(json);
}

// Small by default: only the data upload may be large, and only for a signed-in user.
function readJSON(req, limit = SMALL_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      if (tooBig) return;
      size += c.length;
      if (size > limit) {
        tooBig = true;
        chunks.length = 0;
        reject(new HttpError(413, "So'rov juda katta."));
        req.pause();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, "JSON noto'g'ri."));
      }
    });
    req.on('error', reject);
  });
}

function requireUser(req) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, 'Avval tizimga kiring.');
  return user;
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, "Ruxsat yo'q.");
}

// Behind a tunnel or reverse proxy every visitor arrives from 127.0.0.1. With TRUST_PROXY=1 the real address is read from
// X-Forwarded-For, but only when the connection itself comes from this computer, so remote clients cannot fake it.
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const LOOPBACK = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/;
const clientIp = (req) => {
  const direct = req.socket.remoteAddress || 'unknown';
  if (TRUST_PROXY && LOOPBACK.test(direct)) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xff && xff.length <= 64) return xff;
  }
  return direct;
};

async function api(req, res, pathname) {
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    checkOrigin(req);
    if (!(req.headers['content-type'] || '').startsWith('application/json') && method !== 'DELETE') throw new HttpError(415, 'JSON kerak.');
  }

  const ip = clientIp(req);
  if (tooMany(globalLimit, ip, 300, 60000)) throw new HttpError(429, "Juda ko'p so'rov. Bir daqiqadan keyin qayta urinib ko'ring.");
  hit(globalLimit, ip, 60000);

  if (pathname === '/api/health' && method === 'GET') {
    try {
      db.prepare('SELECT 1').get();
      return send(res, 200, { ok: true });
    } catch {
      throw new HttpError(503, 'Baza javob bermayapti.');
    }
  }

  if (pathname === '/api/support' && method === 'POST') {
    if (tooMany(supportLimit, ip, 5, 3600000)) throw new HttpError(429, "Bir soatda 5 tadan ko'p murojaat yuborib bo'lmaydi.");
    const body = await readJSON(req);
    const category = oneOf(body.category, ['shikoyat', 'muammo', 'taklif', 'savol'], '');
    const message = typeof body.message === 'string' ? body.message.replace(CONTROL, '').trim() : '';
    if (!category) throw new HttpError(400, 'Murojaat turini tanlang.');
    if (message.length < 10) throw new HttpError(400, "Xabar kamida 10 belgi bo'lishi kerak.");
    if (message.length > 2000) throw new HttpError(400, "Xabar 2000 belgidan oshmasligi kerak.");
    const user = currentUser(req);
    hit(supportLimit, ip, 3600000);
    const now = Date.now();
    const r = q.insTicket.run(user ? user.id : null, category, message, str(body.contact, 120), str(body.context, 200), now, now);
    return send(res, 201, { id: Number(r.lastInsertRowid) });
  }

  if (pathname === '/api/support/mine' && method === 'GET') {
    const user = requireUser(req);
    return send(res, 200, {
      tickets: q.ticketsByUser.all(user.id).map((t) => ({ id: t.id, category: t.category, message: t.message, status: t.status, reply: t.reply, createdAt: t.created_at, updatedAt: t.updated_at })),
    });
  }

  if (pathname === '/api/revision' && method === 'GET') {
    const user = requireUser(req);
    return send(res, 200, { revision: q.revision.get(user.id).revision });
  }

  if (pathname === '/api/telegram/status' && method === 'GET') {
    const user = requireUser(req);
    const linked = db.prepare('SELECT 1 AS x FROM telegram_chats WHERE user_id = ?').get(user.id) !== undefined;
    return send(res, 200, { configured: Boolean(BOT_TOKEN), username: BOT_USERNAME, linked });
  }

  if (pathname === '/api/telegram/link' && method === 'POST') {
    const user = requireUser(req);
    if (!BOT_TOKEN) throw new HttpError(503, 'Telegram bot serverda sozlanmagan.');
    return send(res, 200, { code: createLinkCode(user.id), minutes: LINK_TTL / 60000 });
  }

  if (pathname === '/api/telegram/unlink' && method === 'POST') {
    const user = requireUser(req);
    db.prepare('DELETE FROM telegram_chats WHERE user_id = ?').run(user.id);
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/password' && method === 'POST') {
    const user = requireUser(req);
    const { oldPassword, newPassword } = await readJSON(req);
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) throw new HttpError(400, "Yangi parol kamida 8 belgi bo'lishi kerak.");
    assertStrong(newPassword, user.username);
    const key = `${ip}|pw|${user.id}`;
    if (tooMany(attempts, key, 8, 600000)) throw new HttpError(429, "Juda ko'p xato urinish. 10 daqiqadan keyin qayta urinib ko'ring.");
    const row = q.userByName.get(user.username);
    if (typeof oldPassword !== 'string' || !(await verifyPassword(row, oldPassword))) {
      hit(attempts, key, 600000);
      throw new HttpError(401, "Joriy parol noto'g'ri.");
    }
    const { salt, hash } = await hashPassword(newPassword);
    q.setPassword.run(salt, hash, user.id);
    q.deleteOtherSessions.run(user.id, sha(sessionToken(req)));
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/sessions' && method === 'GET') {
    const user = requireUser(req);
    const mine = sha(sessionToken(req));
    const sessions = q.listSessions.all(user.id, Date.now()).map((r) => ({ id: r.id, device: r.device || 'Nomalum qurilma', createdAt: r.created_at, lastSeen: r.last_seen || r.created_at, current: r.token_hash === mine }));
    return send(res, 200, { sessions });
  }

  const sessionDel = /^\/api\/sessions\/(\d+)$/.exec(pathname);
  if (sessionDel && method === 'DELETE') {
    const user = requireUser(req);
    const r = q.deleteSessionById.run(Number(sessionDel[1]), user.id);
    if (!r.changes) throw new HttpError(404, 'Qurilma topilmadi.');
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/logout-all' && method === 'POST') {
    const user = requireUser(req);
    q.deleteAllSessions.run(user.id);
    res.setHeader('Set-Cookie', cookie('', 0));
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/register' && method === 'POST') {
    const ip = clientIp(req);
    if (tooMany(registrations, ip, 10, 3600000)) throw new HttpError(429, "Juda ko'p urinish. Keyinroq qayta urinib ko'ring.");
    const { username, password } = await readJSON(req);
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) throw new HttpError(400, "Foydalanuvchi nomi 3-32 belgi: harf, raqam, nuqta, pastki chiziq yoki chiziqcha.");
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) throw new HttpError(400, "Parol kamida 8 belgi bo'lishi kerak.");
    assertStrong(password, username);
    if (q.userByName.get(username)) throw new HttpError(409, 'Bu nom band.');
    hit(registrations, ip, 3600000);
    const { salt, hash } = await hashPassword(password);
    const r = q.insertUser.run(username, salt, hash, Date.now());
    const id = Number(r.lastInsertRowid);
    const recoveryCode = await issueRecoveryCode(id);
    startSession(res, id, req);
    return send(res, 201, { user: { id, username, hasRecovery: true }, recoveryCode });
  }

  if (pathname === '/api/recovery-code' && method === 'POST') {
    const user = requireUser(req);
    const { password } = await readJSON(req);
    const row = q.userByName.get(user.username);
    if (typeof password !== 'string' || !(await verifyPassword(row, password))) throw new HttpError(401, "Parol noto'g'ri.");
    return send(res, 200, { recoveryCode: await issueRecoveryCode(user.id) });
  }

  if (pathname === '/api/recover' && method === 'POST') {
    const { username, code, newPassword } = await readJSON(req);
    if (typeof username !== 'string' || typeof code !== 'string') throw new HttpError(400, 'Nom va tiklash kodini kiriting.');
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) throw new HttpError(400, "Yangi parol kamida 8 belgi bo'lishi kerak.");
    assertStrong(newPassword, username);
    const key = `${ip}|recover|${username.toLowerCase()}`;
    if (tooMany(attempts, key, 6, 3600000)) throw new HttpError(429, "Juda ko'p xato urinish. Bir soatdan keyin qayta urinib ko'ring.");
    const user = q.userByName.get(username);
    const ok = await verifyRecoveryCode(user, code);
    if (!ok) {
      hit(attempts, key, 3600000);
      throw new HttpError(401, "Nom yoki tiklash kodi noto'g'ri.");
    }
    attempts.delete(key);
    const { salt, hash } = await hashPassword(newPassword);
    q.setPassword.run(salt, hash, user.id);
    q.deleteAllSessions.run(user.id);
    const recoveryCode = await issueRecoveryCode(user.id);
    startSession(res, user.id, req);
    return send(res, 200, { user: { id: user.id, username: user.username, hasRecovery: true }, recoveryCode });
  }

  if (pathname === '/api/login' && method === 'POST') {
    const { username, password } = await readJSON(req);
    if (typeof username !== 'string' || typeof password !== 'string') throw new HttpError(400, 'Nom va parolni kiriting.');
    const key = `${clientIp(req)}|${username.toLowerCase()}`;
    if (tooMany(attempts, key, 8, 600000)) throw new HttpError(429, "Juda ko'p xato urinish. 10 daqiqadan keyin qayta urinib ko'ring.");
    const user = q.userByName.get(username);
    const ok = await verifyPassword(user, password);
    if (!ok) {
      hit(attempts, key, 600000);
      throw new HttpError(401, "Nom yoki parol noto'g'ri.");
    }
    attempts.delete(key);
    startSession(res, user.id, req);
    return send(res, 200, { user: { id: user.id, username: user.username, hasRecovery: Boolean(user.recovery_hash) } });
  }

  if (pathname === '/api/logout' && method === 'POST') {
    const token = sessionToken(req);
    if (token) q.deleteSession.run(sha(token));
    res.setHeader('Set-Cookie', cookie('', 0));
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/me' && method === 'GET') {
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'Kirilmagan.');
    return send(res, 200, { user: { id: user.id, username: user.username, hasRecovery: user.has_recovery === 1 } });
  }

  if (pathname === '/api/data' && method === 'GET') {
    const user = requireUser(req);
    return send(res, 200, loadAll(user.id));
  }

  if (pathname === '/api/data' && method === 'PUT') {
    const user = requireUser(req);
    if (tooMany(writeLimit, `u${user.id}`, 30, 60000)) throw new HttpError(429, "Juda tez-tez saqlayapsiz. Bir daqiqadan keyin qayta urinib ko'ring.");
    hit(writeLimit, `u${user.id}`, 60000);
    const body = await readJSON(req, MAX_BODY);
    try {
      const revision = saveAll(user.id, Number(body.baseRevision), body, body.force === true);
      return send(res, 200, { revision });
    } catch (e) {
      if (e instanceof Conflict) throw new HttpError(409, "Boshqa qurilmada ma'lumot o'zgargan.", { server: loadAll(user.id) });
      throw e;
    }
  }

  if (pathname === '/api/account' && method === 'DELETE') {
    const user = requireUser(req);
    const { password } = await readJSON(req);
    const row = q.userByName.get(user.username);
    if (typeof password !== 'string' || !(await verifyPassword(row, password))) throw new HttpError(401, "Parol noto'g'ri.");
    q.deleteUser.run(user.id);
    res.setHeader('Set-Cookie', cookie('', 0));
    return send(res, 200, { ok: true });
  }

  throw new HttpError(404, 'Topilmadi.');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  if (!fs.existsSync(STATIC_DIR)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Frontend topilmadi. Avval frontend papkasida "npm run build" ni ishga tushiring.');
  }
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    return res.end("Noto'g'ri manzil");
  }
  if (rel.includes('\0')) {
    res.writeHead(400);
    return res.end("Noto'g'ri manzil");
  }
  // Resolve inside the static root and compare with a trailing separator, so "dist-secret" is not mistaken for "dist".
  const root = path.resolve(STATIC_DIR);
  let file = path.resolve(root, `.${rel.startsWith('/') || rel.startsWith('\\') ? '' : path.sep}${rel}`);
  const inside = file === root || file.startsWith(root + path.sep);
  const hidden = path.relative(root, file).split(path.sep).some((seg) => seg.startsWith('.'));
  if (!inside || hidden) {
    res.writeHead(404);
    return res.end('Topilmadi');
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(rel)) {
      res.writeHead(404);
      return res.end('Topilmadi');
    }
    file = path.join(root, 'index.html');
  }
  const ext = path.extname(file);
  const immutable = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'",
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
};

export const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (SECURE_COOKIE) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Ruxsat etilmagan.');
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.status === 413) res.setHeader('Connection', 'close');
      return send(res, e.status, { error: e.message, ...(e.extra || {}) });
    }
    console.error(e);
    return send(res, 500, { error: 'Server xatosi.' });
  }
});

// Slow-connection (slowloris) and idle limits.
server.requestTimeout = 60000;
server.headersTimeout = 20000;
server.keepAliveTimeout = 5000;

setInterval(() => q.purgeSessions.run(Date.now()), 3600000).unref();
setInterval(pruneLimits, 10 * 60000).unref();

// Daily-ish safety copy of the database (VACUUM INTO makes a consistent snapshot even while the server runs).
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const KEEP_BACKUPS = 7;
export function backupNow() {
  if (DB_PATH === ':memory:') return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const file = path.join(BACKUP_DIR, `pulim-${stamp}.db`);
  if (fs.existsSync(file)) return file;
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const old = fs.readdirSync(BACKUP_DIR).filter((f) => /^pulim-\d{12}\.db$/.test(f)).sort();
  for (const f of old.slice(0, Math.max(old.length - KEEP_BACKUPS, 0))) fs.rmSync(path.join(BACKUP_DIR, f), { force: true });
  return file;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`Mizan server: http://localhost:${PORT}  (baza: ${DB_PATH}${HOST === '127.0.0.1' ? ', faqat shu kompyuterdan' : `, ochiq: ${HOST}`})`);
    if (BOT_TOKEN) {
      import('./bot.mjs')
        .then((m) => m.startBot(BOT_TOKEN))
        .catch((e) => console.error('Telegram bot ishga tushmadi:', e.message));
    } else {
      console.log("Telegram bot o'chiq (BOT_TOKEN berilmagan).");
    }
    try {
      const b = backupNow();
      if (b) console.log(`Zaxira nusxa: ${b}`);
    } catch (e) {
      console.error('Zaxira nusxa olinmadi:', e.message);
    }
  });
  setInterval(() => {
    try {
      backupNow();
    } catch (e) {
      console.error('Zaxira nusxa olinmadi:', e.message);
    }
  }, 6 * 3600000).unref();

  const shutdown = () => {
    server.close(() => {
      try {
        db.close();
      } catch {
        // already closed
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', (e) => console.error('Kutilmagan xato:', e));
}

export { db, loadAll, saveAll, Conflict };
