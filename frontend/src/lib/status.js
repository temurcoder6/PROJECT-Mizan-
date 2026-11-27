// Single source for "what works now" so the landing page and settings never disagree.

export const WORKS_NOW = [
  "Kunlik reja: «bugun qancha sarflasam bo'ladi?» — siz kiritgan pul, daromad sanasi, to'lovlar, qarz muddati va jamg'arma asosida, hisobi ko'rsatilgan reja",
  "Tez kiritish: summa yozib, toifani bosish bilan saqlash; yaqinda yozilganlarni bir bosishda takrorlash; bekor qilish",
  "Unutilgan kunni kalendardan tanlab, umumiy summa kiritish yoki «xarajat bo'lmadi» deb belgilash",
  "Daromad va xarajat: qo'shish, tahrirlash, o'chirish; hafta va oy hisoboti; rejalangan va kutilmagan xarajat",
  "Odat tuzog'i (takrorlanadigan xarajat), haftalik jamlanma (ma'lumot yetarli bo'lsa)",
  "Qarz daftari: qisman qaytarish, qoldiq, muddat, eslatma; qarzni oldindan rejalash (muddatgacha teng haftalik to'lov jadvali)",
  "Davriy to'lovlar (har oy, har hafta, bir martalik): keyingi 30 kun, oylik yuk, kunlik rejadan ajratish",
  "Bir nechta jamg'arma maqsadi, haftalik/oylik formula, «Agar sarflasam-chi?» va keyingi kichik qadam",
  "Yordamchi: matndan yozuv tayyorlaydi (tasdiqdan keyin saqlanadi), o'zbek (lotin/kirill), rus va ingliz tilida javob beradi",
  "Shubhali SMS yoki havolani tushuntirish (matnni o'zingiz qo'yasiz, tekshiruv qurilmada)",
  "Hisob va SQLite ma'lumotlar bazasi: serverda saqlash, qurilmalar orasida sinxronlash, ziddiyatni hal qilish, Google/GitHub OAuth (kalitlar sozlanganda) va tiklash kodi bilan parolni tiklash (backend ishlab turganda)",
  "Yordam va shikoyat xizmati: murojaat yuborish, holat va javobni ko'rish",
  "Telegram bot (@mizan_uzbot): sayt bilan bitta hisob va baza; «non 5000» yozasiz, /reja, /hisobot, /ai savol-javob va kunlik eslatma",
  "Kirilgan qurilmalar ro'yxati va birini uzish",
  "Ma'lumotni yuklab olish (JSON, CSV), tiklash, hisobni va hamma ma'lumotni o'chirish",
];

export const DEPENDS_ON_DEVICE = [
  "Ovozli kiritish: Chrome va Edge'da ishlaydi; ovoz brauzerning nutqni tanish xizmati orqali matnga aylanadi",
  "Javobni ovoz chiqarib o'qish: qurilmada shu tilning ovozi o'rnatilgan bo'lsa",
  "Kunlik eslatma: ilova yoki brauzer ochiq bo'lganda bildirishnoma beradi",
  "Telefonga o'rnatish (PWA): faqat https manzilda ishlaydi",
];

export const NEXT_STAGE = [
  "Ilova uchun brauzer push eslatma",
  "Katta til modeli (AI) — faqat serverda, maxfiy kalit brauzerga yozilmaydi",
  "Pochta orqali kirish (ixtiyoriy), PostgreSQL ga o'tish (foydalanuvchilar ko'payganda)",
  "Oilaviy umumiy maqsad, PDF hisobot, Android ilova",
];
