// Mizan: bazani zaxira nusxadan tiklash.
//   npm run restore                      zaxiralar ro'yxati
//   npm run restore -- pulim-202611260300.db --yes   tanlangan nusxani tiklash
// Server o'chiq bo'lishi shart. Tiklashdan oldin hozirgi baza data/before-restore-*.db ga saqlanadi.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(here, 'data', 'pulim.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const PORT = Number(process.env.PORT || 8787);

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const name = args.find((a) => !a.startsWith('--'));

const backups = fs.existsSync(BACKUP_DIR)
  ? fs.readdirSync(BACKUP_DIR).filter((f) => /^pulim-\d{12}\.db$/.test(f)).sort().reverse()
  : [];

if (!name) {
  if (!backups.length) { console.log("Zaxira nusxa yo'q:", BACKUP_DIR); process.exit(0); }
  console.log('Zaxira nusxalar (yangisi tepada):');
  for (const f of backups) {
    const st = fs.statSync(path.join(BACKUP_DIR, f));
    console.log(`  ${f}  ${(st.size / 1024).toFixed(0)} KB`);
  }
  console.log('\nTiklash: npm run restore -- <fayl nomi> --yes');
  process.exit(0);
}

// Faqat zaxira papkasidagi oddiy fayl nomi qabul qilinadi (yo'l hujumiga qarshi).
if (!/^pulim-\d{12}\.db$/.test(name)) { console.error("Fayl nomi noto'g'ri. Ro'yxat uchun: npm run restore"); process.exit(1); }
const src = path.join(BACKUP_DIR, name);
if (!fs.existsSync(src)) { console.error('Topilmadi:', src); process.exit(1); }

// 1) Zaxira o'zi buzilmaganini tekshiramiz
{
  const t = new DatabaseSync(src, { readOnly: true });
  const r = Object.values(t.prepare('PRAGMA integrity_check').get())[0];
  const users = t.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  t.close();
  if (r !== 'ok') { console.error('Zaxira buzilgan:', r); process.exit(1); }
  console.log(`Zaxira sog'lom (${users} ta hisob).`);
}

// 2) Server ishlamayotganini tekshiramiz
try {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) });
  if (res.ok) { console.error(`Server hali ishlayapti (port ${PORT}). Avval uni va watchdog'ni to'xtating.`); process.exit(1); }
} catch { /* javob yo'q = server o'chiq */ }

if (!yes) { console.log('Hech narsa o\'zgarmadi. Tiklash uchun oxiriga --yes qo\'shing.'); process.exit(0); }

// 3) Hozirgi bazani saqlab, tiklaymiz
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (fs.existsSync(DB_PATH)) {
  const keep = path.join(path.dirname(DB_PATH), `before-restore-${Date.now()}.db`);
  fs.copyFileSync(DB_PATH, keep);
  console.log('Hozirgi baza saqlandi:', keep);
}
for (const ext of ['-wal', '-shm']) fs.rmSync(DB_PATH + ext, { force: true });
fs.copyFileSync(src, DB_PATH);
console.log('Tiklandi:', name, '->', DB_PATH);
console.log('Endi serverni qayta yoqing.');
