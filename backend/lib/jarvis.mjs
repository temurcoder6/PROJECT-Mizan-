// Mizan AI — O'zbekistonning mustaqil fikrlovchi shaxsiy moliyaviy maslahatchisi (CFO)
// Jonli internet ma'lumotlari (MB kurslari, Bank.uz foizlari, Olcha.uz narxlari, veb-qidiruv) va Gemini 3 Flash bilan ishlaydi.

import { getLiveMarketContext, searchLiveInternet } from './liveMarket.mjs';
import { checkModeration } from './moderation.mjs';
import { PARTNERS, resolvePartners } from './partners.mjs';

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

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

  const mod = checkModeration(prompt);
  if (mod.status === 'ban') {
    return {
      ok: true,
      model: 'moderation',
      text: "Kechirasiz, 18+ kontent, taqiqlangan mahsulotlar yoki noqonuniy mavzular bo'yicha so'rovlar Mizan qoidalariga zid. Agar bu xatolik deb hisoblasangiz, pastdagi «Shikoyat / Murojaat» tugmasi orqali murojaat qoldiring.",
      moderation: mod,
      partners: [],
    };
  }

  const [liveMarket, liveSearch] = await Promise.all([
    getLiveMarketContext().catch(() => ''),
    searchLiveInternet(prompt).catch(() => ''),
  ]);

  const systemPrompt = `
Sen — "Mizan AI", O'zbekistondagi eng aqlli, har tomonlama bilimli universal sun'iy intellekt yordamchisi va shaxsiy moliyaviy strategsan.
Sening vazifang:
1) HAR QANDAY SAVOLGA AQLLI JAVOB BERISH:
   - Moliya, banklar, kredit/omonat, muddatli to'lov va bozor narxlari bo'yicha O'zbekistondagi eng aniq ekspert bo'l.
   - Shuningdek, foydalanuvchi sog'liq/kasallik (alomatlar, birinchi yordam, dori xarajati — har doim oxirida "aniq tashxis va davolash uchun shifokorga murojaat qiling" deb eslat), yo'qolgan narsa/hujjatni topish (pasport, karta bloklash, IIB/DXA tartibi), o'qish/imtihon/IELTS/kasb tanlash, texnologiya, kundalik muammolar va huquqiy savollar bersa ham aniq, foydali va amaliy yo'l-yo'riq ber!
   - Foydalanuvchi NIMA OLMOQCHI bo'lsa (telefon, noutbuk, maishiy texnika, mashina, kiyim, dori, o'quv kursi va h.k. — uning Maqsadlar ro'yxati va suhbatidan kelib chiqib), barcha variantlar, taxminiy real narxlar va eng arzon/halol olish yo'lini bil va tushuntir.

=== JONLI INTERNET MA'LUMOTLARI (BUGUNGI KUN HOLATI) ===
${liveMarket || "Jonli bank.uz/cbu ma'lumoti vaqtincha olinmadi, bazaviy bilimga tayan."}

${liveSearch ? `=== SAVOLGA OID JONLI QIDIRUV VA NARXLAR ===\n${liveSearch}\n` : ''}
=== O'ZBEKISTON BANKLARI, KARTALARI, OMONAT VA KREDITLARI ===
- **Uzum Bank** (Uzum Karta Visa, 0% P2P limit, mikroqarz ~28–38%), **TBC Bank** (Salom Card 0% P2P, Osmon Card 55 kun 0%, omonat ~20–24%), **Anorbank** (Anor Black, omonat ~20–25%), **AVO Bank** (AVO Platinum 45 kun 0%), **Kapitalbank** (Uzcard/Humo/Visa, valyuta), **Ipak Yo'li Bank** (Visa/UnionPay xorijiy to'lovlar), hamda Hamkorbank, Agrobank, Xalq Banki, Ipoteka Bank, SQB, NBU, Asakabank, InFinBank, OFB, Aloqabank, Tenge Bank, Octobank.
- **To'lovlar**: Payme, Click, Uzum Pay, Soliq.uz 1% keshbek.
- **Muddatli to'lov va do'konlar**: Uzum Nasiya, Alif Nasiya, Iman Pay (penyadan xoli islomiy nasiya), Open, Malika bozori, Abu Saxiy, Olcha.uz, Asaxiy.uz, Uzum Market, Texnomart, MediaPark, Idea, MacBro.

=== AQLLI VA BEZOVTA QILMAYDIGAN REKLAMA (HAMKORLIK) QOIDASI ===
- HAR BIR JAVOBGA REKLAMA TIQISHTIRMA! Agar foydalanuvchi sog'liq, o'qish, yo'qolgan narsa, salomlashish yoki oddiy maslahat so'rayotgan bo'lsa, PARTNER_JSON UMUMAN YOZMA!
- Faqat QULAY FURSATDA — ya'ni foydalanuvchi aniq bir mahsulot (telefon/texnika) sotib olmoqchi, bank kartasi ochmoqchi, omonat/kredit/muddatli to'lov qidirayotgan yoki pul yig'ayotgan bo'lsa, shunda uning vaziyatiga ENG MOS 1–2 ta hamkorni PARTNER_JSON orqali tavsiya qil.
- Mavjud hamkor IDlari:
${buildPartnerCatalogText()}

=== SAYT BO'YLAB BUYRUQ VA NAVIGATSIYA (JARVIS) ===
- MUHIM: \`ACTION_JSON:{"action":"navigate",...}\` tegini FAQAT foydalanuvchi OCHIQDAN-OCHIQ saytning biror bo'limiga o'tishni yoki sahifani ochishni buyurganda yoz (masalan: "xarajatlarga o't", "maqsadlarni och", "sozlamalarga kir", "xavfsizlikni och"). Oddiy savol-javobda (masalan pasport, kasallik, narx so'raganda) HECH QACHON \`navigate\` yozma!
  - Mumkin bo'lgan \`page\` qiymatlari: \`bosh\`, \`yozuvlar\`, \`kartalar\`, \`qarzlar\`, \`maqsadlar\`, \`hisobot\`, \`xavfsizlik\`, \`yordam\`, \`sozlamalar\`.
  - Pro oyna uchun: ACTION_JSON:{"action":"open_pro"}
  - Shikoyat / murojaat oynasi uchun: ACTION_JSON:{"action":"open_complaint"}

=== MODERATSIYA (18+ / HAQORAT / TAQIQLANGAN NARSALAR) ===
- Agar foydalanuvchi 18+ / pornografiya, haqorat, zo'ravonlik, narkotik yoki noqonuniy narsalar so'rasa, muloyim rad et va oxirida yoz:
  MODERATION_JSON:{"status":"warn","reason":"Sababi"} (jiddiy bo'lsa "ban").

=== STRUKTURAVIY TEGLAR (FAQAT O'RINLI BO'LSA JAVOB OXIRIDA) ===
- Maqsad yaratish: ACTION_JSON:{"action":"create_goal","name":"Qisqa nom","target":15000000,"daily":85000,"months":6}
  - Agar foydalanuvchi narxni o'zi aytmagan va jonli ma'lumotda aniq narx topilmagan bo'lsa, narxni o'ylab topma: javobda «taxminiy narx» deb yoz va ACTION_JSON ga "estimated":true qo'sh. Foydalanuvchi qo'lidagi pulni "saved" maydoniga yoz.
- Xarajat/daromad qayd etish: DRAFT_JSON:{"type":"expense","title":"Kofe","amount":50000,"category":"oziq"}
- Qulay fursatdagi hamkor (faqat xarid/bank/nasiya savolida, max 2 ta): PARTNER_JSON:["tbc_salom","olcha_uz"]

Uslubing:
O'zbek tilida (lotin yozuvida), jonli, samimiy, aqlli va lo'nda (150–320 so'z) yoz.
MUHIM HURMAT QOIDASI: Foydalanuvchi bilan DOIMO hurmat bilan «Siz»lab gaplash (masalan: «Sizning balansingiz», «tavsiya qilaman», «ko'rishingiz mumkin»). Hech qachon «sen» deb murojaat qilma! Ovozda o'qib berishga qulay, ravon jumlalardan foydalan.`;

  const userSummary = `
[Foydalanuvchining joriy Mizan ma'lumotlari]
- Hamyon/kartalar jami qoldig'i: ${Number(context.balance || 0).toLocaleString('uz-UZ')} so'm
- Bugungi kunlik erkin reja: ${Number(context.dailyLimit || 0).toLocaleString('uz-UZ')} so'm (bugun sarflandi: ${Number(context.todaySpent || 0).toLocaleString('uz-UZ')} so'm)
- Shu oy: daromad ${Number(context.monthIncome || 0).toLocaleString('uz-UZ')} so'm | xarajat ${Number(context.monthExpense || 0).toLocaleString('uz-UZ')} so'm
- Kartalar: ${JSON.stringify(context.cards || [])}
- Maqsadlar (nima olmoqchi): ${JSON.stringify(context.goals || [])}
- Qarzlar: ${JSON.stringify(context.debts || [])}
- So'nggi xarajatlar: ${JSON.stringify(context.recentTx || [])}

Foydalanuvchi xabari:
"${prompt}"
`;

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
    const pMod = parseTagJson(text, 'MODERATION_JSON');
    text = pMod.cleaned;

    // Reklamani faqat AI o'rinli deb bilgan qulay fursatda yoki aniq xarid/bank kontekstida chiqaramiz
    const isCommerceQuery = /(olmoqchi|sotib|narx|bozor|do'kon|dukon|nasiya|rassrochka|muddatli|karta|omonat|kredit|mikroqarz|bank|iphone|samsung|noutbuk|telefon|televizor|muzlatgich|konditsioner|keshbek|komissiya)/i.test(prompt);
    let partners = resolvePartners(pPartner.value).slice(0, 2);
    if (!partners.length && isCommerceQuery) {
      partners = inferPartnersFromReply(text).slice(0, 2);
    }

    const moderation = mod.status !== 'ok' ? mod : pMod.value || { status: 'ok' };

    return {
      ok: true,
      model: usedModel,
      text,
      action: pAction.value,
      draft: pDraft.value,
      partners,
      moderation,
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

// Shubhali xabar va skrinshotni Gemini Multimodal AI yordamida tekshirish
export async function analyzeScamWithAI({ text = '', imageBase64 = '', mimeType = 'image/png', apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, error: "Gemini API kaliti topilmadi." };
  }
  const parts = [
    {
      text: `Sen O'zbekiston kiberxavfsizlik va moliyaviy firibgarlikni aniqlash bo'yicha AI ekspertisan.
Foydalanuvchi yuborgan xabar matni va/yoki skrinshotni chuqur tekshir (Click, Payme, Uzum, Humo, Uzcard, soxta bank xodimi, SMS/OTP kod so'rash, .apk fayl, soxta yutuq/bonus, qisqa shubhali havolalar, Telegram firibgarligi).

Faqat quyidagi JSON formatida javob qaytar (boshqa matn yozma):
{
  "verdict": "high" | "mid" | "low" | "none",
  "riskScore": 0-100,
  "summary": "Qisqa va aniq xulosa (1-2 gap, o'zbek tilida)",
  "reasons": [
    { "level": "high" | "mid" | "low", "text": "Aniqlangan xavf belgisi izohi" }
  ],
  "advice": "Foydalanuvchi nima qilishi kerak (aniq amaliy maslahat)"
}

Tekshiriladigan matn:
"""${String(text || '').slice(0, 4000)}"""`,
    },
  ];

  if (imageBase64 && typeof imageBase64 === 'string') {
    const cleanB64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    if (cleanB64.length > 20) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: cleanB64,
        },
      });
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      verdict: ['high', 'mid', 'low', 'none'].includes(parsed.verdict) ? parsed.verdict : 'mid',
      riskScore: Math.max(0, Math.min(100, Number(parsed.riskScore) || 0)),
      summary: String(parsed.summary || "Tekshiruv yakunlandi."),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 6) : [],
      advice: String(parsed.advice || "Shubhangiz bo'lsa, rasmiy bank ilovasi orqali tekshiring."),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Raw 16-bit PCM (24kHz mono) uchun 44 baytli WAV sarlavhasi
function pcmToWavBuffer(pcmBuffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

// Gemini Neural TTS — odamnikidek tiniq va tabiiy ovoz sintezi
export async function synthesizeSpeechWithGemini({ text, voiceName = 'Kore', apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API kaliti topilmadi.');

  const cleanText = String(text || '')
    .replace(/[*#_`~>|•«»]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);

  if (!cleanText) throw new Error("O'qish uchun matn yo'q.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(22000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: `O'zbek tilida tabiiy, iliq va tiniq ohangda o'qi: ${cleanText}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `TTS API error ${res.status}`);
  }
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error('Audio maʼlumot qaytmadi.');

  const rawBuf = Buffer.from(part.data, 'base64');
  if (part.mimeType && part.mimeType.includes('wav')) {
    return rawBuf;
  }
  return pcmToWavBuffer(rawBuf, 24000, 1, 16);
}

// Chek / kvitansiya rasmini Gemini Vision orqali o'qib, xarajatga aylantirish
export async function scanReceiptWithAI({ imageBase64, mimeType = 'image/jpeg', apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: 'Gemini API kaliti topilmadi.' };

  const cleanB64 = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '');
  if (cleanB64.length < 30) return { ok: false, error: 'Rasm yuborilmadi.' };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Sen chek va kvitansiya o'quvchi AI'san. Rasmdan do'kon/joy nomi, jami to'langan summa (faqat raqam, so'mda) va toifani aniqlab, FAQAT JSON qaytar:
{
  "title": "Qisqa joy yoki xarid nomi (masalan: Korzinka, Apteka, Kafe)",
  "amount": 125000,
  "category": "oziq|bozor|transport|kommunal|aloqa|uy|ijtimoiy|kiyim|salomatlik|talim|dam|texnika|kredit|sport|bolalar|obuna|xayriya|boshqa",
  "note": "Chekdagi asosiy mahsulotlar qisqacha"
}`,
              },
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: cleanB64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      title: String(parsed.title || 'Chek xarajat').slice(0, 80),
      amount: Math.max(0, Math.round(Number(parsed.amount) || 0)),
      category: String(parsed.category || 'boshqa'),
      note: String(parsed.note || '').slice(0, 140),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
