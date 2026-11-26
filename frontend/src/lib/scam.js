import { normalize } from './text.js';

// Local, rule-based check. It explains warning signs; it never declares a message safe.

const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.ly', 'cutt.ly', 'is.gd', 'goo.gl', 'clck.ru', 'rb.gy', 'shorturl.at', 'tiny.cc', 'ow.ly', 'u.to'];
const RISKY_TLDS = ['xyz', 'top', 'click', 'site', 'online', 'icu', 'buzz', 'live', 'rest', 'monster', 'cfd', 'sbs'];
const BRANDS = ['click', 'payme', 'uzcard', 'humo', 'uzum', 'paynet', 'kapital', 'agrobank', 'hamkor', 'ipak', 'xazna', 'anor', 'tbc', 'davr', 'bank'];
const KNOWN_EXACT = ['click.uz', 'payme.uz'];

const RULES = [
  {
    level: 'high',
    test: /(sms|kod|code|parol|password|pin|cvv|cvc|код|пароль|пин)[^.!?\n]{0,60}(yubor|ayt|kirit|tasdiql|ber|jo'nat|сообщ|отправ|введ|назов|скаж|send|enter|share|tell|confirm)|(yubor|ayt|kirit|ber|сообщ|отправ|введ|send|enter|share|tell)[^.!?\n]{0,40}(sms|kod|code|parol|password|pin|cvv|код|пароль)/,
    text: "Kod, parol yoki PIN so'ralmoqda. Bank, to'lov tizimi va Mizan bunday ma'lumotni hech qachon so'ramaydi.",
  },
  {
    level: 'high',
    test: /\.apk\b|apk fayl|apk файл/,
    text: "Ilova fayli (.apk) yuborilgan. Begona manbadan ilova o'rnatish telefoningizni boshqarishga yo'l ochishi mumkin.",
  },
  {
    level: 'mid',
    test: /(?:\d[ -]?){16}/,
    text: "Matnda karta raqamiga o'xshash 16 xonali raqam bor. Karta ma'lumotlarini begona odamga yubormang.",
  },
  {
    level: 'mid',
    test: /(shoshil|tezda|zudlik|darhol|24 soat|bloklan|bloklash|muzlatil|yopiladi|срочно|немедленно|заблокир|в течение 24|urgent|immediately|blocked|suspended|within 24)/,
    text: "Shoshiltirish yoki qo'rqitish bor (bloklanadi, darhol). Firibgarlar odamni o'ylashga vaqt qoldirmaslikka harakat qiladi.",
  },
  {
    level: 'mid',
    test: /(yutdingiz|yutuq|sovg'a|bonus|mukofot|kompensatsiya|pul o'tkazamiz|bepul|выиграл|приз|бонус|компенсац|подарок|бесплатн|you won|prize|reward|free money|gift card)/,
    text: "Yutuq, bonus yoki sovg'a va'da qilinmoqda. Kutilmagan yutuq haqidagi xabarlar ko'pincha aldov bo'ladi.",
  },
  {
    level: 'mid',
    test: /(karta|hisob|account|аккаунт|карт|счёт|счет)[^.!?\n]{0,40}(tasdiql|faollashtir|yangila|verify|подтверд|активир|обнов)/,
    text: "Kartani yoki hisobni havola orqali «tasdiqlash» so'ralmoqda. Buni faqat rasmiy ilovaning o'zida qiling.",
  },
];

function extractLinks(text) {
  const re = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:uz|com|net|org|ru|xyz|top|click|site|online|info|link|me|io|app|shop|icu|buzz|live|cc|ly|at|gd|to|cfd|sbs)(?:\/[^\s<>"']*)?)/gi;
  return [...new Set((text.match(re) || []).map((l) => l.replace(/[).,!?»]+$/, '')))];
}

function hostOf(link) {
  try {
    return new URL(/^https?:\/\//i.test(link) ? link : `http://${link}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function checkLink(link) {
  const reasons = [];
  const host = hostOf(link);
  if (!host) return reasons;
  const tld = host.split('.').pop();
  const isKnown = KNOWN_EXACT.some((d) => host === d || host.endsWith(`.${d}`));

  if (/^http:\/\//i.test(link)) reasons.push({ level: 'mid', text: `${host}: shifrlanmagan (http) havola.` });
  if (SHORTENERS.includes(host)) reasons.push({ level: 'mid', text: `${host}: qisqartirilgan havola, asl manzil ko'rinmaydi.` });
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) reasons.push({ level: 'high', text: `${host}: sayt nomi o'rniga IP manzil ishlatilgan.` });
  if (host.includes('xn--')) reasons.push({ level: 'high', text: `${host}: domenda boshqa alifbo harflari bo'lishi mumkin (taniqli nomga o'xshatish usuli).` });
  if (RISKY_TLDS.includes(tld)) reasons.push({ level: 'mid', text: `${host}: .${tld} zonasi ko'pincha qisqa muddatli saytlar uchun ishlatiladi.` });
  if ((host.match(/-/g) || []).length >= 2) reasons.push({ level: 'low', text: `${host}: nomda ko'p chiziqcha bor, bu soxta saytlarda ko'p uchraydi.` });
  if (!isKnown) {
    const brand = BRANDS.find((b) => host.includes(b));
    if (brand) {
      reasons.push({
        level: 'high',
        text: `${host}: «${brand}» nomi bor, lekin bu rasmiy domen ekanligi tasdiqlanmagan. Manzilni rasmiy ilova yoki rasmiy saytdan o'zingiz tekshiring.`,
      });
    }
  }
  return reasons;
}

export function checkMessage(raw) {
  const text = normalize(raw);
  const reasons = RULES.filter((r) => r.test.test(text)).map(({ level, text: t }) => ({ level, text: t }));
  const links = extractLinks(raw);
  for (const l of links) reasons.push(...checkLink(l));
  const high = reasons.filter((r) => r.level === 'high').length;
  const mid = reasons.filter((r) => r.level === 'mid').length;
  const verdict = high ? 'high' : mid ? 'mid' : reasons.length ? 'low' : 'none';
  return { reasons, links, verdict };
}
