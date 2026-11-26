import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

// Egasi uchun: umumiy ko'rsatkichlar (hech qanday shaxsiy yozuv chiqmaydi, faqat sonlar).
//   npm run stats
const here = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(process.env.DB_PATH || path.join(here, 'data', 'pulim.db'), { readOnly: true });
const n = (sql, ...p) => Object.values(db.prepare(sql).get(...p))[0];
const day = 86400000;
const now = Date.now();

const rows = [
  ['Hisoblar', n('SELECT COUNT(*) FROM users')],
  ['  oxirgi 7 kunda ochilgan', n('SELECT COUNT(*) FROM users WHERE created_at > ?', now - 7 * day)],
  ['  oxirgi 7 kunda faol (sessiya)', n('SELECT COUNT(DISTINCT user_id) FROM sessions WHERE COALESCE(last_seen, created_at) > ?', now - 7 * day)],
  ['Yozuvlar (jami)', n('SELECT COUNT(*) FROM transactions')],
  ['  yozuvi bor hisoblar', n('SELECT COUNT(DISTINCT user_id) FROM transactions')],
  ['Qarzlar', n('SELECT COUNT(*) FROM debts')],
  ['Maqsadlar', n('SELECT COUNT(*) FROM goals')],
  ['Telegramga ulangan hisoblar', n('SELECT COUNT(*) FROM telegram_chats')],
  ['Ochiq murojaatlar', n("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'")],
  ['Baza versiyasi', n('PRAGMA user_version')],
];
for (const [k, v] of rows) console.log(k.padEnd(34), v);
