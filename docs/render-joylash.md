# Render'ga joylash

Maqsad: saytga **o'zgarmas manzil** berish. Hozirgi `trycloudflare` havolasi har safar o'zgaradi, shuning uchun Google orqali kirish ishlamaydi va kompyuter o'chsa sayt yo'qoladi. Render'da manzil bir marta beriladi va o'zgarmaydi.

Hamma sozlama `render.yaml` da tayyor. Quyidagi qadamlarni o'zingiz bajarasiz, chunki ular sizning hisobingizga kirishni talab qiladi.

## 1. Render'da xizmat yaratish

1. [render.com](https://render.com) ga kiring va GitHub hisobingiz bilan ro'yxatdan o'ting.
2. **New → Blueprint** ni tanlang (Web Service emas: `render.yaml` ni o'qishi uchun Blueprint kerak).
3. `temurcoder6/PROJECT-Mizan-` omborini ulang va tasdiqlang.
4. Render `render.yaml` ni o'qib, `mizan-app` nomli xizmatni taklif qiladi. **Apply** ni bosing.

Birinchi qurilish 3–5 daqiqa oladi. Tugagach manzil shunday ko'rinadi: `https://mizan-app.onrender.com` (nom band bo'lsa Render oxiriga qo'shimcha qo'shadi — **aniq manzilni nusxalab oling**).

## 2. Maxfiy kalitlarni kiritish

Render panelida xizmatni oching → **Environment** bo'limi. `render.yaml` dagi `sync: false` kalitlar bo'sh turadi, qiymatlarini shu yerga yozasiz. Qiymatlarni kompyuteringizdagi `backend/.env` faylidan oling.

| Kalit | Nima yoziladi |
|---|---|
| `PUBLIC_URL` | Render bergan manzil, masalan `https://mizan-app.onrender.com` (oxirida `/` bo'lmasin) |
| `ADMIN_PASSWORD` | Admin paneli uchun **yangi** parol |
| `ADMIN_USERNAMES` | Admin foydalanuvchi nomlari |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console'dan |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth App'dan |
| `GEMINI_API_KEY` | Yordamchi uchun (ixtiyoriy) |
| `BOT_TOKEN`, `BOT_USERNAME` | Telegram bot (ixtiyoriy) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Bulutli zaxira (ixtiyoriy) |

Saqlaganingizdan keyin Render xizmatni o'zi qayta yoqadi.

> **Parolni almashtiring.** Eski admin paroli skrinshotda ochiq ko'ringan edi, shuning uchun Render'ga yangisini yozing.

## 3. Google orqali kirishni yoqish

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Credentials** → OAuth 2.0 Client ID → tahrirlash:

- **Authorized JavaScript origins** ga qo'shing:
  ```
  https://mizan-app.onrender.com
  ```
- **Authorized redirect URIs** ga qo'shing:
  ```
  https://mizan-app.onrender.com/api/auth/google/callback
  ```

Manzilni Render bergan haqiqiy manzil bilan almashtiring. Saqlangandan keyin Google o'zgarishni qabul qilishi bir necha daqiqa olishi mumkin.

GitHub uchun xuddi shunday: GitHub → Settings → Developer settings → OAuth Apps → **Authorization callback URL**:
```
https://mizan-app.onrender.com/api/auth/github/callback
```

## 4. Tekshirish

1. Manzilni oching, sayt chiqishi kerak.
2. `/#/kirish` sahifasida Google tugmasini bosing: Google hisob tanlash oynasi chiqib, keyin saytga qaytarishi kerak.
3. Agar Google «Access blocked» desa, bu deyarli har doim `redirect_uri` mos kelmagani: 3-qadamdagi manzilni harfma-harf solishtiring va `PUBLIC_URL` to'g'ri yozilganini tekshiring.

## Bilib qo'yish kerak bo'lgan cheklovlar

**Baza saqlanmaydi.** Bepul tarifda Render diskni saqlamaydi. Har bir yangi joylashda yoki server qayta yoqilganda ro'yxatdan o'tgan hisoblar va yozuvlar yo'qoladi. Namoyish uchun yetarli, lekin haqiqiy foydalanuvchilar uchun emas. Saqlash uchun `render.yaml` dagi izohga qarang: tarifni `starter` ga ko'tarib, disk qo'shish kerak.

**Birinchi ochilish sekin.** Bepul xizmat 15 daqiqa tinch tursa uxlaydi, keyingi tashrifda uyg'onishi 30–60 soniya oladi. Hakamlar oldida namoyishdan oldin saytni ochib qo'ying, toki uyg'oq bo'lsin.

**Telegram bot.** `BOT_TOKEN` ni Render'ga ham yozsangiz, bot ikki joyda (kompyuteringizda va Render'da) bir vaqtda ishlaydi va to'qnashadi. Faqat bitta joyda qoldiring.

## Keyingi joylashlar

GitHub'ning `main` shoxiga har bir `git push` Render'da avtomatik yangi joylashni boshlaydi. Alohida hech narsa qilish shart emas.
