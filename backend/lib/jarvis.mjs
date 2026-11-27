// Mizan AI — O'zbekistonning mustaqil fikrlovchi shaxsiy moliyaviy maslahatchisi (CFO)
// Jonli internet ma'lumotlari (MB kurslari, Bank.uz foizlari, Olcha.uz narxlari, veb-qidiruv) va Gemini 3 Flash bilan ishlaydi.

import { getLiveMarketContext, searchLiveInternet } from './liveMarket.mjs';
import { PARTNERS, resolvePartners } from './partners.mjs';

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

function buildPartnerCatalogText() {
  return Object.values(PARTNERS)
    .map((p) => `- ID="${p.id}": ${p.name} (${p.category}) — ${p.tagline}`)
    .join('\n');
}

function parseTagJson(text, tag) {
  const re = new RegExp(`${tag}:\\s*(\\{[^\\n]*\\}|\\[[^\\n]*\\])`, 'i');
  const m = text.match(re);
  if (!m) return { cleaned: text, value: null };
  let value = null;
  try {
    value = JSON.parse(m[1]);
  } catch {
    value = null;
  }
  const cleaned = text.replace(re, '').trim();
  return { cleaned, value };
}

function inferPartnersFromReply(text) {
  const s = String(text || '').toLowerCase();
  const hits = [];
  const rules = [
    ['tbc_salom', /salom card|tbc bank/i],
    ['tbc_osmon', /osmon card/i],
    ['uzum_karta', /uzum bank|uzum karta/i],
    ['anor_black', /anorbank|anor black/i],
    ['avo_platinum', /avo bank|avo platinum/i],
    ['ipak_visa', /ipak yo['‘]?li/i],
    ['kapital_bank', /kapitalbank/i],
    ['olcha_uz', /olcha\.uz|olcha/i],
    ['uzum_nasiya', /uzum nasiya|uzum market/i],
    ['asaxiy_uz', /asaxiy/i],
    ['alif_nasiya', /alif nasiya|alif shop/i],
    ['iman_pay', /iman pay/i],
    ['texnomart', /texnomart/i],
  ];
  for (const [id, rx] of rules) {
    if (rx.test(s)) hits.push(id);
    if (hits.length >= 3) break;
  }
  return resolvePartners(hits);
}

async function callGemini({ model, key, systemPrompt, contents, timeoutMs = 18000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 4096,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error('Bo‘sh javob qaytdi.');
  return text;
}

export async function askJarvisAI({ prompt, context = {}, history = [], apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: "Gemini API kaliti topilmadi. Iltimos, backend/.env faylida GEMINI_API_KEY sozlanganligini tekshiring.",
    };
  }

  const [liveMarket, liveSearch] = await Promise.all([
    getLiveMarketContext().catch(() => ''),
    searchLiveInternet(prompt).catch(() => ''),
  ]);

  const systemPrompt = `
Sen — "Mizan AI", O'zbekistondagi eng aqlli, mustaqil fikrlovchi shaxsiy moliyaviy strateg va cho'ntak CFO'san.
Sening vazifang: shunchaki umumiy gap aytish EMAS — foydalanuvchining real raqamlarini, jonli internet ma'lumotlarini va O'zbekiston moliya bozorini chuqur tahlil qilib, aniq hisob-kitob, qiyosiy variantlar va eng foydali harakat rejasini berish.

=== JONLI INTERNET MA'LUMOTLARI (BUGUNGI KUN HOLATI) ===
${liveMarket || "Jonli bank.uz/cbu ma'lumoti vaqtincha olinmadi, bazaviy bilimga tayan."}

${liveSearch ? `=== SAVOLGA OID JONLI QIDIRUV VA NARXLAR ===\n${liveSearch}\n` : ''}
=== O'ZBEKISTON BANKLARI, KARTALARI, OMONAT VA KREDITLARI (TO'LIQ ENSIKLOPEDIYA) ===
1. Raqamli va yetakchi tijorat banklari:
   - **Uzum Bank**: Uzum Karta (Visa, bepul virtual/plastik ochish), Uzum ekotizimi keshbeki, ilovada bepul P2P oylik limitlar, 25–100 mln so'mgacha onlayn mikroqarz/kredit (~28%–38% yillik).
   - **TBC Bank**: Salom Card (Humo, bepul ochish va yetkazish, 0% P2P o'tkazma, qoldiqqa foyda/keshbek), Osmon Card (55 kungacha foizsiz kredit karta), TBC Omonat (~20–24% yillik so'mda), onlayn kredit (100 mln gacha ~28%+).
   - **Anorbank**: Anor Black, TRIA kartalari, keshbek va muddatli to'lov imtiyozlari, yuqori foizli onlayn so'm omonatlari (~20–25% yillik), bepul P2P limitlar.
   - **AVO Bank**: AVO Platinum kredit karta (45 kungacha foizsiz davr, ilovada tezkor ochish), AVO omonat (~17–19%+).
   - **Kapitalbank**: Uzcard, Humo, Visa (Classic/Gold/Platinum/Infinite), Mastercard, tezkor valyuta konvertatsiyasi, Visa Direct, so'm (~19–23%) va USD (~5–7%) omonatlari.
   - **Ipak Yo'li Bank**: Ipak Yo'li Mobile, Visa Start Sum / Classic / Gold, Mastercard, UnionPay (Google/Apple/Amazon/Steam xorijiy to'lovlar uchun eng qulay), so'm (~19–23%) va USD (~5–6%) omonatlar, mikroqarz va avtokredit (~20.9%+).
   - **Boshqa barcha yirik banklar**: Hamkorbank, Agrobank (Progress ~18%, imtiyozli/iste'mol kreditlari), Xalq Banki (Humo/Uzcard/Visa onlayn va pensiya/ijtimoiy kartalar), Ipoteka Bank (Super BYD va avtokreditlar, ipoteka), SQB / O'zsanoatqurilishbank (Visa Classic bepul chiqarish, ipoteka/biznes), NBU / Milliy Bank (omonat 13–18%, xalqaro Visa), Asakabank (Avtokredit ~18.9%+, omonat), InFinBank (valyuta va omonatlar), Orient Finans Bank (OFB), Aloqabank (omonat ~14–15%), Davr Bank, Trastbank (mikroqarz ~25%+), Turonbank, Tenge Bank (onlayn omonat ~18%+, avtokredit), Octobank (avtokredit ~21%+), Asia Alliance Bank, BRB, Garant Bank, Hayot Bank, Ziraat Bank, Open Bank.
   *(Eslatma: bank foizlari va aksiyalar o'zgaruvchan; jonli Bank.uz raqamlarini ustuvor ol, qolganlarida taxminiy amaldagi diapazonni ko'rsat va rasmiy ilovada tasdiqlashni eslat.)*

2. To'lov tizimlari va komissiyadan tejash:
   - Payme, Click (Click Up), Uzum Pay, Oson, Paynet: oddiy P2P o'tkazmalarda odatda 0.5%–1% komissiya oladi (oyiga 10 mln o'tkazmada ~100 000 so'm kuyadi). TBC Salom Card, Uzum Bank, Anorbank ilovalari ichidagi bepul P2P limitlardan foydalanib komissiyani 0 so'mga tushirish mumkin.
   - Soliq.uz ilovasi orqali har bir xarid QR-chekini skanerlab 1% keshbek qaytarib olish.

3. Muddatli to'lov (Rassrochka / Nasiya) va Bozorlar:
   - **Uzum Nasiya**, **Alif Nasiya**, **Iman Pay** (Islomiy murabaha tamoyili, kechikish jarimasiz), **Open**, **ZoodPay**, **Paymart**.
   - Odatiy shartlar: 3/6/12/24 oy. 12 oylik nasiyada narx odatda naqddan 20%–38% qimmatroq tushadi (ayrim 3 oylik aksiyalar 0%).
   - **Malika bozori** (smartfon/noutbuk eng arzon naqd narx), **Abu Saxiy** (maishiy texnika ulgurji), **Olcha.uz**, **Asaxiy.uz**, **Uzum Market**, **Texnomart**, **MediaPark**, **Idea**, **MacBro**, **Goodzone**, **Ishonch**.

4. Mizan Biznes va Aqlli Tavsiya Mantiqi (Hamkorlik Modeli):
   - Sening asosiy tamoyiling: **Avvalo foydalanuvchiga eng halol va eng arzon/foydali moliyaviy yo'lni top!** Agar naqd + omonatda yig'ish nasiyadan 3–4 mln so'm tejasa, buni ochiq ayt.
   - Shu bilan birga, foydalanuvchi **bank kartasi ochmoqchi**, **pulini foizli omonatda saqlamoqchi**, **komissiyasiz o'tkazma qilmoqchi** yoki **telefon/texnika xarid qilmoqchi** bo'lsa, Mizan hamkorlari orasidan uning vaziyatiga ENG MOS 1–3 ta aniq bank yoki do'konni tavsiya qil! (Hamkorlar Mizan'ga tavsiya komissiyasi to'laydi, foydalanuvchiga narx oshmaydi).
   - Mavjud tasdiqlangan Mizan hamkorlari:
${buildPartnerCatalogText()}

5. Fikrlash va Hisob-kitob Qoidalari:
   - Foydalanuvchining real balansini, bugungi kunlik erkin rejasini, qarz va maqsadlarini hisobga ol!
   - Agar maqsad yoki xarid so'ralsa: (1) Real narxni so'mda ko'rsat (MB USD kursi bo'yicha ham); (2) Naqd (Malika/Olcha/Asaxiy) vs Muddatli to'lov (Uzum Nasiya/Alif/Iman) farqini aniq so'mda hisobla; (3) Foydalanuvchi kuniga/oyiga qancha yig'sa qachon yetishini va omonat/0% P2P/mayda odatni kesish bilan necha kun tezlashishini ko'rsat; (4) Mos bank kartasi yoki do'kon hamkorini taklif et.

6. Strukturaviy Teglar (agar o'rinli bo'lsa, javobing OXIRIDA alohida qatorda yoz):
   - Agar foydalanuvchi xarid yoki jamg'arma maqsadini rejalayotgan bo'lsa:
     ACTION_JSON:{"action":"create_goal","name":"Qisqa maqsad nomi","target":15000000,"daily":85000,"months":6}
   - Agar foydalanuvchi matnda aniq xarajat yoki daromadni qayd etishni aytgan bo'lsa (masalan "bugun 50 ming kofe ichdim"):
     DRAFT_JSON:{"type":"expense","title":"Kofe","amount":50000,"category":"oziq"}
   - Agar javobda Mizan hamkor banki yoki do'koni foydalanuvchiga real foyda keltirsa (faqat ro'yxatdagi haqiqiy IDlardan 1–3 ta tanla):
     PARTNER_JSON:["tbc_salom","olcha_uz"]

Uslubing:
O'zbek tilida (lotin yozuvida), o'ta ravon, aqlli, mustaqil tahlil qiladigan, aniq raqamlar va qisqa sarlavhalar bilan yoz. Javobing ixcham va lo'nda bo'lsin (taxminan 200–350 so'z, suv va uzun kirish so'zlarisiz — faqat foydali fakt, aniq hisob va oxirida kerakli JSON teglari).`;

  const userSummary = `
[Foydalanuvchining joriy Mizan ma'lumotlari]
- Hamyon/kartalar jami qoldig'i: ${Number(context.balance || 0).toLocaleString('uz-UZ')} so'm
- Bugungi kunlik erkin reja: ${Number(context.dailyLimit || 0).toLocaleString('uz-UZ')} so'm (bugun sarflandi: ${Number(context.todaySpent || 0).toLocaleString('uz-UZ')} so'm)
- Shu oy: daromad ${Number(context.monthIncome || 0).toLocaleString('uz-UZ')} so'm | xarajat ${Number(context.monthExpense || 0).toLocaleString('uz-UZ')} so'm
- Kartalar: ${JSON.stringify(context.cards || [])}
- Maqsadlar: ${JSON.stringify(context.goals || [])}
- Qarzlar: ${JSON.stringify(context.debts || [])}
- So'nggi xarajatlar (namuna): ${JSON.stringify(context.recentTx || [])}

Foydalanuvchi xabari:
"${prompt}"
`;

  // Ko'p bosqichli suhbat tarixi (oxirgi 10 ta xabar)
  const contents = [];
  if (Array.isArray(history)) {
    for (const h of history.slice(-10)) {
      if (!h || typeof h.text !== 'string' || !h.text.trim()) continue;
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text.slice(0, 1500) }],
      });
    }
  }
  contents.push({ role: 'user', parts: [{ text: userSummary }] });

  try {
    let rawText = '';
    let usedModel = PRIMARY_MODEL;
    try {
      rawText = await callGemini({ model: PRIMARY_MODEL, key, systemPrompt, contents, timeoutMs: 18000 });
    } catch {
      usedModel = FALLBACK_MODEL;
      rawText = await callGemini({ model: FALLBACK_MODEL, key, systemPrompt, contents, timeoutMs: 12000 });
    }

    let text = rawText;
    const pAction = parseTagJson(text, 'ACTION_JSON');
    text = pAction.cleaned;
    const pDraft = parseTagJson(text, 'DRAFT_JSON');
    text = pDraft.cleaned;
    const pPartner = parseTagJson(text, 'PARTNER_JSON');
    text = pPartner.cleaned;

    let partners = resolvePartners(pPartner.value);
    if (!partners.length) partners = inferPartnersFromReply(text);

    return {
      ok: true,
      model: usedModel,
      text,
      action: pAction.value,
      draft: pDraft.value,
      partners,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
    };
  }
}

// Moliyaviy Salomatlik Indeksi (0 - 100 ball) va 3 ta amaliy tavsiya hisoblagich
export function computeFinancialHealth({ transactions = [], balance = 0, dailyLimit = 85000, goals = [], debts = [] }) {
  let score = 70;
  const tips = [];

  const now = new Date();
  const thisMonthTxs = transactions.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalExpense = thisMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const unplannedExpense = thisMonthTxs
    .filter((t) => t.type === 'expense' && t.planned === false)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  if (totalExpense > 0) {
    const unplannedPct = unplannedExpense / totalExpense;
    if (unplannedPct > 0.3) {
      score -= 15;
      tips.push({
        title: "Kutilmagan xarajatlar ko'p",
        text: `Xarajatlaringizning ${Math.round(unplannedPct * 100)}% qismi rejasiz qilingan. Kunlik chegara (${Number(dailyLimit || 0).toLocaleString('uz-UZ')} so'm) ichida qolish oyiga kamida 300 000 so'm tejaydi.`,
        tone: 'amber',
      });
    } else {
      score += 10;
      tips.push({
        title: 'Rejali xarajat intizomi',
        text: "Xarajatlaringizning asosiy qismi reja asosida ketmoqda. Intizomni shunday saqlang!",
        tone: 'emerald',
      });
    }
  }

  const smallHabits = thisMonthTxs.filter(
    (t) => t.type === 'expense' && /kofe|taksi|fastfood|shirinlik|choyxona|yetkaz/i.test(t.title || ''),
  );
  const smallHabitsTotal = smallHabits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  if (smallHabitsTotal > 200000) {
    score -= 10;
    tips.push({
      title: "Mayda odatlar tuzog'i",
      text: `Bu oy kofe, taksi va yetkazib berishga jami ${smallHabitsTotal.toLocaleString('uz-UZ')} so'm sarflanibdi. Buni 30% ga qisqartirsangiz, maqsadingizga tezroq yetasiz.`,
      tone: 'amber',
    });
  } else {
    tips.push({
      title: 'Kundalik mayda xarajatlar nazoratda',
      text: "Ortiqcha mayda pul sarflash sezilmadi. Pul oqimi to'g'ri taqsimlanmoqda.",
      tone: 'emerald',
    });
  }

  const activeBorrowed = debts.filter((d) => d.direction === 'borrowed');
  if (activeBorrowed.length > 0 && balance > 0) {
    const owed = activeBorrowed.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    if (owed > balance) score -= 8;
  }

  if (goals.length > 0) {
    score += 15;
    const g = goals[0];
    const pct = g.target > 0 ? Math.round(((g.saved || 0) / g.target) * 100) : 0;
    tips.push({
      title: `«${g.name}» maqsadi jadalligi`,
      text: `Hozirda maqsad ${pct}% bajarildi. Mizan AI bilan bank omonati yoki naqd/nasiya farqini hisoblab maqsadni tezlashtiring.`,
      tone: 'cyan',
    });
  } else {
    score -= 10;
    tips.push({
      title: "Aniq maqsad qo'ying",
      text: "Maqsadsiz yig'ilgan pul tez sarflanib ketadi. Mizan AI orqali telefon, texnika yoki jamg'arma maqsadi belgilang.",
      tone: 'amber',
    });
  }

  score = Math.max(25, Math.min(98, score));

  let grade = "A'lo daraja";
  let gradeColor = 'text-turq';
  if (score < 50) {
    grade = 'Diqqat talab';
    gradeColor = 'text-rose-400';
  } else if (score < 75) {
    grade = "O'rtacha barqaror";
    gradeColor = 'text-ochre';
  }

  return {
    score,
    grade,
    gradeColor,
    tips: tips.slice(0, 3),
  };
}
