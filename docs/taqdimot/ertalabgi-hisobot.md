# Ertalabki hisobot (2026-11-26)

Siz ruxsat bergan kechasi men savol bermay ishladim. Quyida nima qilindi, nima topildi va qaysi katta qarorlar sizning javobingizni kutadi.

## 1. Hozirgi holat

| Nima | Holat |
|---|---|
| Server (SQLite, bot) | Ishlayapti, `http://localhost:8787` |
| Internetdagi havola | Vaqtincha, manzili har safar o'zgaradi: `backend/public-url.txt` ichida (oxirgisi `https://253f7e09bac2e7.app.lhr.life`). Kompyuter yoqiq bo'lsa ishlaydi |
| Telegram bot `@mizan_uzbot` | Ishlayapti, yangi buyruqlar bilan |
| `Mizan.html` (bitta fayl) | Yangilandi (Desktop\FINAL\Mizan.html) |
| Testlar | Server 99 ta, frontend 28 ta, hammasi o'tdi |

Kompyuter uyquga ketsa yoki qopqog'i yopilsa, server, bot va havola to'xtaydi. Ekranni qulflash (Win+L) ta'sir qilmaydi. Uyquni o'chirish: Sozlamalar → Tizim → Quvvat → «Uyqu: hech qachon» (quvvat ulanganda).

## 2. Bugun qilingan ishlar

**Qotib qolish va qulashdan himoya**
- 8000 ta yozuv bilan sinadim: sahifalar 60–200 ms da ochiladi, qotmaydi (ro'yxat 300 ta qatorgacha ko'rsatiladi).
- `ErrorBoundary`: kutilmagan xatoda oq ekran o'rniga «Nimadir xato ketdi», «Qayta yuklash» va «Zaxira nusxani yuklab olish» tugmalari chiqadi.
- Brauzer xotirasidagi (localStorage) buzilgan qiymat (masalan, massiv o'rniga matn) endi ilovani qulatmaydi: boshlang'ich qiymat olinadi. Sinab ko'rdim.
- JSON import tozalanadi: noto'g'ri yozuvlar tashlanadi, summa va sana tekshiriladi, 50 000 tadan ortig'i kesiladi (`lib/sanitize.js`, testlar bilan).

**Backend**
- Baza sxemasi versiyalanadi (`PRAGMA user_version`, hozir v2). Yangi migratsiya ro'yxat oxiriga qo'shiladi.
- Qurilmalar: `GET /api/sessions`, `DELETE /api/sessions/:id`. Token hech qachon chiqmaydi, birovning qurilmasini uzib bo'lmaydi (testlangan). Sozlamalarda «Kirilgan qurilmalarim» bor.
- `npm run stats`: hisoblar, yozuvlar, Telegram ulanishlari sonlari (shaxsiy yozuvsiz).
- Migratsiyadan oldin jonli bazaning nusxasi olindi: `data/backups/pre-migration-…`.

**Telegram bot**
- Yangi: `/bugun` (bugungi yozuvlar), `/hafta` (7 kun), `/ochir` (oxirgi yozuvni o'chirish, avval so'raydi). 9 ta yangi test.

**Dizayn va animatsiya**
- Sahifa almashganda yumshoq paydo bo'lish.
- Kunlik reja raqami o'zgarganda silliq sanaladi (`AnimatedNumber`). Sozlamalarda animatsiya o'chirilgan yoki brauzer «kamroq harakat» so'ragan bo'lsa, darhol yangi qiymat chiqadi.

**Halollik tuzatishlari**
- Sayt ro'yxatida «Telegram bot hozir alohida ishlaydi» degan eskirgan qator bor edi: u endi «ishlaydi» bo'limida. «Yopiq telefonga push» o'rniga halol: «eslatma hozircha Telegram orqali keladi».

## 3. Topilgan va hal qilinmagan joylar

1. **Sinov ma'lumotlari bilan vizual tekshiruv cheklangan.** Brauzer oynasi yashirin bo'lgani uchun animatsiyalarni real vaqtda ko'rmadim, faqat oxirgi holatini tekshirdim. Telefoningizda ko'rib, yoqmasa ayting.
2. **Konsolda 401 xabarlari.** Kirilmagan holatda `/api/me` 401 qaytaradi, bu kutilgan xatti-harakat va xato emas. «Fetching the script» xabari eski xizmat ishchisini (service worker) yangilashda chiqadi. Foydalanuvchiga ko'rinmaydi.
3. **Havola manzili o'zgaradi.** `localhost.run` bepul va vaqtincha. Hakamlarga bergan manzil o'zgarsa ishlamay qoladi. Doimiy yechim pastda (4-bo'lim).
4. **Mustaqil xavfsizlik auditi yo'q.** Men 11 ta zaif joyni topib tuzatdim, lekin bu mustaqil audit emas.
5. **Bot token** `.env` da. Hech qaerga chiqmagan, GitHub'ga ham tushmaydi (`.gitignore`da). Agar kimgadir ko'rsatgan bo'lsangiz, @BotFather → `/revoke` bilan almashtiring.

## 4. Katta g'oyalar (sizning qarorlaringiz kerak)

Quyidagilarni men o'zim boshlamadim, chunki pul, hisob yoki shaxsiy ma'lumot kerak.

| G'oya | Nima kerak | Eslatma |
|---|---|---|
| Doimiy server (VPS) + domen | Oyiga ~5–10 dollar va to'lov usuli | Havola o'zgarmaydi, kompyuter o'chiq bo'lsa ham ishlaydi. Bepul tariflarda SQLite uchun doimiy disk odatda yo'q yoki pullik (manbalar pastda, tekshirilmagan) |
| Telegram orqali to'lov (pullik tarif) | Click yoki Payme bilan shartnoma | Telegram to'lov provayderlari orasida Payme va Click bor, 2021 yildagi maqolalarda yozilgan. Obuna (har oy avtomatik yechish) mumkinligini tasdiqlay olmadim, ularning hujjatidan tekshirish kerak |
| IT Park rezidentligi / yoshlar startap grantlari | Ro'yxatdan o'tgan startap, ariza | IT Park saytida: Digital Startups dasturi, yoshlar startaplari uchun 2026-yilda 2 mlrd so'm ajratilishi e'lon qilingan. Shartlari va muddatlari aniq emas, my.it-park.uz da tekshirish kerak |
| Kuchli o'zbekcha ovoz | Xizmat tanlash, kalit, sinov | Avval 20–30 ta haqiqiy jumla bilan sifatini o'lchash kerak |
| Pochta yoki Google bilan kirish | Google kaliti | Hozir ataylab faqat nom va parol, tiklash kodi bor |
| 10 kishi bilan haqiqiy sinov | Sizning vaqtingiz | Hakamlar uchun eng kuchli dalil. Natijani slaydga qo'ying |
| GitHub'ga yuklash | Sizning buyrug'ingiz | Hali qilmadim (oxirida deganingiz uchun) |

## 5. Pul topish bo'yicha halol xulosa

- Foydalanuvchi ma'lumotini sotish yo'q (ishonch va qonuniy xavf).
- Real yo'l: bepul asosiy funksiyalar, pullik qism (oila byudjeti, PDF hisobot, ko'proq tarix). Narx hali sinalmagan faraz.
- Pul haqida gapirishdan oldin kamida 10 haqiqiy foydalanuvchi va ularning 2 kunlik natijasi kerak.

## 6. Manbalar (men o'qigan, to'liq tekshirilmagan)

- [Telegram: to'lov provayderlari (blog)](https://telegram.org/blog/payments?setln=it)
- [Spot.uz: Telegram'da to'lov (2021)](https://www.spot.uz/oz/2021/06/24/telegram-payments/)
- [IT Park: yosh startaplarga davlat yordami](https://www.outsource.gov.uz/en/media/forty-top-youth-led-startups-in-uzbekistan-to-receive-government-support)
- [IT Park: qo'llab-quvvatlash dasturlari qo'llanmasi](https://www.outsource.gov.uz/media/useful-guide-what-support-programs-does-it-park-provide)
- [Render hamjamiyati: bepul tarifda SQLite](https://community.render.com/t/is-a-sqlite-in-the-free-account-deleted-after-some-time/6960)

Hakamlarga aytganda: «bu manbalar menga g'oya berdi, narx va shartlarni hali o'zim tekshirmaganman».

## 7. Ertaga birinchi qadamlar (tavsiyam)

1. Telefoningizda saytni oching va bir kun yozib ko'ring: nima xalaqit qilganini yozib qo'ying.
2. 3 ta tanishga bering (Telegram bot orqali), 2 kundan keyin so'rang.
3. Keyin qaror: doimiy server yoki hozirgi holatda taqdimot.
