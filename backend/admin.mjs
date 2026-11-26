import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

// Egasi uchun: foydalanuvchiga admin huquqini berish yoki olish.
//   npm run admin                     adminlar ro'yxati
//   npm run admin -- temur            temur ga admin huquqini berish
//   npm run admin -- temur off        admin huquqini olish

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(here, 'data', 'pulim.db');
const db = new DatabaseSync(DB_PATH);

try {
  try {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  } catch {
    // ustun allaqachon bor
  }

  const [name = '', mode = 'on'] = process.argv.slice(2);
  if (!name || name === '--list') {
    const admins = db.prepare('SELECT id, username, created_at FROM users WHERE is_admin = 1 ORDER BY id').all();
    if (!admins.length) console.log("Bazadan tayinlangan adminlar yo'q.");
    else for (const a of admins) console.log(`#${a.id} ${a.username}`);
  } else {
    const on = mode !== 'off' && mode !== '0' ? 1 : 0;
    const r = db.prepare('UPDATE users SET is_admin = ? WHERE username = ?').run(on, name.trim());
    if (!r.changes) {
      console.error(`Foydalanuvchi topilmadi: ${name}`);
      process.exitCode = 1;
    } else {
      console.log(`${name.trim()}: admin huquqi ${on ? 'yoqildi' : "o'chirildi"}.`);
    }
  }
} finally {
  db.close();
}
