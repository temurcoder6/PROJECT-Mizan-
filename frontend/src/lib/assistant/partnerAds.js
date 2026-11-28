import { cyrToLat, normalize } from '../text.js';

// Mahalliy (kalitsiz) rejimda hamkor kartalarini tanlash: oddiy so'zlar xaritasi.
// Hamkorlar katalogi serverda (backend/lib/partners.mjs, GET /api/partners): bu yerda faqat ID lar,
// ma'lumotlarning o'zi takrorlanmaydi.

const TECH = /(iphone|ayfon|айфон|samsung|xiaomi|redmi|telefon|smartfon|смартфон|телефон|noutbuk|ноутбук|macbook|kompyuter|planshet|ipad|airpods|televizor|televisor|playstation|texnika|техника|gadjet)/;
const SAVE = /(yig'|yig'?(ish|ib|sam|moqchi)|jamg'ar|tejab|tejash|omonat|olmoqchi|sotib olmoq|olgim kel|xohlayman)/;
const TRAVEL = /(chet el|chetga|sayohat|aviachipta|aviabilet|avia chipta|viza|turkiya|dubay|dubai|yevropa|ketmoqchi|uchib)/;
const STUDY = /(o'qimoqchi|o'qish|oqimoqchi|universitet|kontrakt|ielts|kurs|magistratura|grant)/;

// Do'kon / nasiya hamkorlari: bir xil ko'rinish uchun aylantirib beriladi.
const TECH_STORES = ['texnomart', 'idea_uz', 'olcha_uz', 'uzum_nasiya', 'ishonch', 'asaxiy_uz', 'alif_nasiya'];

/**
 * Foydalanuvchi matniga mos hamkor ID lari (0–3 ta). Avval jamg'arma (omonat/karta), keyin nasiya variantlari.
 * Oddiy xarajat yozuvlariga reklama chiqmaydi.
 */
export function adPartnerIds(rawInput) {
  const text = cyrToLat(normalize(rawInput));
  const wantsTech = TECH.test(text);
  const wantsSave = SAVE.test(text);
  const wantsTravel = TRAVEL.test(text);
  const wantsStudy = STUDY.test(text);

  if (wantsTech && (wantsSave || /(qancha|narx|\?)/.test(text))) {
    const start = text.length % TECH_STORES.length;
    const stores = [0, 1, 2].map((i) => TECH_STORES[(start + i) % TECH_STORES.length]);
    return ['anor_black', ...stores.slice(0, 2)];
  }
  if (wantsTravel) return ['ipak_visa', 'kapital_bank', 'tbc_salom'];
  if (wantsStudy && wantsSave) return ['anor_black', 'tbc_salom'];
  if (wantsSave && /(yig'|jamg'ar|omonat)/.test(text)) return ['anor_black', 'tbc_salom'];
  return [];
}

// Katalogdan ID lar bo'yicha tanlash (backend resolvePartners bilan bir xil: takrorsiz, ko'pi bilan 3 ta).
export function pickPartners(catalog, ids) {
  const byId = new Map((Array.isArray(catalog) ? catalog : []).map((p) => [p.id, p]));
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    out.push(byId.get(id));
    if (out.length >= 3) break;
  }
  return out;
}
