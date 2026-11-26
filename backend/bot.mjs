import { Conflict, allChats, consumeLinkCode, loadAll, saveAll, unlinkChat, userForChat } from './server.mjs';
import { respond } from '../frontend/src/lib/assistant/assistant.js';
import { adviceText } from '../frontend/src/lib/assistant/advice.js';
import { isAmbiguous, scanNumbers } from '../frontend/src/lib/assistant/nlp.js';
import { categoryLabel, categoryOf, methodLabel } from '../frontend/src/lib/categories.js';
import { inRange, periodRange, summarize } from '../frontend/src/lib/finance.js';
import { addDays, dateLabel, money, monthLabel, todayISO, uid } from '../frontend/src/lib/format.js';
import { buildAdvice } from '../frontend/src/lib/insights.js';
import { dailyPlan } from '../frontend/src/lib/plan.js';
import { normalize } from '../frontend/src/lib/text.js';

// Telegram is a second channel on the same account and database as the site: the same assistant brain,
// the same daily-plan formula. Nothing is saved until the user presses "Saqlash".

const COMMANDS = [
  ['reja', "Bugun qancha sarflash mumkin"],
  ['bugun', 'Bugun yozilganlar'],
  ['hafta', 'Oxirgi 7 kun hisoboti'],
  ['hisobot', 'Shu oy hisoboti'],
  ['kartalar', 'Kartalar va hamyonlar'],
  ['ochir', "Oxirgi yozuvni o'chirish (tasdiq bilan)"],
  ['qarz', 'Qarzlar'],
  ['maqsad', 'Jamg\'arma maqsadlari'],
  ['maslahat', 'Qayerda kamaytirish mumkin'],
  ['pul', 'Hozirgi pulni yangilash: /pul 850000'],
  ['daromad', 'Keyingi daromad sanasi: /daromad 2026-12-04'],
  ['eslatma', 'Kunlik eslatma: /eslatma 21:00 yoki /eslatma off'],
  ['uzish', 'Telegramni hisobdan uzish'],
  ['yordam', "Yordam"],
];

const WELCOME =
  "Assalomu alaykum! Men Mizan botiman: xarajatni yozib, bugungi rejani ko'rsataman.\n\n" +
  "Boshlash uchun hisobingizga ulaning:\n1. Saytda Sozlamalar → Telegram → «Ulash kodini olish».\n2. Shu yerga yozing: /ulash KOD\n\n" +
  "Ulangach, shunchaki yozing: «non 5000», «Bugun yo'lga 12 ming sarfladim» yoki savol bering. Ovozli xabarni hozircha tushuna olmayman.";

const HELP =
  "Yozing: «non 5000» yoki «Bugun yo'lga 12 ming sarfladim». Men yozuvni tayyorlayman, siz «Saqlash» ni bosmaguncha hech narsa saqlanmaydi.\n\n" +
  COMMANDS.map(([c, d]) => `/${c} — ${d}`).join('\n') +
  "\n\nO'zbek (lotin va kirill), rus va ingliz tilida yozish mumkin.";

const NEED_LINK = "Avval hisobingizga ulaning: saytda Sozlamalar → Telegram → «Ulash kodini olish», keyin shu yerga /ulash KOD yozing.";

function mutate(userId, fn) {
  for (let i = 0; i < 3; i++) {
    const d = loadAll(userId);
    if (fn(d) === false) return false;
    try {
      saveAll(userId, d.revision, d, false);
      return true;
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
    }
  }
  return false;
}

function applyDraft(d, draft) {
  const x = draft.data;
  if (draft.kind === 'tx') d.transactions.push({ id: uid(), ...x, createdAt: Date.now() });
  else if (draft.kind === 'debt') d.debts.push({ id: uid(), ...x, createdAt: Date.now(), payments: [] });
  else if (draft.kind === 'payment') {
    const debt = d.debts.find((y) => y.id === x.debtId);
    if (!debt) return false;
    debt.payments.push({ id: uid(), amount: x.amount, date: x.date, at: Date.now() });
  } else if (draft.kind === 'goalAdd') {
    const g = d.goals.find((y) => y.id === x.goalId);
    if (!g) return false;
    g.saved += x.amount;
    g.adds = [...(g.adds || []), { amount: x.amount, at: Date.now() }];
  } else return false;
  return true;
}

function draftText(draft) {
  const x = draft.data;
  if (draft.kind === 'tx') {
    return [
      x.type === 'income' ? 'DAROMAD' : 'XARAJAT',
      `Nomi: ${x.title}`,
      `Summa: ${money(x.amount)}`,
      `Toifa: ${categoryLabel(x.category)}`,
      `Sana: ${dateLabel(x.date)}`,
      `To'lov usuli: ${methodLabel(x.method)}`,
    ].join('\n');
  }
  if (draft.kind === 'debt') {
    return [x.direction === 'lent' ? 'QARZ BERDIM' : 'QARZ OLDIM', `Odam: ${x.person}`, `Summa: ${money(x.amount)}`, `Sana: ${dateLabel(x.date)}`, `Muddat: ${x.dueDate ? dateLabel(x.dueDate) : 'belgilanmagan'}`].join('\n');
  }
  if (draft.kind === 'payment') return ['QARZ QAYTARILDI', `Odam: ${x.person}`, `Summa: ${money(x.amount)}`, `Sana: ${dateLabel(x.date)}`].join('\n');
  return ["MAQSADGA QO'SHISH", `Maqsad: ${x.goalName}`, `Summa: ${money(x.amount)}`].join('\n');
}

function planText(d, day) {
  const p = dailyPlan({ profile: d.profile, transactions: d.transactions, debts: d.debts, goals: d.goals, today: day });
  if (p.status === 'need_cash' || p.status === 'need_income') {
    return "Kunlik reja uchun ikki narsa kerak: hozirgi pulingiz va keyingi daromad sanasi. Raqamni o'zim o'ylab topmayman.\nYozing: /pul 850000 va /daromad 2026-12-04 (yoki /daromad 9: 9 kundan keyin).";
  }
  if (p.status === 'income_passed') return "Daromad sanasi o'tib ketdi. Yangisini kiriting: /daromad 2026-12-04 (yoki /daromad 9).";
  const head = [`Hozirgi pul: ${money(p.cash)}`, `Zarur to'lovlar: −${money(p.billsSum)}`, `Qarz muddatlari: −${money(p.debtSum)}`, `Jamg'arma ajratmasi: −${money(p.goalSum)}`, `Erkin pul: ${money(p.remaining)}`].join('\n');
  if (p.status === 'deficit') {
    return `Reja yetmaydi: ${money(p.shortfall)} kam (daromadgacha ${p.days} kun). Kunlik summa chiqarmadim.\n\n${head}`;
  }
  return [
    `Bugun uchun qoldi: ${money(Math.max(p.leftToday, 0))}`,
    p.leftToday < 0 ? `Bugungi reja ${money(-p.leftToday)} ga oshdi, ertangi reja shunga qarab o'zgaradi.` : `(bugungi reja ${money(p.todayBudget)}, bugun yozilgan ${money(p.spentToday)})`,
    `Daromadgacha ${p.days} kun, o'rtacha ${money(p.perDay)} / kun.`,
    '',
    'Hisob qanday chiqdi:',
    head,
    `${money(p.remaining)} ÷ ${p.days} kun`,
    '',
    "Natija siz kiritgan ma'lumotga bog'liq, kafolatlangan mablag' emas.",
  ].join('\n');
}

function reportText(d, day) {
  const { from, to } = periodRange('month', day);
  const s = summarize(inRange(d.transactions, from, to));
  const lines = [`${monthLabel(day)}`, `Daromad: ${money(s.income)}`, `Xarajat: ${money(s.expense)}`, `Qoldiq: ${money(s.balance)}`];
  if (s.categories.length) {
    lines.push('', "Eng ko'p ketgan joylar:");
    s.categories.slice(0, 4).forEach((c, i) => lines.push(`${i + 1}. ${categoryOf(c.id).uz} — ${money(c.sum)} (${Math.round(c.pct * 100)}%)`));
  }
  return lines.join('\n');
}

function todayText(d, day) {
  const all = d.transactions.filter((t) => t.date === day);
  if (!all.length) return "Bugun hali yozuv yo'q. Yozing, masalan: «non 5000».";
  const lines = all.slice(0, 20).map((t) => `${t.type === 'income' ? '+' : '−'} ${t.title || categoryOf(t.category).uz}: ${money(t.amount)}`);
  if (all.length > 20) lines.push(`… yana ${all.length - 20} ta`);
  const spent = all.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  return [`Bugun (${dateLabel(day)}):`, ...lines, '', `Jami xarajat: ${money(spent)}`].join('\n');
}

function weekText(d, day) {
  const from = addDays(day, -6);
  const s = summarize(inRange(d.transactions, from, day));
  const lines = [`Oxirgi 7 kun (${dateLabel(from)} – ${dateLabel(day)})`, `Daromad: ${money(s.income)}`, `Xarajat: ${money(s.expense)}`];
  if (s.categories.length) {
    lines.push('', "Eng ko'p ketgan joylar:");
    s.categories.slice(0, 3).forEach((c, i) => lines.push(`${i + 1}. ${categoryOf(c.id).uz} — ${money(c.sum)}`));
  }
  return lines.join('\n');
}

const CARD_NET_LABEL = { uzcard: 'Uzcard', humo: 'Humo', visa: 'Visa', mastercard: 'Mastercard', naqd: 'Naqd hamyon', boshqa: 'Boshqa' };

function cardsText(d) {
  const cards = d.cards || [];
  if (!cards.length) {
    return "Hali karta yoki hamyon qo'shilmagan. Saytda «Kartalar» bo'limidan qo'shing (faqat nom, oxirgi 4 raqam va qoldiq saqlanadi).";
  }
  const lines = ['Kartalar va hamyonlar:'];
  let total = 0;
  let cardSum = 0;
  let cashSum = 0;
  for (const c of cards.slice(0, 20)) {
    const bal = Number(c.balance) || 0;
    total += bal;
    if (c.network === 'naqd') cashSum += bal;
    else cardSum += bal;
    const net = CARD_NET_LABEL[c.network] || 'Karta';
    const mask = c.network === 'naqd' ? 'naqd' : c.last4 ? `•••• ${c.last4}` : 'raqamsiz';
    lines.push(`• ${c.label} (${net}, ${mask}): ${money(bal)}`);
  }
  lines.push('', `Kartalar jami: ${money(cardSum)}`, `Naqd jami: ${money(cashSum)}`, `Umumiy qoldiq: ${money(total)}`);
  return lines.join('\n');
}

function parseDate(arg, day) {
  const a = arg.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  if (m) return a;
  m = /^(\d{1,2})[./](\d{1,2})$/.exec(a);
  if (m) {
    const y = Number(day.slice(0, 4));
    let iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (iso <= day) iso = `${y + 1}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return iso;
  }
  m = /^(\d{1,3})$/.exec(a);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 120) return addDays(day, Number(m[1]));
  return null;
}

const DRAFT_TTL_MS = 24 * 3600000;
const MAX_DRAFTS_PER_CHAT = 25;

export function createBot({ call, today = todayISO, clock = () => new Date() }) {
  const sessions = new Map();
  const linkTries = new Map();
  const S = (chat) => {
    if (sessions.size > 5000) {
      for (const [k, v] of sessions) {
        if (!v.pending && v.drafts.size === 0) sessions.delete(k);
        if (sessions.size <= 3000) break;
      }
    }
    if (!sessions.has(chat)) sessions.set(chat, { pending: null, drafts: new Map(), choices: [] });
    const s = sessions.get(chat);
    const cutoff = Date.now() - DRAFT_TTL_MS;
    for (const [id, dr] of s.drafts) {
      if ((dr._at || 0) < cutoff) s.drafts.delete(id);
    }
    while (s.drafts.size > MAX_DRAFTS_PER_CHAT) {
      const oldest = s.drafts.keys().next().value;
      s.drafts.delete(oldest);
    }
    return s;
  };

  const send = (chat, text, keyboard) =>
    call('sendMessage', { chat_id: chat, text, ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) });

  async function handleText(chat, userId, text) {
    const s = S(chat);
    const d = loadAll(userId);
    const { reply, pending } = respond(text, { data: d, today: today(), pending: s.pending });
    s.pending = pending;
    s.choices = reply.choices || [];
    if (reply.drafts?.length) {
      await send(chat, reply.text);
      const now = Date.now();
      for (const dr of reply.drafts) {
        dr._at = now;
        s.drafts.set(dr.id, dr);
        await send(chat, draftText(dr), [[{ text: 'Saqlash', callback_data: `ok:${dr.id}` }, { text: 'Bekor qilish', callback_data: `no:${dr.id}` }]]);
      }
      return;
    }
    const kb = s.choices.length ? s.choices.map((c, i) => [{ text: c, callback_data: `ch:${i}` }]) : undefined;
    await send(chat, reply.text, kb);
  }

  async function command(chat, userId, cmd, arg) {
    const day = today();
    if (cmd === 'reja') return send(chat, planText(loadAll(userId), day));
    if (cmd === 'hisobot') return send(chat, reportText(loadAll(userId), day));
    if (cmd === 'bugun') return send(chat, todayText(loadAll(userId), day));
    if (cmd === 'hafta') return send(chat, weekText(loadAll(userId), day));
    if (cmd === 'kartalar' || cmd === 'karta') return send(chat, cardsText(loadAll(userId)));
    if (cmd === 'ochir') {
      const last = loadAll(userId).transactions.filter((t) => !t.sample).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      if (!last) return send(chat, "O'chirish uchun yozuv yo'q.");
      return send(chat, `Oxirgi yozuv: ${last.type === 'income' ? '+' : '−'} ${last.title || categoryOf(last.category).uz}, ${money(last.amount)} (${dateLabel(last.date)}). O'chiraymi?`, [[{ text: "Ha, o'chir", callback_data: `dl:${last.id}` }, { text: "Yo'q", callback_data: 'dn:x' }]]);
    }
    if (cmd === 'qarz') return handleText(chat, userId, 'Qarzimdan qancha qoldi?');
    if (cmd === 'maqsad') return handleText(chat, userId, "Maqsadim uchun qancha yig'ishim kerak?");
    if (cmd === 'maslahat') {
      const d = loadAll(userId);
      return send(chat, adviceText(buildAdvice(d, day), 'uz'));
    }
    if (cmd === 'pul') {
      const n = scanNumbers(normalize(arg), 'uz').amounts[0];
      if (!n || isAmbiguous(n) || n.value < 0) return send(chat, "Summani to'liq yozing, masalan: /pul 850000 yoki /pul 850 ming");
      mutate(userId, (d) => {
        d.profile.cash = n.value;
        d.profile.cashDate = day;
        d.profile.cashSetAt = Date.now();
      });
      return send(chat, `Hozirgi pul: ${money(n.value)}. Rejani ko'rish: /reja`);
    }
    if (cmd === 'daromad') {
      const iso = parseDate(arg, day);
      if (!iso || iso <= day) return send(chat, "Sanani yozing: /daromad 2026-12-04, /daromad 04.12 yoki necha kundan keyin: /daromad 9 (ertadan boshlab bo'lishi kerak)");
      mutate(userId, (d) => {
        d.profile.nextIncome = iso;
      });
      return send(chat, `Keyingi daromad sanasi: ${dateLabel(iso)}. Rejani ko'rish: /reja`);
    }
    if (cmd === 'eslatma') {
      const a = arg.trim().toLowerCase();
      if (a === 'off' || a === "o'chirish" || a === 'ochirish') {
        mutate(userId, (d) => {
          d.profile.reminder.enabled = false;
        });
        return send(chat, "Kunlik eslatma o'chirildi.");
      }
      const m = /^(\d{1,2}):(\d{2})$/.exec(a);
      if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return send(chat, 'Vaqtni yozing: /eslatma 21:00 yoki /eslatma off');
      const time = `${m[1].padStart(2, '0')}:${m[2]}`;
      mutate(userId, (d) => {
        d.profile.reminder.enabled = true;
        d.profile.reminder.time = time;
      });
      return send(chat, `Kunlik eslatma yoqildi: ${time}. Kuniga bir marta so'rayman, yozgan yoki «xarajat bo'lmadi» deb belgilagan kuningizda yubormayman.`);
    }
    if (cmd === 'bekor') {
      S(chat).pending = null;
      return send(chat, 'Bekor qilindi.');
    }
    if (cmd === 'uzish') {
      unlinkChat(chat);
      sessions.delete(chat);
      return send(chat, "Telegram hisobdan uzildi. Ma'lumotingiz saytda qoldi. Qayta ulash: /ulash KOD");
    }
    return send(chat, HELP);
  }

  async function handleCallback(cb) {
    const chat = String(cb.message?.chat?.id ?? cb.from.id);
    const userId = userForChat(chat);
    await call('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
    if (!userId) return send(chat, NEED_LINK);
    const s = S(chat);
    const [kind, ref] = String(cb.data || '').split(':');
    const strip = () => call('editMessageReplyMarkup', { chat_id: chat, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    if (kind === 'ok' || kind === 'no') {
      const draft = s.drafts.get(ref);
      await strip();
      if (!draft) return send(chat, "Bu yozuvning muddati o'tgan. Qayta yozing.");
      s.drafts.delete(ref);
      if (kind === 'no') return send(chat, "Bekor qilindi, hech narsa saqlanmadi.");
      const ok = mutate(userId, (d) => applyDraft(d, draft));
      return send(chat, ok ? 'Saqlandi. Bugungi reja: /reja' : "Saqlab bo'lmadi: yozuv topilmadi yoki o'zgargan. Qayta urinib ko'ring.");
    }
    if (kind === 'dn') {
      await strip();
      return send(chat, "Bekor qilindi, yozuv o'chirilmadi.");
    }
    if (kind === 'dl') {
      await strip();
      let found = false;
      const ok = mutate(userId, (d) => {
        const n = d.transactions.length;
        d.transactions = d.transactions.filter((t) => t.id !== ref);
        found = d.transactions.length < n;
        return found;
      });
      return send(chat, ok && found ? "O'chirildi. Bugungi reja: /reja" : "Bu yozuv topilmadi (allaqachon o'chirilgan bo'lishi mumkin).");
    }
    if (kind === 'ch') {
      const text = s.choices[Number(ref)];
      await strip();
      if (!text) return send(chat, 'Tanlov muddati o\'tgan. Qayta yozing.');
      return handleText(chat, userId, text);
    }
    if (kind === 'ns') {
      await strip();
      const day = today();
      mutate(userId, (d) => {
        if (!d.profile.noSpend.includes(day)) d.profile.noSpend = [...d.profile.noSpend, day].sort();
      });
      return send(chat, "Yaxshi, bugun xarajat bo'lmagan deb belgiladim.");
    }
    return undefined;
  }

  async function handle(update) {
    if (update.callback_query) return handleCallback(update.callback_query);
    const msg = update.message;
    if (!msg || msg.chat?.type !== 'private') return undefined;
    const chat = String(msg.chat.id);
    const text = (msg.text || '').trim();

    if (!text) {
      if (msg.voice || msg.audio || msg.video_note) return send(chat, "Ovozli xabarni hozircha tushuna olmayman. Iltimos, yozib yuboring, masalan: «non 5000». (Kuchli o'zbekcha ovozni tanish keyingi bosqichda.)");
      return send(chat, 'Faqat matn qabul qilaman. Yozing, masalan: «non 5000».');
    }

    const cm = /^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(text);
    const cmd = cm ? cm[1].toLowerCase() : null;
    const arg = cm ? (cm[2] || '').trim() : '';

    if (cmd === 'start') return send(chat, WELCOME);
    if (cmd === 'yordam' || cmd === 'help') return send(chat, HELP);

    if (cmd === 'ulash') {
      const now = Date.now();
      if (linkTries.size > 5000) {
        for (const [k, v] of linkTries) if (v.until <= now) linkTries.delete(k);
      }
      const tries = linkTries.get(chat) || { n: 0, until: 0 };
      if (tries.until > now && tries.n >= 5) return send(chat, "Juda ko'p xato urinish. Bir soatdan keyin qayta urinib ko'ring.");
      const userId = arg ? consumeLinkCode(arg, chat) : null;
      if (!userId) {
        linkTries.set(chat, { n: tries.until > now ? tries.n + 1 : 1, until: tries.until > now ? tries.until : now + 3600000 });
        return send(chat, "Kod noto'g'ri yoki muddati o'tgan (10 daqiqa). Saytda yangi kod oling va /ulash KOD yozing.");
      }
      linkTries.delete(chat);
      return send(chat, "Ulandi! Endi yozing, masalan: «non 5000». Bugungi reja: /reja. Barcha buyruqlar: /yordam");
    }

    const userId = userForChat(chat);
    if (!userId) return send(chat, NEED_LINK);
    if (cmd) return command(chat, userId, cmd, arg);
    return handleText(chat, userId, text);
  }

  async function tick() {
    const now = clock();
    const day = today();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const { chat_id: chat, user_id: userId } of allChats()) {
      try {
        const d = loadAll(userId);
        const r = d.profile.reminder;
        if (!r.enabled || hhmm < r.time || r.last === day) continue;
        mutate(userId, (x) => {
          x.profile.reminder.last = day;
        });
        const done = d.transactions.some((t) => t.type === 'expense' && t.date === day) || d.profile.noSpend.includes(day);
        if (done) continue;
        await send(chat, "Bugun xarajat bo'ldimi? Shunchaki yozing, masalan: «non 5000». Bo'lmagan bo'lsa, tugmani bosing.", [[{ text: "Bugun xarajat bo'lmadi", callback_data: 'ns' }]]);
      } catch (e) {
        console.error(`Telegram eslatma xatosi (chat=${chat}):`, e?.message || e);
      }
    }
  }

  return { handle, tick, commands: COMMANDS };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startBot(token) {
  const ac = new AbortController();
  let stopped = false;

  const call = async (method, params = {}) => {
    const timeoutMs = method === 'getUpdates' ? 40000 : 12000;
    const signal = AbortSignal.any([ac.signal, AbortSignal.timeout(timeoutMs)]);
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
    });
    const j = await res.json();
    if (!j.ok) throw new Error(`${method}: ${j.description}`);
    return j.result;
  };
  const bot = createBot({ call });
  let offset = 0;

  call('getMe')
    .then((me) => console.log(`Telegram bot ishga tushdi: @${me.username}`))
    .catch((e) => console.error('Telegram bot tokeni ishlamadi:', e.message));
  call('setMyCommands', { commands: bot.commands.map(([command, description]) => ({ command, description })) }).catch(() => {});

  (async function loop() {
    while (!stopped) {
      try {
        const updates = await call('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
        for (const u of updates) {
          offset = u.update_id + 1;
          try {
            await bot.handle(u);
          } catch (e) {
            console.error('Bot xatosi:', e.message);
          }
        }
      } catch (e) {
        if (stopped || e?.name === 'AbortError') break;
        console.error('Telegram bilan aloqa xatosi:', e.message);
        await sleep(5000);
      }
    }
  })();

  const tickTimer = setInterval(() => bot.tick().catch((e) => console.error('Eslatma xatosi:', e.message)), 60000);
  tickTimer.unref();
  return () => {
    stopped = true;
    clearInterval(tickTimer);
    ac.abort();
  };
}
