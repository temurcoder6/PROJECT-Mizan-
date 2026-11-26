import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.STATIC_DIR = new URL('./nonexistent', import.meta.url).pathname;
process.env.BOT_TOKEN = 'test-token';
process.env.BOT_USERNAME = '@pulim_test_bot';
const srv = await import('./server.mjs');
const { createBot } = await import('./bot.mjs');
await new Promise((r) => srv.server.listen(0, r));
const base = `http://localhost:${srv.server.address().port}`;

class Client {
  cookie = '';
  async call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }
}

let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ' + name); };

const sent = [];
const call = async (method, params) => { sent.push({ method, ...params }); return {}; };
const DAY = '2026-11-26';
const bot = createBot({ call, today: () => DAY, clock: () => new Date(`${DAY}T21:30:00`) });

let uidn = 1;
const say = (chat, text, type = 'private') => bot.handle({ update_id: uidn++, message: { chat: { id: chat, type }, text } });
const voice = (chat) => bot.handle({ update_id: uidn++, message: { chat: { id: chat, type: 'private' }, voice: { file_id: 'x' } } });
const press = (chat, data) => bot.handle({ update_id: uidn++, callback_query: { id: String(uidn), data, from: { id: chat }, message: { chat: { id: chat }, message_id: 7 } } });
const texts = () => sent.filter((m) => m.method === 'sendMessage');
const last = () => texts().at(-1);
const keyboardData = (m) => (m.reply_markup?.inline_keyboard || []).flat().map((b) => b.callback_data);

async function register(name) {
  const c = new Client();
  assert.equal((await c.call('POST', '/api/register', { username: name, password: 'bot-sinov-parol' })).status, 201);
  return c;
}

// ---- ulanmagan chat ----
await say(100, 'non 5000');
assert.match(last().text, /ulaning/i); ok('ulanmagan chat ma\'lumotga kira olmaydi, ulash yo\'riqnomasi beriladi');
await say(100, '/ulash NOTOGRI1');
assert.match(last().text, /noto'g'ri/); ok("noto'g'ri ulash kodi rad etiladi");
await say(-500, 'non 5000', 'group');
const before = texts().length;
await say(-500, '/reja', 'supergroup');
assert.equal(texts().length, before); ok('guruh xabarlariga javob berilmaydi (faqat shaxsiy chat)');

// ---- saytdan ulash ----
const anon = new Client();
assert.equal((await anon.call('GET', '/api/telegram/status')).status, 401);
assert.equal((await anon.call('POST', '/api/telegram/link', {})).status, 401); ok('ulash yo\'llari kirishsiz berilmaydi');
const a = await register('bot_a');
let r = await a.call('GET', '/api/telegram/status');
assert.deepEqual(r.data, { configured: true, username: 'pulim_test_bot', linked: false });
r = await a.call('POST', '/api/telegram/link', {});
assert.equal(r.status, 200); assert.match(r.data.code, /^[A-Z2-9]{8}$/); ok('ulash kodi beriladi, bot sozlanganligi va nomi ko\'rinadi');
const code = r.data.code;
await say(100, `/ulash ${code.toLowerCase()}`);
assert.match(last().text, /Ulandi/);
assert.equal((await a.call('GET', '/api/telegram/status')).data.linked, true); ok('kod bilan ulanadi (katta-kichik harfga qaramaydi), sayt holatni ko\'radi');
await say(200, `/ulash ${code}`);
assert.match(last().text, /noto'g'ri/); ok('bir martalik kod qayta ishlamaydi');

// ---- xarajat: qoralama, tasdiq ----
const rev0 = (await a.call('GET', '/api/revision')).data.revision;
await say(100, 'non 5000');
const card = last();
assert.match(card.text, /Summa: 5 000/); assert.match(card.text, /Toifa: Oziq-ovqat/);
assert.equal(srv.loadAll(1).transactions.length, 0); ok('xarajat qoralamasi tayyorlanadi, tasdiqdan oldin saqlanmaydi');
const okBtn = keyboardData(card).find((x) => x.startsWith('ok:'));
await press(100, okBtn);
let d = srv.loadAll(1);
assert.equal(d.transactions.length, 1); assert.equal(d.transactions[0].amount, 5000); assert.equal(d.transactions[0].date, DAY);
assert.ok((await a.call('GET', '/api/revision')).data.revision > rev0); ok('«Saqlash» bosilgach yozuv bazaga tushadi va sayt uchun revizya oshadi');
assert.equal((await a.call('GET', '/api/data')).data.transactions[0].title, 'non'); ok('saytdagi hisob shu yozuvni ko\'radi (bitta baza)');

await say(100, 'taksi 15000');
await press(100, keyboardData(last()).find((x) => x.startsWith('no:')));
assert.equal(srv.loadAll(1).transactions.length, 1); ok('«Bekor qilish» hech narsa saqlamaydi');

await say(100, '12 sarfladim');
assert.match(last().text, /so'mmi yoki/); ok('noaniq «12» ni taxmin qilmaydi, so\'raydi');
await press(100, 'ch:0');
await press(100, keyboardData(last()).find((x) => x.startsWith('ok:')));
d = srv.loadAll(1);
assert.equal(d.transactions.length, 2); assert.equal(d.transactions.find((t) => t.amount === 12000)?.amount, 12000); ok('aniqlashtirish tugmasidan keyin 12 000 yoziladi');

// ---- kunlik reja ----
await say(100, '/reja');
assert.match(last().text, /\/pul/); ok('ma\'lumot yetmasa raqam to\'qimaydi, nima kerakligini aytadi');
await say(100, '/pul 12');
assert.match(last().text, /to'liq yozing/);
await say(100, '/pul 850000');
await say(100, '/daromad 9');
await say(100, '/reja');
assert.match(last().text, /Bugun uchun qoldi: 94 444/); assert.match(last().text, /850 000 so'm ÷ 9 kun/); ok('/reja: 850 000 ÷ 9 = 94 444, hisobi bilan (saytdagi formula bilan bir xil)');
await say(100, '/daromad 2020-01-01');
assert.match(last().text, /Sanani yozing/); ok("o'tgan daromad sanasi rad etiladi");

// ---- savol-javob va hisobot ----
await say(100, "Pulim nimaga ko'p ketdi?");
assert.match(last().text, /Oziq-ovqat|Transport|ketdi|xarajat/i);
await say(100, '/hisobot');
assert.match(last().text, /Xarajat: 17 000/); ok('/hisobot va savol-javob shu foydalanuvchi ma\'lumotidan');
await say(100, 'Spent 15k on lunch yesterday');
assert.match(draftCheck(last()), /Summa: 15 000/); ok('inglizcha ham tushunadi');
function draftCheck(m) { return m.text; }

// ---- ovoz va boshqa foydalanuvchi ----
await voice(100);
assert.match(last().text, /ovozli xabarni hozircha tushuna olmayman/i); ok("ovozli xabarga halol javob (taxmin qilmaydi)");
const b = await register('bot_b');
const codeB = (await b.call('POST', '/api/telegram/link', {})).data.code;
await say(300, `/ulash ${codeB}`);
await say(300, '/hisobot');
assert.match(last().text, /Xarajat: 0/); ok("boshqa foydalanuvchi botda birinchisining ma'lumotini ko'rmaydi");

// ---- /bugun, /hafta, /ochir ----
await say(300, '/bugun');
assert.match(last().text, /yozuv yo'q/); ok("/bugun: bo'sh bo'lsa halol aytadi");
await say(100, '/bugun');
assert.match(last().text, /Jami xarajat/); ok('/bugun: bugungi yozuvlar va jami');
await say(100, '/hafta');
assert.match(last().text, /Oxirgi 7 kun/); ok('/hafta: 7 kunlik hisobot');
await say(300, '/ochir');
assert.match(last().text, /yozuv yo'q/); ok("/ochir: yozuv bo'lmasa o'chirmaydi");
const countA = (await a.call('GET', '/api/data')).data.transactions.length;
await say(100, '/ochir');
const delData = keyboardData(last()).find((x) => x.startsWith('dl:'));
assert.ok(delData); assert.equal((await a.call('GET', '/api/data')).data.transactions.length, countA); ok("/ochir: avval so'raydi, o'zi o'chirmaydi");
await press(300, delData);
assert.equal((await a.call('GET', '/api/data')).data.transactions.length, countA); ok("birovning chatidan boshqa hisobning yozuvini o'chirib bo'lmaydi");
await press(100, 'dn:x');
assert.equal((await a.call('GET', '/api/data')).data.transactions.length, countA); ok("«Yo'q» bossa o'chmaydi");
await press(100, delData);
assert.equal((await a.call('GET', '/api/data')).data.transactions.length, countA - 1); ok("tasdiqlasa o'chadi");
await press(100, delData);
assert.match(last().text, /topilmadi/); ok('ikkinchi marta bossa xavfsiz xabar beradi');

// ---- eslatma ----
await say(100, '/eslatma 21:00');
assert.match(last().text, /yoqildi/);
let n = texts().length;
await bot.tick();
assert.equal(texts().length, n); ok('bugun xarajat yozilgan bo\'lsa eslatma yubormaydi');
await say(300, '/eslatma 21:00');
n = texts().length;
await bot.tick();
const rem = texts().slice(n);
assert.equal(rem.length, 1); assert.equal(rem[0].chat_id, '300'); assert.match(rem[0].text, /Bugun xarajat bo'ldimi/);
assert.deepEqual(keyboardData(rem[0]), ['ns']); ok('xarajat yozmagan foydalanuvchiga kuniga bir marta yumshoq eslatma yuboradi');
n = texts().length;
await bot.tick();
assert.equal(texts().length, n); ok('bir kunda ikkinchi marta yubormaydi');
await press(300, 'ns');
assert.ok(srv.loadAll(2).profile.noSpend.includes(DAY)); ok('«Bugun xarajat bo\'lmadi» tugmasi belgilaydi');
await say(300, '/eslatma off');
assert.equal(srv.loadAll(2).profile.reminder.enabled, false);

// ---- uzish va hisobni o'chirish ----
await say(100, '/uzish');
assert.equal((await a.call('GET', '/api/telegram/status')).data.linked, false);
await say(100, 'non 5000');
assert.match(last().text, /ulaning/i); ok('/uzish dan keyin bot ma\'lumotga kirmaydi');
assert.equal((await b.call('POST', '/api/telegram/unlink', {})).status, 200);
assert.equal(srv.userForChat(300), null); ok('saytdan ham uzish mumkin');
await say(300, `/ulash ${(await b.call('POST', '/api/telegram/link', {})).data.code}`);
assert.equal((await b.call('DELETE', '/api/account', { password: 'bot-sinov-parol' })).status, 200);
assert.equal(srv.userForChat(300), null); ok("hisobni o'chirsa, Telegram ulanishi ham o'chadi");

console.log(`\n${passed} ta tekshiruv o'tdi`);
srv.server.close();
process.exit(0);
