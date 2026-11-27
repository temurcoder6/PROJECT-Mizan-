import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { HttpError, checkOrigin, readJSON, send, serveStatic } from './lib/http.mjs';
import { askJarvisAI, computeFinancialHealth } from './lib/jarvis.mjs';
import {
  CONTROL, LIMITS, USERNAME_RE, cleanState, findForbiddenCardKey, int, oneOf, passwordIssue, sanitizeCard, str,
} from './lib/validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const DB_PATH = process.env.DB_PATH || path.join(here, 'data', 'pulim.db');
const STATIC_DIR = process.env.STATIC_DIR || path.join(here, '..', 'frontend', 'dist');
const SECURE_COOKIE = process.env.COOKIE_SECURE === '1';
const SESSION_DAYS = 30;
const MAX_BODY = 10 * 1024 * 1024;
const SMALL_BODY = 64 * 1024;
// Default: reachable only from this computer. Set HOST=0.0.0.0 on purpose to open it to the network.
export const HOST = process.env.HOST || '127.0.0.1';

export const OAUTH_ENDPOINTS = {
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    user: 'https://openidconnect.googleapis.com/v1/userinfo',
  },
  github: {
    auth: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    user: 'https://api.github.com/user',
    emails: 'https://api.github.com/user/emails',
  },
};

const scrypt = promisify(crypto.scrypt);

if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
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
CREATE TABLE IF NOT EXISTS oauth_accounts (
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  login TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
CREATE TABLE IF NOT EXISTS cards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  network TEXT NOT NULL,
  last4 TEXT NOT NULL,
  balance REAL NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_links_expires ON telegram_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_debts_user_due ON debts(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
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
  () => {
    addColumn('users', 'has_password INTEGER NOT NULL DEFAULT 1');
  },
  () => {
    // cards jadvali yuqorida CREATE TABLE IF NOT EXISTS bilan yaratiladi
  },
  () => {
    addColumn('users', 'is_admin INTEGER NOT NULL DEFAULT 0');
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

const DATA_TABLES = ['transactions', 'debt_payments', 'debts', 'goal_adds', 'goals', 'bills', 'no_spend_days', 'profile', 'cards'];

const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  userById: db.prepare('SELECT id, username, revision, created_at, (recovery_hash IS NOT NULL) AS has_recovery, COALESCE(has_password, 1) AS has_password, COALESCE(is_admin, 0) AS is_admin FROM users WHERE id = ?'),
  setRecovery: db.prepare('UPDATE users SET recovery_salt = ?, recovery_hash = ? WHERE id = ?'),
  insertUser: db.prepare('INSERT INTO users (username, pw_salt, pw_hash, created_at) VALUES (?, ?, ?, ?)'),
  insertOAuthUser: db.prepare('INSERT INTO users (username, pw_salt, pw_hash, has_password, created_at) VALUES (?, ?, ?, 0, ?)'),
  oauthByProviderId: db.prepare('SELECT user_id, email, login FROM oauth_accounts WHERE provider = ? AND provider_id = ?'),
  oauthByUser: db.prepare('SELECT provider, email, login, created_at FROM oauth_accounts WHERE user_id = ? ORDER BY created_at'),
  insertOAuth: db.prepare('INSERT INTO oauth_accounts (provider, provider_id, user_id, email, login, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  deleteOAuthByUserProvider: db.prepare('DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?'),
  insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, device, last_seen) VALUES (?, ?, ?, ?, ?, ?)'),
  listSessions: db.prepare('SELECT rowid AS id, token_hash, device, created_at, last_seen FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY COALESCE(last_seen, created_at) DESC LIMIT 50'),
  deleteSessionById: db.prepare('DELETE FROM sessions WHERE rowid = ? AND user_id = ?'),
  touchSession: db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?'),
  sessionUser: db.prepare('SELECT user_id, last_seen FROM sessions WHERE token_hash = ? AND expires_at > ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  setPassword: db.prepare('UPDATE users SET pw_salt = ?, pw_hash = ?, has_password = 1 WHERE id = ?'),
  setAdminRole: db.prepare('UPDATE users SET is_admin = ? WHERE id = ?'),
  deleteOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
  deleteAllSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  insTicket: db.prepare('INSERT INTO support_tickets (user_id, category, message, contact, context, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  ticketsByUser: db.prepare('SELECT id, category, message, status, reply, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 50'),
  adminTickets: db.prepare('SELECT t.id, t.category, t.message, t.contact, t.context, t.status, t.reply, t.created_at, t.updated_at, u.username FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT 100'),
  replyTicket: db.prepare("UPDATE support_tickets SET status = ?, reply = CASE WHEN ? != '' THEN ? ELSE reply END, updated_at = ? WHERE id = ?"),
  adminUsers: db.prepare(`
    SELECT u.id, u.username, COALESCE(u.is_admin, 0) AS is_admin, COALESCE(u.has_password, 1) AS has_password,
           (u.recovery_hash IS NOT NULL) AS has_recovery, u.revision, u.created_at,
           (SELECT MAX(COALESCE(s.last_seen, s.created_at)) FROM sessions s WHERE s.user_id = u.id) AS last_seen,
           (SELECT COUNT(*) FROM transactions tx WHERE tx.user_id = u.id) AS tx_count,
           (SELECT COUNT(*) FROM cards c WHERE c.user_id = u.id) AS card_count,
           EXISTS(SELECT 1 FROM telegram_chats tc WHERE tc.user_id = u.id) AS tg_linked,
           (SELECT GROUP_CONCAT(oa.provider, ',') FROM oauth_accounts oa WHERE oa.user_id = u.id) AS providers
    FROM users u
    WHERE (? = '' OR u.username LIKE ? ESCAPE '\\')
    ORDER BY u.id DESC
    LIMIT 100
  `),
  revision: db.prepare('SELECT revision FROM users WHERE id = ?'),
  bump: db.prepare('UPDATE users SET revision = revision + 1 WHERE id = ?'),
  listCards: db.prepare('SELECT id, label, network, last4, balance, created_at FROM cards WHERE user_id = ? ORDER BY created_at'),
  cardById: db.prepare('SELECT id, label, network, last4, balance, created_at FROM cards WHERE user_id = ? AND id = ?'),
  countCards: db.prepare('SELECT COUNT(*) AS n FROM cards WHERE user_id = ?'),
  updateCard: db.prepare('UPDATE cards SET label = ?, network = ?, last4 = ?, balance = ? WHERE user_id = ? AND id = ?'),
  deleteCard: db.prepare('DELETE FROM cards WHERE user_id = ? AND id = ?'),
  insTx: db.prepare('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'),
  insDebt: db.prepare('INSERT INTO debts VALUES (?,?,?,?,?,?,?,?,?,?,?)'),
  insPay: db.prepare('INSERT INTO debt_payments VALUES (?,?,?,?,?,?,?)'),
  insGoal: db.prepare('INSERT INTO goals VALUES (?,?,?,?,?,?,?,?)'),
  insAdd: db.prepare('INSERT INTO goal_adds VALUES (?,?,?,?,?)'),
  insBill: db.prepare('INSERT INTO bills VALUES (?,?,?,?,?,?,?)'),
  insNoSpend: db.prepare('INSERT INTO no_spend_days VALUES (?,?)'),
  insProfile: db.prepare('INSERT INTO profile VALUES (?,?,?,?,?,?,?,?,?)'),
  insCard: db.prepare('INSERT INTO cards VALUES (?,?,?,?,?,?,?)'),
};

// ---------- validation (moved to lib/validate.mjs) ----------

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

  const cards = db.prepare('SELECT * FROM cards WHERE user_id = ? ORDER BY created_at').all(userId).map((c) => ({
    id: c.id, label: c.label, network: c.network, last4: c.last4, balance: c.balance, createdAt: c.created_at,
  }));

  const hasData = Boolean(
    transactions.length || debts.length || goals.length || cards.length || profile.bills.length || profile.noSpend.length || profile.cash !== null || profile.nextIncome,
  );
  return { revision: q.revision.get(userId)?.revision ?? 0, hasData, transactions, debts, goals, profile, cards };
}

class Conflict extends Error {}

function saveAll(userId, baseRevision, input, force) {
  const d = cleanState(input);
  if (!d) throw new HttpError(400, "Ma'lumot tuzilmasi noto'g'ri.");
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
    for (const c of d.cards) q.insCard.run(userId, c.id, c.label, c.network, c.last4, c.balance, c.createdAt);
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
const attempts = new Map();
const registrations = new Map();
const supportLimit = new Map();
const globalLimit = new Map();
const writeLimit = new Map();
const oauthLimit = new Map();
const oauthStates = new Map();
export const limiters = { attempts, registrations, supportLimit, globalLimit, writeLimit, oauthLimit };

function pruneMap(map) {
  const now = Date.now();
  for (const [k, v] of map) if ((v.until ?? v.expiresAt ?? 0) < now) map.delete(k);
}
export function pruneLimits() {
  for (const m of Object.values(limiters)) pruneMap(m);
  pruneMap(oauthStates);
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

function assertStrong(password, username) {
  const err = passwordIssue(password, username);
  if (err) throw new HttpError(400, err);
}

const DUMMY = crypto.randomBytes(16);
async function verifyPassword(user, password) {
  if (!user || user.has_password === 0 || !user.pw_hash || !user.pw_hash.length) {
    await scrypt(password, DUMMY, 64);
    return false;
  }
  const hash = await scrypt(password, user.pw_salt, 64);
  return crypto.timingSafeEqual(hash, user.pw_hash);
}

function adminNameSet() {
  return new Set(
    String(process.env.ADMIN_USERNAMES || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdminUser(u) {
  if (!u) return false;
  if (Number(u.is_admin) === 1) return true;
  return adminNameSet().has(String(u.username || '').toLowerCase());
}

function userPayload(u) {
  const oauth = q.oauthByUser.all(u.id).map((o) => ({ provider: o.provider, email: o.email, login: o.login }));
  return {
    id: u.id,
    username: u.username,
    hasRecovery: Boolean(u.has_recovery ?? u.recovery_hash),
    hasPassword: u.has_password !== 0,
    isAdmin: isAdminUser(u),
    oauth,
  };
}

// ---------- Google & GitHub OAuth 2.0 ----------

function oauthConfig(provider) {
  if (provider === 'google') {
    const id = process.env.GOOGLE_CLIENT_ID || '';
    const secret = process.env.GOOGLE_CLIENT_SECRET || '';
    return id && secret ? { id, secret } : null;
  }
  if (provider === 'github') {
    const id = process.env.GITHUB_CLIENT_ID || '';
    const secret = process.env.GITHUB_CLIENT_SECRET || '';
    return id && secret ? { id, secret } : null;
  }
  return null;
}

function requestOrigin(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const host = String(req.headers.host || '');
  if (/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(host)) return `http://${host}`;
  return `http://localhost:${PORT}`;
}

function safeNextHash(next, fallback = '#bosh') {
  const s = String(next || '').trim();
  return /^#\/?[a-z0-9_-]{0,32}$/i.test(s) ? s : fallback;
}

function oauthCookie(value, maxAge) {
  return `pulim_oauth=${value}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`;
}

function oauthCookieToken(req) {
  const m = /(?:^|;\s*)pulim_oauth=([^;]+)/.exec(req.headers.cookie || '');
  return m ? m[1] : '';
}

function pickOAuthUsername(login, email, provider) {
  const raw = String(login || (email ? email.split('@')[0] : '') || provider)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 24);
  const base = raw.length >= 3 ? raw : `mizan_${raw || provider}`.slice(0, 24);
  if (!q.userByName.get(base)) return base;
  for (let i = 0; i < 12; i++) {
    const cand = `${base.slice(0, 20)}_${crypto.randomInt(100, 9999)}`;
    if (!q.userByName.get(cand)) return cand;
  }
  return `u_${crypto.randomBytes(5).toString('hex')}`;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function exchangeGoogle(code, verifier, redirectUri, cfg) {
  const tok = await fetchJson(OAUTH_ENDPOINTS.google.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: cfg.id,
      client_secret: cfg.secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!tok.ok || !tok.data?.access_token) throw new Error('google_token_error');
  const prof = await fetchJson(OAUTH_ENDPOINTS.google.user, {
    headers: { Authorization: `Bearer ${tok.data.access_token}`, Accept: 'application/json' },
  });
  if (!prof.ok || !prof.data?.sub) throw new Error('google_profile_error');
  return {
    providerId: String(prof.data.sub),
    email: str(prof.data.email || '', 160),
    login: str(prof.data.name || prof.data.given_name || '', 80),
  };
}

async function exchangeGitHub(code, redirectUri, cfg) {
  const tok = await fetchJson(OAUTH_ENDPOINTS.github.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: cfg.id,
      client_secret: cfg.secret,
      redirect_uri: redirectUri,
    }),
  });
  if (!tok.ok || !tok.data?.access_token) throw new Error('github_token_error');
  const headers = { Authorization: `Bearer ${tok.data.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Mizan-App' };
  const prof = await fetchJson(OAUTH_ENDPOINTS.github.user, { headers });
  if (!prof.ok || prof.data?.id === undefined || prof.data?.id === null) throw new Error('github_profile_error');
  let email = str(prof.data.email || '', 160);
  if (!email) {
    const em = await fetchJson(OAUTH_ENDPOINTS.github.emails, { headers }).catch(() => null);
    if (em?.ok && Array.isArray(em.data)) {
      const primary = em.data.find((x) => x?.primary && x?.verified) || em.data.find((x) => x?.verified);
      if (primary?.email) email = str(primary.email, 160);
    }
  }
  return {
    providerId: String(prof.data.id),
    email,
    login: str(prof.data.login || prof.data.name || '', 80),
  };
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function resolveOAuthUser(provider, profile, signedInUser, next) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = q.oauthByProviderId.get(provider, profile.providerId);
    if (existing) {
      if (signedInUser && existing.user_id !== signedInUser.id) {
        db.exec('COMMIT');
        return { error: 'already_linked', next: '#/sozlamalar' };
      }
      db.exec('COMMIT');
      return { userId: existing.user_id, next: next || '#bosh' };
    }
    if (signedInUser) {
      if (q.oauthByUser.all(signedInUser.id).some((o) => o.provider === provider)) {
        db.exec('COMMIT');
        return { error: 'already_provider', next: '#/sozlamalar' };
      }
      q.insertOAuth.run(provider, profile.providerId, signedInUser.id, profile.email, profile.login, Date.now());
      db.exec('COMMIT');
      return { linked: true, userId: signedInUser.id, next: next || '#sozlamalar' };
    }
    const username = pickOAuthUsername(profile.login, profile.email, provider);
    const r = q.insertOAuthUser.run(username, crypto.randomBytes(16), Buffer.alloc(0), Date.now());
    const userId = Number(r.lastInsertRowid);
    q.insertOAuth.run(provider, profile.providerId, userId, profile.email, profile.login, Date.now());
    db.exec('COMMIT');
    return { created: true, userId, next: next || '#bosh' };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function handleOAuthStart(req, res, provider, url) {
  const origin = requestOrigin(req);
  const cfg = oauthConfig(provider);
  if (!cfg) return redirect(res, `${origin}/?oauth_error=not_configured&provider=${provider}#/kirish`);
  const ip = clientIp(req);
  if (tooMany(oauthLimit, ip, 30, 600000)) return redirect(res, `${origin}/?oauth_error=rate_limit&provider=${provider}#/kirish`);
  hit(oauthLimit, ip, 600000);
  if (oauthStates.size > 5000) pruneMap(oauthStates);

  const state = crypto.randomBytes(24).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const next = safeNextHash(url.searchParams.get('next'), '#bosh');
  oauthStates.set(sha(state), { provider, verifier, next, expiresAt: Date.now() + 10 * 60000 });
  res.setHeader('Set-Cookie', oauthCookie(state, 600));

  const redirectUri = `${origin}/api/auth/${provider}/callback`;
  const params = new URLSearchParams({
    client_id: cfg.id,
    redirect_uri: redirectUri,
    state,
  });
  if (provider === 'google') {
    params.set('response_type', 'code');
    params.set('scope', 'openid email profile');
    params.set('code_challenge', challenge);
    params.set('code_challenge_method', 'S256');
    params.set('prompt', 'select_account');
  } else {
    params.set('scope', 'read:user user:email');
  }
  return redirect(res, `${OAUTH_ENDPOINTS[provider].auth}?${params.toString()}`);
}

async function handleOAuthCallback(req, res, provider, url) {
  const origin = requestOrigin(req);
  const fail = (code, next = '#/kirish') => {
    res.setHeader('Set-Cookie', oauthCookie('', 0));
    return redirect(res, `${origin}/?oauth_error=${encodeURIComponent(code)}&provider=${provider}${next}`);
  };
  const cfg = oauthConfig(provider);
  if (!cfg) return fail('not_configured');
  const err = url.searchParams.get('error');
  if (err) return fail(err === 'access_denied' ? 'cancelled' : 'provider_error');

  const state = url.searchParams.get('state') || '';
  const cookieState = oauthCookieToken(req);
  const stateMatches =
    state &&
    cookieState &&
    state.length === cookieState.length &&
    crypto.timingSafeEqual(Buffer.from(state), Buffer.from(cookieState));
  if (!stateMatches) return fail('invalid_state');
  const key = sha(state);
  const entry = oauthStates.get(key);
  oauthStates.delete(key);
  if (!entry || entry.provider !== provider || entry.expiresAt < Date.now()) {
    return fail('invalid_state');
  }

  const code = url.searchParams.get('code') || '';
  if (!code) return fail('provider_error');

  try {
    const redirectUri = `${origin}/api/auth/${provider}/callback`;
    const profile =
      provider === 'google'
        ? await exchangeGoogle(code, entry.verifier, redirectUri, cfg)
        : await exchangeGitHub(code, redirectUri, cfg);
    const signedIn = currentUser(req);
    const result = resolveOAuthUser(provider, profile, signedIn, entry.next);
    if (result.error) return fail(result.error, result.next);
    if (result.linked) {
      res.setHeader('Set-Cookie', oauthCookie('', 0));
      return redirect(res, `${origin}/?oauth=linked&provider=${provider}${result.next}`);
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    q.insertSession.run(sha(token), result.userId, now, now + SESSION_DAYS * 86400000, deviceLabel(req?.headers?.['user-agent']), now);
    res.setHeader('Set-Cookie', [cookie(token, SESSION_DAYS * 86400), oauthCookie('', 0)]);
    return redirect(res, `${origin}/${result.next}`);
  } catch (e) {
    console.error(`OAuth (${provider}) xatosi:`, e.message);
    return fail('provider_error');
  }
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

// ---------- http helpers (imported from lib/http.mjs) ----------

function requireUser(req) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, 'Avval tizimga kiring.');
  return user;
}

function requireAdmin(req) {
  const user = requireUser(req);
  if (!isAdminUser(user)) throw new HttpError(403, 'Faqat administrator uchun.');
  return user;
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

async function api(req, res, pathname, url) {
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    checkOrigin(req);
    if (!(req.headers['content-type'] || '').startsWith('application/json') && method !== 'DELETE') throw new HttpError(415, 'JSON kerak.');
  }

  const ip = clientIp(req);
  if (tooMany(globalLimit, ip, 300, 60000)) throw new HttpError(429, "Juda ko'p so'rov. Bir daqiqadan keyin qayta urinib ko'ring.");
  hit(globalLimit, ip, 60000);

  const demoAllowed = LOOPBACK.test(req.socket.remoteAddress || '') && process.env.ENABLE_DEMO_AUTH === '1';

  if (pathname === '/api/auth/providers' && method === 'GET') {
    return send(res, 200, {
      google: Boolean(oauthConfig('google')),
      github: Boolean(oauthConfig('github')),
      demo: demoAllowed,
    });
  }

  if (pathname === '/api/auth/demo' && method === 'POST') {
    if (!demoAllowed) {
      throw new HttpError(403, "Demo kirish o'chirilgan. Haqiqiy hisob oching yoki tizimga kiring.");
    }
    const { provider } = await readJSON(req);
    const p = oneOf(provider, ['google', 'github'], '');
    if (!p) throw new HttpError(400, 'Provayder tanlang.');
    if (oauthConfig(p)) throw new HttpError(400, "Haqiqiy OAuth kalitlari sozlangan — asosiy tugmadan foydalaning.");
    const result = resolveOAuthUser(
      p,
      { providerId: `demo_${p}`, email: `demo.${p}@mizan.local`, login: `demo_${p}` },
      currentUser(req),
      '#bosh',
    );
    if (result.error) throw new HttpError(409, "Bu demo hisobi boshqa foydalanuvchiga ulangan.");
    if (!result.linked) startSession(res, result.userId, req);
    return send(res, 200, { ok: true, demo: true, linked: Boolean(result.linked), user: userPayload(q.userById.get(result.userId)) });
  }

  const oauthStart = /^\/api\/auth\/(google|github)$/.exec(pathname);
  if (oauthStart && method === 'GET') return handleOAuthStart(req, res, oauthStart[1], url);

  const oauthCb = /^\/api\/auth\/(google|github)\/callback$/.exec(pathname);
  if (oauthCb && method === 'GET') return handleOAuthCallback(req, res, oauthCb[1], url);

  const oauthDel = /^\/api\/auth\/oauth\/(google|github)$/.exec(pathname);
  if (oauthDel && method === 'DELETE') {
    const user = requireUser(req);
    const provider = oauthDel[1];
    const row = q.userById.get(user.id);
    const linked = q.oauthByUser.all(user.id);
    const others = linked.filter((o) => o.provider !== provider);
    if (row.has_password === 0 && others.length === 0) {
      throw new HttpError(400, "Oxirgi kirish usulini uzib bo'lmaydi. Avval parol o'rnating.");
    }
    q.deleteOAuthByUserProvider.run(user.id, provider);
    return send(res, 200, { ok: true, user: userPayload(q.userById.get(user.id)) });
  }

  if (pathname === '/api/health' && method === 'GET') {
    try {
      db.prepare('SELECT 1').get();
      return send(res, 200, { ok: true, db: 'ok', schemaVersion: SCHEMA_VERSION, uptimeSec: Math.round(process.uptime()) });
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

  if (pathname === '/api/cards' && method === 'GET') {
    const user = requireUser(req);
    const cards = q.listCards.all(user.id).map((c) => ({
      id: c.id, label: c.label, network: c.network, last4: c.last4, balance: c.balance, createdAt: c.created_at,
    }));
    return send(res, 200, { revision: q.revision.get(user.id).revision, cards });
  }

  if (pathname === '/api/cards' && method === 'POST') {
    const user = requireUser(req);
    if (tooMany(writeLimit, `u${user.id}`, 30, 60000)) throw new HttpError(429, "Juda tez-tez saqlayapsiz. Bir daqiqadan keyin qayta urinib ko'ring.");
    hit(writeLimit, `u${user.id}`, 60000);
    const body = await readJSON(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, "Ma'lumot noto'g'ri.");
    const badKey = findForbiddenCardKey(body);
    if (badKey) throw new HttpError(400, "Xavfsizlik qoidasi: to'liq karta raqami, amal qilish muddati, PIN yoki CVV kiritilmaydi.");
    const card = sanitizeCard(body, crypto.randomUUID());
    let revision;
    db.exec('BEGIN IMMEDIATE');
    try {
      if (q.countCards.get(user.id).n >= LIMITS.cards) throw new HttpError(400, `Ko'pi bilan ${LIMITS.cards} ta karta qo'shish mumkin.`);
      if (q.cardById.get(user.id, card.id)) throw new HttpError(409, 'Bu karta allaqachon mavjud.');
      q.insCard.run(user.id, card.id, card.label, card.network, card.last4, card.balance, card.createdAt);
      q.bump.run(user.id);
      revision = q.revision.get(user.id).revision;
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return send(res, 201, { card, revision });
  }

  const cardMatch = /^\/api\/cards\/([a-zA-Z0-9_-]{1,64})$/.exec(pathname);
  if (cardMatch && method === 'PATCH') {
    const user = requireUser(req);
    if (tooMany(writeLimit, `u${user.id}`, 30, 60000)) throw new HttpError(429, "Juda tez-tez saqlayapsiz. Bir daqiqadan keyin qayta urinib ko'ring.");
    hit(writeLimit, `u${user.id}`, 60000);
    const body = await readJSON(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, "Ma'lumot noto'g'ri.");
    const badKey = findForbiddenCardKey(body);
    if (badKey) throw new HttpError(400, "Xavfsizlik qoidasi: to'liq karta raqami, amal qilish muddati, PIN yoki CVV kiritilmaydi.");
    let updated;
    let revision;
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = q.cardById.get(user.id, cardMatch[1]);
      if (!existing) throw new HttpError(404, 'Karta topilmadi.');
      updated = sanitizeCard({
        id: existing.id,
        label: body.label !== undefined ? body.label : existing.label,
        network: body.network !== undefined ? body.network : existing.network,
        last4: body.last4 !== undefined ? body.last4 : existing.last4,
        balance: body.balance !== undefined ? body.balance : existing.balance,
        createdAt: existing.created_at,
      });
      q.updateCard.run(updated.label, updated.network, updated.last4, updated.balance, user.id, existing.id);
      q.bump.run(user.id);
      revision = q.revision.get(user.id).revision;
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return send(res, 200, { card: updated, revision });
  }

  if (cardMatch && method === 'DELETE') {
    const user = requireUser(req);
    if (tooMany(writeLimit, `u${user.id}`, 30, 60000)) throw new HttpError(429, "Juda tez-tez saqlayapsiz. Bir daqiqadan keyin qayta urinib ko'ring.");
    hit(writeLimit, `u${user.id}`, 60000);
    let revision;
    db.exec('BEGIN IMMEDIATE');
    try {
      const r = q.deleteCard.run(user.id, cardMatch[1]);
      if (!r.changes) throw new HttpError(404, 'Karta topilmadi.');
      q.bump.run(user.id);
      revision = q.revision.get(user.id).revision;
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return send(res, 200, { ok: true, revision });
  }

  if (pathname === '/api/export' && method === 'GET') {
    const user = requireUser(req);
    const data = loadAll(user.id);
    const stamp = new Date().toISOString().slice(0, 10);
    return send(
      res,
      200,
      {
        app: 'mizan',
        version: 3,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        user: { id: user.id, username: user.username },
        ...data,
      },
      { 'Content-Disposition': `attachment; filename="mizan-export-${stamp}.json"` },
    );
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

  if (pathname === '/api/admin/overview' && method === 'GET') {
    requireAdmin(req);
    const scalar = (sql, ...p) => Number(Object.values(db.prepare(sql).get(...p))[0] || 0);
    const since7d = Date.now() - 7 * 86400000;
    return send(res, 200, {
      schemaVersion: SCHEMA_VERSION,
      host: HOST,
      port: PORT,
      demoEnabled: LOOPBACK.test(req.socket.remoteAddress || '') && process.env.ENABLE_DEMO_AUTH === '1',
      providers: {
        google: Boolean(oauthConfig('google')),
        github: Boolean(oauthConfig('github')),
      },
      telegram: {
        configured: Boolean(BOT_TOKEN),
        username: BOT_USERNAME,
      },
      counts: {
        users: scalar('SELECT COUNT(*) FROM users'),
        active7d: scalar('SELECT COUNT(DISTINCT user_id) FROM sessions WHERE COALESCE(last_seen, created_at) > ?', since7d),
        transactions: scalar('SELECT COUNT(*) FROM transactions'),
        debts: scalar('SELECT COUNT(*) FROM debts'),
        goals: scalar('SELECT COUNT(*) FROM goals'),
        cards: scalar('SELECT COUNT(*) FROM cards'),
        telegramChats: scalar('SELECT COUNT(*) FROM telegram_chats'),
        openTickets: scalar("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'"),
      },
    });
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    requireAdmin(req);
    const rawQ = str(url.searchParams.get('q') || '', 32).trim();
    const escaped = rawQ.replace(/[\\%_]/g, '\\$&');
    const like = rawQ ? `%${escaped}%` : '';
    const rows = q.adminUsers.all(rawQ, like).map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: Number(u.is_admin) === 1 || adminNameSet().has(String(u.username || '').toLowerCase()),
      hasPassword: u.has_password !== 0,
      hasRecovery: Boolean(u.has_recovery),
      revision: u.revision,
      txCount: u.tx_count,
      cardCount: u.card_count,
      telegramLinked: Boolean(u.tg_linked),
      providers: u.providers ? String(u.providers).split(',') : [],
      createdAt: u.created_at,
      lastSeen: u.last_seen || u.created_at,
    }));
    return send(res, 200, { users: rows });
  }

  if (pathname === '/api/admin/users/role' && method === 'POST') {
    const admin = requireAdmin(req);
    const body = await readJSON(req);
    if (typeof body.isAdmin !== 'boolean') throw new HttpError(400, 'isAdmin qiymatini kiriting.');
    const target = body.userId
      ? q.userById.get(int(body.userId))
      : typeof body.username === 'string' && body.username.trim()
        ? q.userByName.get(body.username.trim())
        : null;
    if (!target) throw new HttpError(404, 'Foydalanuvchi topilmadi.');
    if (target.id === admin.id && !body.isAdmin) {
      throw new HttpError(400, "O'zingizdan admin huquqini ololmaysiz.");
    }
    q.setAdminRole.run(body.isAdmin ? 1 : 0, target.id);
    return send(res, 200, { ok: true, user: userPayload(q.userById.get(target.id)) });
  }

  if (pathname === '/api/admin/backups' && method === 'GET') {
    requireAdmin(req);
    return send(res, 200, { backups: listBackups(), memoryOnly: DB_PATH === ':memory:' });
  }

  if (pathname === '/api/admin/backup' && method === 'POST') {
    const admin = requireAdmin(req);
    if (DB_PATH === ':memory:') throw new HttpError(400, 'Xotira bazasida fayl zaxirasi olinmaydi.');
    const bKey = `backup|${admin.id}`;
    if (tooMany(writeLimit, bKey, 3, 60000)) throw new HttpError(429, "Zaxira nusxa tez-tez olinmoqda. Bir daqiqa kuting.");
    hit(writeLimit, bKey, 60000);
    const file = backupNow();
    return send(res, 200, { ok: true, file: file ? path.basename(file) : '', backups: listBackups() });
  }

  if (pathname === '/api/admin/tickets' && method === 'GET') {
    requireAdmin(req);
    return send(res, 200, {
      tickets: q.adminTickets.all().map((t) => ({
        id: t.id,
        category: t.category,
        message: t.message,
        contact: t.contact,
        context: t.context,
        status: t.status,
        reply: t.reply,
        username: t.username || '',
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  }

  if (pathname === '/api/admin/tickets/reply' && method === 'POST') {
    requireAdmin(req);
    const body = await readJSON(req);
    const id = int(body.id);
    const status = oneOf(body.status, ['answered', 'closed', 'open'], 'answered');
    const reply = str(body.reply, 2000).trim();
    if (id <= 0) throw new HttpError(400, 'Murojaat raqamini kiriting.');
    if (status === 'answered' && !reply) throw new HttpError(400, 'Javob matnini kiriting.');
    const r = q.replyTicket.run(status, reply, reply, Date.now(), id);
    if (!r.changes) throw new HttpError(404, 'Murojaat topilmadi.');
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/password' && method === 'POST') {
    const user = requireUser(req);
    const { oldPassword, newPassword } = await readJSON(req);
    assertStrong(newPassword, user.username);
    const row = q.userByName.get(user.username);
    if (row.has_password !== 0) {
      const key = `${ip}|pw|${user.id}`;
      if (tooMany(attempts, key, 8, 600000)) throw new HttpError(429, "Juda ko'p xato urinish. 10 daqiqadan keyin qayta urinib ko'ring.");
      if (typeof oldPassword !== 'string' || !(await verifyPassword(row, oldPassword))) {
        hit(attempts, key, 600000);
        throw new HttpError(401, "Joriy parol noto'g'ri.");
      }
      attempts.delete(key);
    }
    const { salt, hash } = await hashPassword(newPassword);
    q.setPassword.run(salt, hash, user.id);
    q.deleteOtherSessions.run(user.id, sha(sessionToken(req)));
    let recoveryCode = null;
    if (!row.recovery_hash) recoveryCode = await issueRecoveryCode(user.id);
    return send(res, 200, { ok: true, ...(recoveryCode ? { recoveryCode } : {}), user: userPayload(q.userById.get(user.id)) });
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
    assertStrong(password, username);
    if (q.userByName.get(username)) throw new HttpError(409, 'Bu nom band.');
    const { salt, hash } = await hashPassword(password);
    let id;
    try {
      const r = q.insertUser.run(username, salt, hash, Date.now());
      id = Number(r.lastInsertRowid);
    } catch (e) {
      if (e?.code === 'ERR_SQLITE_CONSTRAINT' || /UNIQUE constraint/i.test(e?.message || '')) {
        throw new HttpError(409, 'Bu nom band.');
      }
      throw e;
    }
    hit(registrations, ip, 3600000);
    const recoveryCode = await issueRecoveryCode(id);
    startSession(res, id, req);
    return send(res, 201, { user: userPayload(q.userById.get(id)), recoveryCode });
  }

  if (pathname === '/api/recovery-code' && method === 'POST') {
    const user = requireUser(req);
    const { password } = await readJSON(req);
    const row = q.userByName.get(user.username);
    if (row.has_password === 0) throw new HttpError(400, "Tiklash kodi olish uchun avval parol o'rnating.");
    if (typeof password !== 'string' || !(await verifyPassword(row, password))) throw new HttpError(401, "Parol noto'g'ri.");
    return send(res, 200, { recoveryCode: await issueRecoveryCode(user.id) });
  }

  if (pathname === '/api/recover' && method === 'POST') {
    const { username, code, newPassword } = await readJSON(req);
    if (typeof username !== 'string' || typeof code !== 'string') throw new HttpError(400, 'Nom va tiklash kodini kiriting.');
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
    return send(res, 200, { user: userPayload(q.userById.get(user.id)), recoveryCode });
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
    return send(res, 200, { user: userPayload(q.userById.get(user.id)) });
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
    return send(res, 200, { user: userPayload(user) });
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(400, "Ma'lumot tuzilmasi noto'g'ri.");
    }
    const force = body.force === true;
    const baseRev = Number(body.baseRevision);
    if (!force && (!Number.isInteger(baseRev) || baseRev < 0)) {
      throw new HttpError(400, "baseRevision noto'g'ri.");
    }
    try {
      const revision = saveAll(user.id, baseRev, body, force);
      return send(res, 200, { revision });
    } catch (e) {
      if (e instanceof Conflict) throw new HttpError(409, "Boshqa qurilmada ma'lumot o'zgargan.", { server: loadAll(user.id) });
      throw e;
    }
  }

  if (pathname === '/api/account' && method === 'DELETE') {
    const user = requireUser(req);
    const { password, confirmUsername } = await readJSON(req);
    const row = q.userByName.get(user.username);
    if (row.has_password === 0) {
      if (typeof confirmUsername !== 'string' || confirmUsername.trim().toLowerCase() !== user.username.toLowerCase()) {
        throw new HttpError(400, "Tasdiqlash uchun foydalanuvchi nomingizni kiriting.");
      }
    } else if (typeof password !== 'string' || !(await verifyPassword(row, password))) {
      throw new HttpError(401, "Parol noto'g'ri.");
    }
    q.deleteUser.run(user.id);
    res.setHeader('Set-Cookie', cookie('', 0));
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/ai/jarvis') {
    if (req.method !== 'POST') throw new HttpError(405, 'Faqat POST ruxsat etilgan.');
    const body = await readJSON(req, SMALL_BODY);
    const { prompt, context } = body || {};
    if (!prompt || typeof prompt !== 'string') throw new HttpError(400, "Savol matni kiritilmagan.");
    const result = await askJarvisAI({ prompt, context, apiKey: process.env.GEMINI_API_KEY });
    return send(res, 200, result);
  }

  if (pathname === '/api/ai/health-score') {
    if (req.method !== 'POST') throw new HttpError(405, 'Faqat POST ruxsat etilgan.');
    const body = await readJSON(req, SMALL_BODY);
    const result = computeFinancialHealth(body || {});
    return send(res, 200, result);
  }

  throw new HttpError(404, 'Topilmadi.');
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'self'",
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
};

export const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (SECURE_COOKIE) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  try {
    let url;
    try {
      url = new URL(req.url || '/', 'http://localhost');
    } catch {
      throw new HttpError(400, "Noto'g'ri manzil.");
    }
    const { pathname } = url;
    if (pathname.startsWith('/api/')) return await api(req, res, pathname, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Ruxsat etilmagan.');
    return serveStatic(req, res, pathname, STATIC_DIR);
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

const purgeTimer = setInterval(() => {
  try {
    const now = Date.now();
    q.purgeSessions.run(now);
    db.prepare('DELETE FROM telegram_links WHERE expires_at <= ?').run(now);
  } catch (e) {
    console.error('Muddati otgan sessiyalarni tozalashda xato:', e?.message || e);
  }
}, 3600000);
purgeTimer.unref();

const pruneTimer = setInterval(pruneLimits, 10 * 60000);
pruneTimer.unref();

// Daily-ish safety copy of the database (VACUUM INTO makes a consistent snapshot even while the server runs).
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const KEEP_BACKUPS = 7;

function listBackups() {
  if (DB_PATH === ':memory:' || !fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^pulim-\d{12}\.db$/.test(f))
    .sort()
    .reverse()
    .map((name) => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, sizeBytes: st.size, createdAt: Math.trunc(st.mtimeMs) };
    });
}

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
  let stopBot = null;
  server.listen(PORT, HOST, () => {
    console.log(`Mizan server: http://localhost:${PORT}  (baza: ${DB_PATH}${HOST === '127.0.0.1' ? ', faqat shu kompyuterdan' : `, ochiq: ${HOST}`})`);
    if (BOT_TOKEN) {
      import('./bot.mjs')
        .then((m) => {
          stopBot = m.startBot(BOT_TOKEN);
        })
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
  const backupTimer = setInterval(() => {
    try {
      backupNow();
    } catch (e) {
      console.error('Zaxira nusxa olinmadi:', e.message);
    }
  }, 6 * 3600000);
  backupTimer.unref();

  const shutdown = () => {
    clearInterval(purgeTimer);
    clearInterval(pruneTimer);
    clearInterval(backupTimer);
    try { stopBot?.(); } catch {}
    server.close(() => {
      try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      } catch {
        // ignore if readonly or :memory:
      }
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
