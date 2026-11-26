import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

// Egasi uchun: shikoyat va savollarni o'qish, javob berish, yopish.
//   npm run tickets                  ochiq murojaatlar
//   npm run tickets -- all           hammasi
//   npm run tickets -- reply 3 "Javob matni"
//   npm run tickets -- close 3

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(here, 'data', 'pulim.db');
const db = new DatabaseSync(DB_PATH);
const [cmd = 'open', a, ...rest] = process.argv.slice(2);
const fmt = (ms) => new Date(ms).toLocaleString('uz-UZ');
// Never print raw control characters from user text: they can spoof the terminal.
const safe = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

if (cmd === 'reply' || cmd === 'close') {
  const id = Number(a);
  if (!id) {
    console.error('Murojaat raqamini kiriting.');
    process.exit(1);
  }
  const reply = cmd === 'reply' ? rest.join(' ').trim() : '';
  if (cmd === 'reply' && !reply) {
    console.error('Javob matnini kiriting.');
    process.exit(1);
  }
  const status = cmd === 'reply' ? 'answered' : 'closed';
  const r = db
    .prepare("UPDATE support_tickets SET status = ?, reply = CASE WHEN ? != '' THEN ? ELSE reply END, updated_at = ? WHERE id = ?")
    .run(status, reply, reply, Date.now(), id);
  console.log(r.changes ? `#${id} yangilandi (${status}).` : `#${id} topilmadi.`);
} else {
  const rows = db
    .prepare(
      `SELECT t.*, u.username FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id ${cmd === 'all' ? '' : "WHERE t.status = 'open'"} ORDER BY t.id DESC LIMIT 100`,
    )
    .all();
  if (!rows.length) console.log(cmd === 'all' ? "Murojaat yo'q." : "Ochiq murojaat yo'q.");
  for (const t of rows) {
    console.log(`\n#${t.id} [${t.category}] ${t.status} · ${fmt(t.created_at)} · ${t.username ? `hisob: ${t.username}` : 'mehmon'}`);
    console.log(safe(t.message));
    if (t.contact) console.log(`Aloqa: ${safe(t.contact)}`);
    if (t.context) console.log(`Kontekst: ${safe(t.context)}`);
    if (t.reply) console.log(`Javob: ${safe(t.reply)}`);
  }
}
db.close();
