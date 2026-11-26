import { addDays } from '../format.js';
import { capitalize, normalize } from '../text.js';

// ---------- Language detection ----------

const RU_HINTS = ['потрат', 'сколько', 'долг', 'деньг', 'сегодня', 'вчера', 'купил', 'заплатил', 'зарплат', 'тысяч', 'куда', 'мой', 'мне', 'цель', 'накоп', 'что', 'доход', 'получил', 'привет', 'помощ', 'расход', 'осталось', 'больше', 'такси', 'хлеб', 'занял', 'вернул', 'на что'];
const UZC_HINTS = ['бугун', 'кеча', 'сарф', 'тўла', 'олдим', 'пул', 'қарз', 'қанча', 'нима', 'учун', 'минг', 'сўм', 'мен', 'йўл', 'нон', 'маош', 'йиғ', 'кўп', 'кетди', 'бердим', 'салом', 'ёрдам', 'мақсад', 'даромад', 'қолди', 'нонга', 'га '];
const EN_HINTS = ['spent', 'spend', 'paid', 'pay', 'bought', 'buy', 'how', 'what', 'where', 'my', 'debt', 'owe', 'money', 'salary', 'income', 'today', 'yesterday', 'goal', 'save', 'the', 'for', 'on', 'hello', 'hi', 'help', 'lent', 'borrowed', 'much', 'report', 'balance', 'i', 'did', 'need'];
const UZ_LATIN_MARKERS = /(sarf|to'la|qarz|qancha|nima|bugun|kecha|ming|so'm|pul|oldim|berdim|ketdi|yig'|kerak|uchun|salom|maosh|daromad)/;

export function detectLang(raw) {
  const s = ` ${normalize(raw)} `;
  if (/[а-яёўқғҳ]/.test(s)) {
    if (/[ўқғҳ]/.test(s)) return 'uz-cyrl';
    const uz = UZC_HINTS.filter((w) => s.includes(w)).length;
    const ru = RU_HINTS.filter((w) => s.includes(w)).length;
    return uz > ru ? 'uz-cyrl' : 'ru';
  }
  const words = s.split(/[^a-z']+/);
  const en = EN_HINTS.filter((w) => words.includes(w)).length;
  return en >= 1 && !UZ_LATIN_MARKERS.test(s) ? 'en' : 'uz';
}

// ---------- Numbers ----------

const DURATIONS = [
  // "(?!lik)": "80000 oylik" ish haqi, muddat emas
  [/^(kun|дн|день|дня|day)(?!lik)/, 1],
  [/^(hafta|недел|week)(?!lik)/, 7],
  [/^(oy|месяц|мес|month)(?!lik)/, 30],
  [/^(yil|год|лет|year)(?!lik)/, 365],
];
const MULTIPLIERS = [
  [/^(ming|тыс|тыщ|thousand)/, 1e3],
  [/^(k|к)(?![a-zа-я])/, 1e3],
  [/^(mln|million|millon|млн|миллион)/, 1e6],
  [/^(mlrd|milliard|млрд|миллиард|billion)/, 1e9],
];
const CURRENCY = /^(so'm|som|sum|сум|uzs)/;
const COUNT_AFTER = /^\s*(ta\b|шт|pcs|dona|%|soat|час|hour|marta|раз|times|kilo|kg|кг|litr|литр)/;

const UNITS = { bir: 1, ikki: 2, uch: 3, "to'rt": 4, tort: 4, besh: 5, olti: 6, yetti: 7, sakkiz: 8, "to'qqiz": 9, toqqiz: 9 };
// "on" = "o'n" (ovozdan matnga o'tganda apostrof tushib qoladi)
const TENS = { "o'n": 10, on: 10, yigirma: 20, "o'ttiz": 30, ottiz: 30, qirq: 40, ellik: 50, oltmish: 60, yetmish: 70, sakson: 80, "to'qson": 90, toqson: 90 };

// "o'n ikki ming" -> 12000. Only Uzbek Latin; speech recognition usually returns digits anyway.
function parseUzWords(s) {
  let best = null;
  let total = 0;
  let current = 0;
  let active = false;
  let hasMult = false;
  const flush = () => {
    const v = total + current;
    if (active && (hasMult || v >= 100) && (!best || v > best.value)) {
      best = { value: Math.round(v), base: v, multiplied: hasMult, currency: false, words: true };
    }
    total = 0;
    current = 0;
    active = false;
    hasMult = false;
  };
  for (const t of s.split(/[^a-z']+/)) {
    if (t in UNITS) { current += UNITS[t]; active = true; }
    else if (t in TENS) { current += TENS[t]; active = true; }
    else if (t === 'yarim') { current += 0.5; active = true; }
    else if (t.startsWith('yuz')) { current = (current || 1) * 100; active = true; }
    else if (t.startsWith('ming')) { total += (current || 1) * 1000; current = 0; active = true; hasMult = true; }
    else if (t.startsWith('million') || t.startsWith('mln')) { total = (total + (current || 1)) * 1e6; current = 0; active = true; hasMult = true; }
    else if (active) flush();
  }
  flush();
  return best;
}

// `s` must already be normalized (and transliterated to Latin for Uzbek Cyrillic).
export function scanNumbers(s, lang) {
  const amounts = [];
  const durations = [];
  const re = /\d{1,3}(?:[  ]\d{3})+(?!\d)|\d+(?:[.,]\d+)?/g;
  let m;
  while ((m = re.exec(s))) {
    const before = s[m.index - 1];
    const after = s.slice(m.index + m[0].length);
    if (before === '-' || /^-/.test(after) || COUNT_AFTER.test(after)) continue;
    let raw = m[0].replace(/[  ]/g, '');
    raw = /^\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
    const base = parseFloat(raw);
    const rest = after.replace(/^\s*/, '');
    const dur = DURATIONS.find(([rx]) => rx.test(rest));
    if (dur) {
      durations.push({ value: base, days: Math.round(base * dur[1]) });
      continue;
    }
    const mult = MULTIPLIERS.find(([rx]) => rx.test(rest));
    const afterMult = mult ? rest.replace(/^\S+\s*/, '') : rest;
    amounts.push({
      value: Math.round(base * (mult ? mult[1] : 1)),
      base,
      multiplied: Boolean(mult),
      currency: CURRENCY.test(afterMult),
      index: m.index,
    });
  }
  if (!amounts.length && lang.startsWith('uz')) {
    const w = parseUzWords(s);
    if (w) amounts.push({ ...w, index: 0 });
  }
  return { amounts, durations };
}

// A bare small number such as "12" is most likely "12 ming"; ask instead of guessing.
export function isAmbiguous(a) {
  return a.value < 1000 && !a.multiplied && !a.currency;
}

// ---------- Dates and payment method ----------

export function detectDate(s, today) {
  if (/(o'?tgan kuni|oldingi kuni|позавчера|day before yesterday)/.test(s)) return addDays(today, -2);
  if (/\bkecha\b|вчера|yesterday/.test(s)) return addDays(today, -1);
  return today;
}

export function detectMethod(s) {
  if (/(karta|uzcard|humo|карт|card)/.test(s)) return 'karta';
  if (/(o'tkaz|перевод|перевел|transfer)/.test(s)) return 'otkazma';
  if (/(naqd|налич|cash)/.test(s)) return 'naqd';
  return null;
}

// ---------- Clauses and titles ----------

export function splitClauses(s) {
  return s.split(/;|,\s+|\s+(?:va|hamda|и|а также|and|plus)\s+/).map((c) => c.trim()).filter(Boolean);
}

const STOP = new Set([
  // uz
  'bugun', 'kecha', 'ertaga', 'men', 'menga', 'meni', 'uchun', 'sarfladim', 'sarfladik', 'sarflandi', 'sarf', 'qildim',
  "to'ladim", "to'lov", "to'landi", 'oldim', 'sotib', 'xarid', 'ketdi', 'ketgan', 'berdim', "so'm", 'som', 'sum', 'ming',
  'mln', 'million', 'naqd', 'karta', 'kartadan', 'kartaga', 'pul', 'pulga', 'bilan', 'yana', 'jami', 'edi', "bo'ldi",
  'tushdi', 'topdim', 'ishlab', 'oldi', 'xarajat', 'daromad', 'naqdga', "o'tkazma", "o'tkazdim", 'ham', 'esa', 'bir',
  'kuni', "o'tgan", 'otgan', 'oldingi', 'shu', 'bu', 'oyda', 'kunda',
  // ru
  'я', 'мне', 'сегодня', 'вчера', 'позавчера', 'потратил', 'потратила', 'заплатил', 'заплатила', 'купил', 'купила',
  'оплатил', 'на', 'за', 'тысяч', 'тысячи', 'тыс', 'сум', 'сумов', 'рублей', 'наличными', 'картой', 'ушло', 'получил',
  'получила', 'деньги', 'и', 'в', 'еще', 'ещё',
  // en
  'i', 'spent', 'paid', 'bought', 'on', 'for', 'today', 'yesterday', 'k', 'thousand', 'so', 'the', 'a', 'cash', 'card',
  'by', 'with', 'my', 'got', 'received', 'earned',
]);

// "on ikki ming" kabi so'zli raqamlar sarlavhaga kirmasligi kerak
for (const w of [...Object.keys(UNITS), ...Object.keys(TENS), 'yuz', 'yarim']) STOP.add(w);

const UZ_SUFFIX =/(larga|lariga|ga|ka|qa|ni|dan|da|ning|lar)$/;

export function extractTitle(clause, lang) {
  const tokens = clause
    .split(/[^a-zа-яёўқғҳ'0-9]+/)
    .filter((t) => t && !/\d/.test(t) && !STOP.has(t) && !/^(ming|mln|тыс|so'm)/.test(t));
  const cleaned = tokens.map((t) => (lang.startsWith('uz') && t.length > 4 ? t.replace(UZ_SUFFIX, '') : t)).filter((t) => t.length > 1 && !STOP.has(t));
  return cleaned.slice(0, 3).join(' ');
}

// ---------- People (for debts) ----------

const PERSON_STOP = new Set([
  'men', 'sen', 'biz', 'siz', 'ular', 'qarz', 'qarzga', 'pul', 'bugun', 'kecha', 'ertaga', 'ming', "so'm", 'oy', 'hafta',
  'kun', 'yil', 'berdim', 'oldim', 'berdi', 'qaytardi', 'qaytardim', 'qaytarib', 'qaytaraman', 'qaytaradi',
  'я', 'мне', 'меня', 'сегодня', 'вчера', 'дал', 'дала', 'долг', 'долга', 'взял', 'взяла', 'занял', 'заняла', 'у', 'вернул',
  'вернула', 'тысяч', 'одолжил', 'одолжила', 'в', 'на', 'до', 'взаймы',
  'i', 'me', 'today', 'yesterday', 'lent', 'borrowed', 'from', 'to', 'paid', 'back', 'returned', 'repaid', 'k', 'debt', 'loan', 'gave', 'owe', 'owes',
]);

export function extractPerson(proc, lang) {
  const tokens = proc.split(/[^a-zа-яёўқғҳ'0-9-]+/).filter(Boolean);
  if (lang.startsWith('uz')) {
    for (const t of tokens) {
      const m = t.match(/^(.{3,}?)(ga|ka|qa|dan|ning)$/);
      if (m && !PERSON_STOP.has(m[1]) && !PERSON_STOP.has(t) && !/\d/.test(t)) return capitalize(m[1]);
    }
    const i = tokens.findIndex((t) => /^(qaytar|qarz)/.test(t));
    const cand = tokens.slice(0, Math.max(i, 0)).find((t) => !PERSON_STOP.has(t) && !/\d/.test(t) && t !== 'menga');
    return cand ? capitalize(cand) : null;
  }
  if (lang === 'ru') {
    const afterPrep = proc.match(/(?:у|от|для)\s+([а-яё]{3,})/);
    const cand = afterPrep ? afterPrep[1] : tokens.find((t) => !PERSON_STOP.has(t) && !/\d/.test(t) && !/^(долг|верн|занял|одолж|дал|тыс)/.test(t));
    if (!cand) return null;
    const stem = cand.length > 4 ? cand.replace(/(у|а|ю|е|ой|ом)$/, '') : cand;
    return capitalize(stem);
  }
  const afterPrep = proc.match(/(?:from|to|lent|loaned)\s+([a-z]{2,})/);
  if (afterPrep && !PERSON_STOP.has(afterPrep[1])) return capitalize(afterPrep[1]);
  const cand = tokens.find((t) => !PERSON_STOP.has(t) && !/\d/.test(t) && t.length > 1);
  return cand ? capitalize(cand) : null;
}

export function debtDirection(proc, lang) {
  if (lang === 'ru') {
    if (/(занял[а]? у|взял[а]? в долг|одолжил[а]? у|я должен|я должна|мне дал[аи]? в долг|мне одолжил)/.test(proc)) return 'borrowed';
    if (/(дал[а]? в долг|дал[а]? взаймы|одолжил|занял|должен мне|должна мне)/.test(proc)) return 'lent';
    return null;
  }
  if (lang === 'en') {
    if (/(borrowed|i owe|took a loan|lent me|loaned me)/.test(proc)) return 'borrowed';
    if (/(lent|loaned|owes me|gave .{0,20}loan)/.test(proc)) return 'lent';
    return null;
  }
  if (/(qarz oldim|qarzga oldim|qarzdorman|menga qarz|qarz bo'ldim)/.test(proc)) return 'borrowed';
  if (/(qarz berdim|qarzga berdim|qarzdor|ga qarz)/.test(proc)) return 'lent';
  return null;
}
