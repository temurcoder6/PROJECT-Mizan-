// Mizan hamkorlik katalogi: bank kartalari, omonatlar, do'konlar va muddatli to'lov variantlari.
// Hozircha bu faqat tavsiya: hamkorlar bilan shartnoma tuzilmagan, komissiya olinmaydi. Shartnoma rejada.
// Narx, foiz va komissiya shartlari hamkorning o'z saytida; bu yerda ular o'ylab topilmaydi.
// `installment: true` — muddatli to'lov (nasiya) beruvchi hamkor; kartada umumiy narx oshishi mumkinligi eslatiladi.

export const PARTNERS = {
  tbc_salom: {
    id: 'tbc_salom',
    name: 'TBC Bank — Salom Card',
    category: 'Bank kartasi',
    badge: '0% P2P + Foyda',
    tagline: "Bepul ochish va uyga yetkazish · qoldiqqa foiz · bepul P2P o'tkazmalar",
    benefit: "Payme/Clickdagi 1% o'tkazma komissiyasini tejash va kunlik qoldiqdan foiz olish uchun ideal.",
    url: 'https://tbcbank.uz/uz/cards/salom-card/',
  },
  tbc_osmon: {
    id: 'tbc_osmon',
    name: 'TBC Bank — Osmon Card',
    category: 'Kredit karta',
    badge: '55 kun 0%',
    tagline: "55 kungacha foizsiz imtiyozli davr · 100 mln so'mgacha onlayn limit",
    benefit: "Kutilmagan xarajatlarda foiz to'lamasdan keyingi oylikkacha yopib turish imkoniyati.",
    url: 'https://tbcbank.uz/uz/cards/osmon-card/',
  },
  uzum_karta: {
    id: 'uzum_karta',
    name: 'Uzum Bank — Uzum Karta',
    category: 'Bank kartasi',
    badge: 'Bepul + Keshbek',
    tagline: "Bepul virtual va Visa plastik · 0% P2P limitlar · Uzum ekotizimida keshbek",
    benefit: "Uzum Market xaridlari va oylik o'tkazmalarda komissiya tejaydi.",
    url: 'https://uzumbank.uz/',
  },
  anor_black: {
    id: 'anor_black',
    name: 'Anorbank — Anor Black / Omonat',
    category: 'Bank & Omonat',
    badge: 'Yuqori foiz',
    tagline: "Keshbek kartasi va yuqori foizli onlayn so'm omonatlari",
    benefit: "Telefon yoki katta xaridga pul yig'ishda mablag'ni inflyatsiyadan himoya qilib ko'paytiradi.",
    url: 'https://anorbank.uz/',
  },
  avo_platinum: {
    id: 'avo_platinum',
    name: 'AVO Bank — AVO Platinum',
    category: 'Kredit karta',
    badge: '45 kun 0%',
    tagline: "45 kungacha foizsiz davr · ilovada bir necha daqiqada ochiladi",
    benefit: "Qisqa muddatli xaridlarda nasiya ustamasisiz bo'lib ishlatish uchun qulay.",
    url: 'https://avo.uz/',
  },
  ipak_visa: {
    id: 'ipak_visa',
    name: "Ipak Yo'li Bank — Visa / Humo",
    category: 'Xalqaro karta',
    badge: 'Valyuta & Keshbek',
    tagline: "Visa Start/Classic/Gold · Apple/Google/Amazon to'lovlari va onlayn konvertatsiya",
    benefit: "Xorijiy obunalar, dollar saqlash va xalqaro xaridlar uchun qulay tariflar.",
    url: 'https://ipakyulibank.uz/',
  },
  kapital_bank: {
    id: 'kapital_bank',
    name: 'Kapitalbank — Visa / Uzcard',
    category: 'Bank & Valyuta',
    badge: 'Tezkor valyuta',
    tagline: "Valyuta ayirboshlash, Visa Direct va keng bankomat tarmog'i",
    benefit: "Naqd dollar va so'm o'tkazmalarida tezkor xizmat.",
    url: 'https://kapitalbank.uz/',
  },
  olcha_uz: {
    id: 'olcha_uz',
    name: 'Olcha.uz',
    category: "Rasmiy do'kon",
    badge: 'Naqd + Nasiya',
    tagline: "Rasmiy kafolatli smartfon va maishiy texnika · real vaqt narxlari",
    benefit: "Naqd narx va muddatli to'lovni oldindan solishtirib buyurtma berish mumkin.",
    url: 'https://olcha.uz/',
  },
  uzum_nasiya: {
    id: 'uzum_nasiya',
    name: 'Uzum Market & Uzum Nasiya',
    category: "Marketpleys & Nasiya",
    badge: '3–24 oy',
    tagline: "1 kunda bepul yetkazish · boshlang'ich to'lovsiz 24 oygacha bo'lib to'lash",
    benefit: "Aksiyali mahsulotlarni naqd yoki foizsiz 3 oylik rejalarda olish imkoniyati.",
    url: 'https://uzum.uz/',
  },
  asaxiy_uz: {
    id: 'asaxiy_uz',
    name: 'Asaxiy.uz',
    category: "Elektronika do'koni",
    badge: 'Kafolatli narx',
    tagline: "Smartfon, noutbuk va texnika — naqd arzon narx va muddatli to'lov",
    benefit: "Rasmiy kafolat bilan naqd va bo'lib to'lash narxlarini taqqoslash uchun qulay.",
    url: 'https://asaxiy.uz/',
  },
  alif_nasiya: {
    id: 'alif_nasiya',
    name: 'Alif Nasiya / Alif Shop',
    category: "Muddatli to'lov",
    badge: 'Ochiq shart',
    tagline: "Shaffof oylik to'lovlar · hamkor do'konlar tarmog'i",
    benefit: "Yashirin komissiyasiz muddatli to'lov jadvalini oldindan ko'rish mumkin.",
    url: 'https://alifshop.uz/',
  },
  iman_pay: {
    id: 'iman_pay',
    name: 'Iman Pay',
    category: 'Islomiy moliya',
    badge: 'Penyadan xoli',
    tagline: "Islomiy moliya (murabaha) tamoyili · kechikish jarimasiz bo'lib to'lash",
    benefit: "Shariat tamoyillariga mos halol muddatli to'lov izlovchilar uchun.",
    url: 'https://imanpay.uz/',
  },
  texnomart: {
    id: 'texnomart',
    name: 'Texnomart',
    category: 'Texnika tarmog‘i',
    badge: 'Aksiyalar 0%',
    tagline: "Butun O'zbekiston bo'ylab filiallar · maishiy texnika va gadjetlar",
    benefit: "Mavsumiy 0% chegirma va naqd xarid bonuslaridan foydalanish mumkin.",
    url: 'https://texnomart.uz/',
  },
  // Idea va Ishonch: rasmiy saytlari 2026-11-28 da tekshirildi (idea.uz, ishonchsavdo.uz — ochiladi, muddatli to'lov bo'limi bor).
  idea_uz: {
    id: 'idea_uz',
    name: 'Idea',
    category: "Do'konlar tarmog'i",
    badge: "Muddatli to'lov",
    tagline: "Smartfon va maishiy texnika onlayn do'koni · muddatli to'lov bo'limi mavjud",
    benefit: "Muddatli to'lov shartlari rasmiy saytida ko'rsatilgan.",
    url: 'https://idea.uz/',
  },
  ishonch: {
    id: 'ishonch',
    name: 'Ishonch',
    category: "Do'konlar tarmog'i",
    badge: "Muddatli to'lov",
    tagline: "Maishiy texnika, elektronika va uy jihozlari · muddatli to'lov mavjud",
    benefit: "Muddatli to'lov shartlari rasmiy saytida ko'rsatilgan.",
    url: 'https://ishonchsavdo.uz/',
  },
};

// Nasiya (muddatli to'lov) beruvchi hamkorlar: kartada halollik izohi chiqadi.
const INSTALLMENT_IDS = new Set(['olcha_uz', 'uzum_nasiya', 'asaxiy_uz', 'alif_nasiya', 'iman_pay', 'texnomart', 'idea_uz', 'ishonch']);
for (const id of INSTALLMENT_IDS) PARTNERS[id].installment = true;

export function resolvePartners(ids = []) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of ids) {
    const id = String(raw || '').trim();
    if (!id || seen.has(id) || !PARTNERS[id]) continue;
    seen.add(id);
    out.push(PARTNERS[id]);
    if (out.length >= 3) break;
  }
  return out;
}
