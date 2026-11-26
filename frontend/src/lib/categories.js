import { normalize } from './text.js';

export const EXPENSE_CATEGORIES = [
  { id: 'oziq', uz: 'Oziq-ovqat', ru: 'Продукты', en: 'Food', color: '#10b981',
    words: ['non', "go'sht", 'gosht', 'sut', 'tuxum', 'shakar', 'choy', 'meva', 'sabzavot', 'kofe', 'guruch', "yog'", 'ovqat', 'tushlik', 'nonushta', 'somsa', 'kolbasa', 'kartoshka', 'piyoz', 'sabzi', 'shirinlik', 'tort', 'pishiriq', 'osh', 'palov', 'lagmon', "lag'mon", 'shashlik', 'lavash', 'pitsa', 'burger', 'cola', 'kola', 'fanta', 'pepsi', 'sharbat', 'ichimlik', 'qand', 'makaron', 'qatiq', 'pishloq', 'obed', 'fastfood', 'fast food', 'хлеб', 'еда', 'продукт', 'мяс', 'молок', 'кофе', 'чай', 'обед', 'food', 'bread', 'coffee', 'lunch', 'dinner', 'breakfast', 'meat', 'milk', 'grocer'] },
  { id: 'bozor', uz: 'Bozor', ru: 'Базар', en: 'Bazaar', color: '#14b8a6',
    words: ['bozor', 'рынок', 'базар', 'bazaar', 'market'] },
  { id: 'transport', uz: 'Transport', ru: 'Транспорт', en: 'Transport', color: '#3b82f6',
    words: ['taksi', 'taxi', 'benzin', 'metan', 'propan', "yo'l", 'avtobus', 'marshrutka', 'metro', "yoqilg'i", 'yoqilgi', 'yandex', 'uber', 'poezd', 'samolyot', 'aviabilet', 'такси', 'бензин', 'метан', 'дорог', 'проезд', 'автобус', 'маршрутк', 'fuel', 'petrol', 'bus', 'transport', 'ride'] },
  { id: 'kommunal', uz: 'Kommunal', ru: 'Коммунальные', en: 'Utilities', color: '#f59e0b',
    words: ['gaz', 'svet', 'elektr', 'suv', 'kommunal', 'tok', 'chiqindi', 'isitish', 'issiqlik', "ko'mir", 'газ', 'свет', 'электр', 'вода', 'коммунал', 'electric', 'water', 'utilit'] },
  { id: 'aloqa', uz: 'Telefon va internet', ru: 'Связь', en: 'Phone & internet', color: '#8b5cf6',
    words: ['internet', 'telefonga', 'telefon puli', 'aloqa', 'tarif', 'wifi', 'wi-fi', 'mobil', 'beeline', 'ucell', 'uzmobile', 'mobiuz', 'paket', 'интернет', 'связь', 'mobile', 'internet'] },
  { id: 'uy', uz: "Uy-ro'zg'or", ru: 'Дом', en: 'Household', color: '#64748b',
    words: ['sovun', 'idish', 'mebel', "ta'mir", 'tamir', 'jihoz', 'kukun', 'supurgi', 'lampochka', "ro'zg'or", 'rozgor', 'мыло', 'посуд', 'ремонт', 'мебел', 'household', 'repair', 'soap'] },
  { id: 'ijtimoiy', uz: "To'y va mehmon", ru: 'Свадьба и гости', en: 'Events & gifts', color: '#ec4899',
    words: ["to'y", 'mehmon', "sovg'a", 'sovga', 'xayr', 'ehson', "tug'ilgan", 'nikoh', 'marosim', 'tabrik', 'hashar', 'свадьб', 'гост', 'подар', 'wedding', 'gift', 'guest', 'party'] },
  { id: 'kiyim', uz: 'Kiyim', ru: 'Одежда', en: 'Clothes', color: '#f97316',
    words: ['kiyim', 'poyabzal', "ko'ylak", 'shim', 'kurtka', 'krossovka', 'krasovka', 'palto', 'sumka', 'kepka', 'paypoq', 'одежд', 'обув', 'куртк', 'clothes', 'shoes', 'shirt'] },
  { id: 'salomatlik', uz: 'Dori-darmon', ru: 'Здоровье', en: 'Health', color: '#ef4444',
    words: ['dori', 'shifokor', 'doktor', 'analiz', 'kasalxona', 'apteka', 'vitamin', 'davolan', 'tish', 'ukol', 'shifoxona', 'poliklinika', 'operatsiya', 'лекарств', 'аптек', 'врач', 'анализ', 'medicine', 'pharmacy', 'doctor', 'clinic'] },
  { id: 'talim', uz: "O'qish", ru: 'Учёба', en: 'Education', color: '#0ea5e9',
    words: ['kurs', 'kitob', 'daftar', 'maktab', "o'qish", 'kontrakt', 'repetitor', 'ruchka', 'qalam', 'universitet', 'litsey', 'kollej', 'imtihon', 'ielts', 'sertifikat', 'курс', 'книг', 'школ', 'учеб', 'course', 'book', 'school', 'tuition'] },
  { id: 'dam', uz: "Ko'ngilochar", ru: 'Развлечения', en: 'Fun', color: '#a855f7',
    words: ['kino', "o'yin", 'kafe', 'restoran', 'aylanish', 'konsert', 'teatr', 'sayohat', 'dam olish', 'karaoke', 'bilyard', 'basseyn', 'fitnes', 'кино', 'игр', 'кафе', 'ресторан', 'cinema', 'movie', 'game', 'cafe', 'restaurant'] },
  { id: 'kunjami', uz: 'Kun jami (tafsilotsiz)', ru: 'Итого за день', en: 'Day total', color: '#78716c', words: [] },
  { id: 'boshqa', uz: 'Boshqa', ru: 'Другое', en: 'Other', color: '#94a3b8', words: [] },
];

export const INCOME_CATEGORIES = [
  { id: 'maosh', uz: 'Ish haqi', ru: 'Зарплата', en: 'Salary', color: '#059669',
    words: ['maosh', 'oylik', 'ish haqi', 'avans', 'зарплат', 'аванс', 'salary', 'wage', 'paycheck'] },
  { id: 'savdo', uz: 'Savdo / xizmat', ru: 'Торговля / услуги', en: 'Sales / services', color: '#0d9488',
    words: ['savdo', 'sotdim', 'buyurtma', 'xizmat', 'продал', 'продаж', 'заказ', 'sold', 'sale', 'client', 'order'] },
  { id: 'dehqon', uz: 'Dehqonchilik / chorva', ru: 'Сельское хозяйство', en: 'Farming', color: '#65a30d',
    words: ['hosil', 'paxta', "bug'doy", 'chorva', 'урожай', 'хлопок', 'скот', 'harvest', 'cattle', 'farm'] },
  { id: 'yordam', uz: 'Oila yordami', ru: 'Помощь семьи', en: 'Family support', color: '#2563eb',
    words: ['otamdan', 'onamdan', 'akamdan', 'opamdan', 'ukamdan', 'singlimdan', 'dadamdan', 'buvimdan', 'bobomdan', 'родител', 'parents', 'family'] },
  { id: 'boshqa_d', uz: 'Boshqa daromad', ru: 'Другой доход', en: 'Other income', color: '#94a3b8', words: [] },
];

export const PAYMENT_METHODS = [
  { id: 'naqd', uz: 'Naqd', ru: 'Наличные', en: 'Cash' },
  { id: 'karta', uz: 'Karta', ru: 'Карта', en: 'Card' },
  { id: 'otkazma', uz: "O'tkazma", ru: 'Перевод', en: 'Transfer' },
];

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoryOf(id) {
  return ALL.find((c) => c.id === id) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function categoryLabel(id, lang = 'uz') {
  const c = categoryOf(id);
  return lang === 'ru' ? c.ru : lang === 'en' ? c.en : c.uz;
}

export function methodLabel(id, lang = 'uz') {
  const m = PAYMENT_METHODS.find((x) => x.id === id) || PAYMENT_METHODS[0];
  return lang === 'ru' ? m.ru : lang === 'en' ? m.en : m.uz;
}

// Returns null when no keyword matches, so callers can tell "unknown" apart from "Other".
// Ovozdan matnga o'tganda apostrof tushib qoladi ("yolga", "gosht"), shuning uchun ikki tomondan ham olib tashlab solishtiramiz.
const noApos = (x) => x.replace(/'/g, '');

export function matchCategory(text, type = 'expense') {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const s = noApos(normalize(text));
  const tokens = s.split(/[^a-zа-яёўқғҳ0-9]+/).filter(Boolean);
  for (const c of list) {
    for (const raw of c.words) {
      const w = noApos(raw);
      if (w.includes(' ') ? s.includes(w) : tokens.some((t) => t.startsWith(w))) return c.id;
    }
  }
  return null;
}

export function guessCategory(text, type = 'expense') {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return matchCategory(text, type) || list[list.length - 1].id;
}
