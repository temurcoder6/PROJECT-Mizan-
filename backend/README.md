# Mizan server

Hisoblar va SQLite ma'lumotlar bazasi. Bitta jarayon: API ham, tayyor ilova (`../frontend/dist`) ham shu serverdan beriladi. Tashqi paket kerak emas, faqat Node.js 24 yoki yangisi.

## Ishga tushirish

```powershell
cd frontend
npm install
npm run build

cd ..\backend
npm start
```

Brauzerda `http://localhost:8787` ni oching, «Sozlamalar» bo'limida hisob oching. Baza `data/pulim.db` faylida (birinchi ishga tushishda o'zi yaratiladi).

Sozlash (ixtiyoriy): `.env.example` ni `.env` ga nusxalab, `PORT`, `DB_PATH`, `COOKIE_SECURE` ni o'zgartiring. Maxfiy kalit kerak emas.

## Tekshirish

```powershell
npm test
```

43 ta server, 27 ta bot va 12 ta xavfsizlik testi (vaqtinchalik xotira bazasida, soxta Telegram bilan): ro'yxatdan o'tish, kirish, saqlash va qaytarish, ikki foydalanuvchi ma'lumotining ajralganligi, eski revizya ziddiyati, noto'g'ri ma'lumotni tozalash, xato urinishdan keyin bloklash, begona Origin rad etilishi, chiqish va hisobni o'chirish.

## Baza tuzilmasi

`users`, `sessions`, `transactions`, `debts`, `debt_payments`, `goals`, `goal_adds`, `bills`, `no_spend_days`, `profile`. Hamma jadval `user_id` bilan bog'langan va foydalanuvchi o'chirilganda `ON DELETE CASCADE` bilan birga o'chadi. Yozuvlar uchun `(user_id, date)` indeksi bor.

## API

| So'rov | Vazifasi |
|---|---|
| `POST /api/register` | Hisob ochish (`username`, `password` ≥ 8 belgi) |
| `POST /api/login`, `POST /api/logout`, `GET /api/me` | Kirish, chiqish, joriy foydalanuvchi |
| `GET /api/auth/providers` | Google va GitHub OAuth sozlangan-sozlanmaganini tekshirish |
| `GET /api/auth/google`, `GET /api/auth/github` | Google/GitHub orqali kirish yoki ulangan hisobga qo'shish (PKCE + `state` himoyasi) |
| `DELETE /api/auth/oauth/:provider` | Google/GitHub ulanishini uzish (boshqa kirish usuli bo'lsa) |
| `GET /api/data` | Foydalanuvchining hamma ma'lumoti va `revision` |
| `PUT /api/data` | Hammasini saqlash. `baseRevision` serverdagidan farq qilsa `409` va serverdagi ma'lumot qaytadi |
| `DELETE /api/account` | Parolni tasdiqlab, hisob va ma'lumotni o'chirish |
| `POST /api/password` | Parolni almashtirish (joriy parol kerak; boshqa qurilmalar chiqariladi) |
| `GET /api/sessions` | Kirilgan qurilmalar ro'yxati (token chiqmaydi, joriysi belgilangan) |
| `DELETE /api/sessions/:id` | Bitta qurilmani uzish (faqat o'zining qurilmasini) |
| `POST /api/logout-all` | Barcha qurilmadan chiqish |
| `POST /api/recover` | Tiklash kodi bilan parolni tiklash (6 urinish / soat); yangi kod beriladi |
| `POST /api/recovery-code` | Parolni tasdiqlab yangi tiklash kodini olish (eskisi bekor bo'ladi) |
| `POST /api/support` | Shikoyat, muammo, taklif yoki savol yuborish (mehmon ham mumkin; soatiga 5 ta) |
| `GET /api/support/mine` | Hisobli foydalanuvchining murojaatlari va javoblari |
| `GET /api/health` | Server va baza salomatligi |

## Xavfsizlik: nima qilingan

- Parollar `scrypt` bilan tuzlangan holda xeshlanadi, oddiy matn saqlanmaydi.
- Sessiya: tasodifiy 256 bitli token, bazada faqat uning SHA-256 xeshi. Cookie `HttpOnly` va `SameSite=Lax`; `https` da `COOKIE_SECURE=1`.
- Xato kirish urinishlari cheklangan (8 ta / 10 daqiqa), ro'yxatdan o'tish ham IP bo'yicha cheklangan.
- `POST/PUT/DELETE` da begona `Origin` rad etiladi; kelgan ma'lumot turi, uzunligi va soni tekshiriladi, sana yo'q yozuv tashlanadi.
- Har foydalanuvchi faqat o'z qatorlarini ko'radi; barcha so'rovlar `user_id` bilan.
- CSP, `X-Frame-Options`, `nosniff` sarlavhalari qo'yilgan.
- **Faqat shu kompyuterga ochiq:** server standart holatda `127.0.0.1` da tinglaydi, ya'ni Wi-Fi'dagi boshqa qurilmalar unga kira olmaydi. Ataylab ochish uchun `HOST=0.0.0.0` ni `.env` ga yozing (faqat `https` va ishonchli tarmoqda).
- Fayl serverida yo'l bosib o'tish hujumlari (`..`, `%2e`, `%5C`, yonma-yon papka, yashirin fayllar) to'siladi.
- Kirmagan foydalanuvchi uchun so'rov hajmi 64 KB bilan cheklangan; ma'lumot yuklash 10 MB, lekin kirgan foydalanuvchi uchun va daqiqasiga 30 martagacha.
- Chegara jadvallari muddati o'tgach tozalanadi (xotirani to'ldirish hujumiga qarshi); sekin ulanishlarga vaqt chegarasi qo'yilgan.
- Juda oson parollar (`12345678`, `password`, nomning o'zi) rad etiladi.
- Saqlanayotgan matnlardan boshqaruv belgilari olib tashlanadi (egasi murojaatlarni terminalda o'qiganda terminalni aldash mumkin emas).
- Brauzerdagi xizmat skripti (service worker) `/api/` javoblarini hech qachon keshlamaydi: avvalgi versiyalarda ular keshlanib qolgan edi, yangi versiya eski keshni o'zi o'chiradi.
- CSV yuklab olishda `=`, `+`, `-`, `@` bilan boshlanadigan matn Excel formulasi bo'lib ishlamasligi uchun himoyalangan.


## Telegram bot

Bot server bilan **birga, bitta jarayonda** ishlaydi va saytdagi hisob va bazadan foydalanadi: botda yozilgan xarajat saytda ham ko'rinadi (ochiq sahifa 20 soniyada o'zi yangilanadi). U saytdagi yordamchining o'zi bilan ishlaydi: o'zbek (lotin/kirill), rus, ingliz tilida tushunadi, noaniq summani so'raydi va **«Saqlash» bosilmaguncha hech narsa saqlamaydi**.

**Ishga tushirish:**
1. Telegramda `@BotFather` ga `/newbot` yozing, bot yarating va tokenni oling.
2. `backend/.env` yarating (`.env.example` dan): `BOT_TOKEN=...` va `BOT_USERNAME=bot_nomi`.
3. `npm start`. Konsolda «Telegram bot ishga tushdi: @...» chiqadi.
4. Saytda **Sozlamalar → Telegram bot → Ulash kodini olish**, botga `/ulash KOD` yozing.

**Botda:** «non 5000», «Bugun yo'lga 12 ming sarfladim» (tasdiq tugmasi bilan), `/reja` (bugungi reja, hisobi bilan), `/bugun`, `/hafta`, `/hisobot`, `/ochir` (oxirgi yozuvni tasdiq bilan o'chirish), `/qarz`, `/maqsad`, `/maslahat`, `/pul 850000`, `/daromad 2026-12-04` (yoki `/daromad 9`), `/eslatma 21:00` (kunlik eslatma, telefon yopiq bo'lsa ham keladi), `/uzish`.

**Xavfsizlik:** bot faqat shaxsiy chatlarga javob beradi; ulanmagan chat hech narsani ko'ra olmaydi; ulash kodi 10 daqiqa va bir marta amal qiladi (bazada faqat xeshi), xato urinishlar cheklangan; xabar matni jurnalga yozilmaydi. Hisob o'chirilsa, Telegram ulanishi ham o'chadi.

**Cheklovlar (ochiq):** ovozli xabarni tushunmaydi (o'zbekcha nutqni tanish hali yo'q, bot buni aytadi). Haqiqiy Telegram bilan aloqa qatlami (`getUpdates`) shu muhitda sinalmagan: mantiqning hammasi soxta Telegram bilan 27 ta testda tekshirilgan, lekin tokenni qo'ygach birinchi ishga tushirishni o'zingiz kuzating. Sana va eslatma vaqti server joylashgan kompyuterning soatiga bog'liq. Bot `../frontend/src/lib` fayllarini ishlatadi, shuning uchun papkalar joyida turishi kerak. Eski `../backend/eski-python-bot` (Python) alohida bazada edi, endi kerak emas.

## Yordam xizmati (egasi uchun)

Foydalanuvchilar ilovadagi «Yordam» sahifasidan murojaat yuboradi, u `support_tickets` jadvaliga tushadi. Egasi o'qiydi va javob beradi:

```powershell
npm run tickets                       # ochiq murojaatlar
npm run tickets -- all                # hammasi
npm run tickets -- reply 3 "Javob"    # javob berish (foydalanuvchi o'z sahifasida ko'radi)
npm run tickets -- close 3            # yopish
```

Hisobni o'chirgan foydalanuvchining murojaatlari ham o'chadi. Javob muddati kafolatlanmaydi: murojaatlarni o'zingiz muntazam tekshirishingiz kerak.

## Mustahkamlik

- **Zaxira nusxa:** server ishga tushganda va har 6 soatda `data/backups/` ga bazaning izchil nusxasi olinadi (oxirgi 7 tasi saqlanadi). Bu bitta kompyuterdagi nusxa: haqiqiy xavfsizlik uchun papkani boshqa joyga ham ko'chirib turing.
- Ishga tushganda baza yaxlitligi tekshiriladi; to'xtatishda (Ctrl+C) baza toza yopiladi.
- Umumiy chegara: bir manzildan daqiqasiga 300 so'rov; kirish va parol xatolariga alohida chegara.
- `COOKIE_SECURE=1` bo'lsa, `Strict-Transport-Security` sarlavhasi ham yuboriladi.

## Google va GitHub orqali kirish (localhost:8787 uchun sozlash)

Server haqiqiy OAuth 2.0 bilan ishlaydi. Lokal sinov (`http://localhost:8787`) uchun `backend/.env` fayliga quyidagi kalitlarni qo'ying:

1. **Google Cloud Console** → *APIs & Services* → *Credentials* → *Create Credentials* → *OAuth client ID* (*Web application*):
   - Authorized JavaScript origins: `http://localhost:8787`
   - Authorized redirect URIs: `http://localhost:8787/api/auth/google/callback`
   - `.env` ga yozing: `GOOGLE_CLIENT_ID=...` va `GOOGLE_CLIENT_SECRET=...`
2. **GitHub** → *Settings* → *Developer settings* → *OAuth Apps* → *New OAuth App*:
   - Homepage URL: `http://localhost:8787`
   - Authorization callback URL: `http://localhost:8787/api/auth/github/callback`
   - `.env` ga yozing: `GITHUB_CLIENT_ID=...` va `GITHUB_CLIENT_SECRET=...`
3. `.env` da `PUBLIC_URL=http://localhost:8787` qoldiring va `npm start` ni qayta ishga tushiring. (Kalitlar bo'sh bo'lsa, sayt bu usullarni halol holatda «sozlanmagan» deb ko'rsatadi.)

## Cheklovlar (ochiq aytamiz)

- **Parolni tiklash faqat tiklash kodi bilan** (agar foydalanuvchi nom+parol bilan ochgan bo'lsa). Google yoki GitHub bilan ochilgan hisobga parol keyinchalik Sozlamalardan qo'shilishi mumkin. Pasport yoki boshqa hujjat so'ralmaydi.
- Sinxronlash butun ma'lumotni almashtirish usulida. Ikki qurilmada bir vaqtda o'zgartirilsa, ziddiyat oynasi chiqadi; birlashtirishda oldin o'chirilgan yozuv qayta paydo bo'lishi mumkin (o'chirish belgisi saqlanmaydi).
- SQLite bir server uchun mo'ljallangan. Foydalanuvchilar ko'payganda yoki bir nechta server kerak bo'lganda PostgreSQL ga o'tish kerak; jadvallar shunga mos tuzilgan.
- `https` va monitoring hali sozlanmagan. Haqiqiy foydalanuvchilarga ochishdan oldin serverni `https` ostiga qo'ying va `data/backups/` papkasini boshqa joyga ham nusxalab turing.
- Foydalanuvchi nomi band yoki yo'qligi ro'yxatdan o'tishda ko'rinadi (nomlarni aniqlash mumkin); kirishda esa bunday farq yo'q. Server proksi orqasida ishlasa, chegaralar proksi manziliga bog'lanadi: proksida alohida chegara qo'ying.
- Yordam xizmati hozircha qo'lda: murojaatlarni `npm run tickets` bilan o'zingiz o'qiysiz, xabarnoma kelmaydi.
- Telegram bot yuqorida tasvirlangan; ovozli xabar hali yo'q.





## Egasi uchun buyruqlar

- `npm run admin -- foydalanuvchi_nomi` — foydalanuvchiga web admin huquqini berish (`off` bilan olish mumkin; yoki `.env` da `ADMIN_USERNAMES=admin`).
- `npm run stats` — umumiy sonlar (hisoblar, yozuvlar, ulangan botlar). Shaxsiy yozuv chiqmaydi.
- `npm run tickets` — murojaatlar.
- `node restore.mjs` — zaxiradan tiklash.
- Baza sxemasi `PRAGMA user_version` bilan versiyalanadi: server ochilganda yetishmagan migratsiyalar o'zi qo'llanadi (hozir v5).
