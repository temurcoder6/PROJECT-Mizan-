# Xavfsiz hudud — Telegram bot

## 1. Bot yaratish (BotFather)
1. Telegram da **@BotFather** ni oching.
2. `/newbot` yozing, bot nomini va username ni (`...bot` bilan tugasin) kiriting.
3. Berilgan **token** ni nusxalang.

## 2. Telegram ID (ixtiyoriy, demo uchun)
1. **@userinfobot** ga `/start` yozing. U sizning ID ingizni beradi.

## 3. Sozlash (PowerShell)

```powershell
cd boshqa-loyihalar/xavfsiz-hudud/bot
py -m pip install -r requirements.txt
copy .env.example .env
notepad .env
```

`.env` faylida `BOT_TOKEN=` va `ADMIN_ID=` ni to'ldiring, saqlang.

## 4. Ishga tushirish

```powershell
py bot.py
```

"Bot ishga tushdi" yozuvi chiqsa, Telegramda botingizga o'ting.

## 5. Ishlatish
- `/start` — yordam
- `/hudud chiroqchi` — hududga obuna
- `/check` — hozirgi xavf holati
- `/sinov` — (faqat ADMIN_ID) barcha obunachilarga hozirgi holatni yuboradi, demo uchun
- `/stop` — obunani bekor qilish

Avtomatik tekshiruv har soatda bo'ladi. Xavf o'rtacha yoki yuqori bo'lib o'zgarsa, obunachiga xabar boradi.

## Muhim eslatmalar
- Ob-havo ma'lumoti: Open-Meteo (kalit kerak emas).
- Xavf chegaralari va hudud koordinatalari taxminiy. Haqiqiy ishga tushirishdan oldin mutaxassislardan tasdiqlang.
- Bot tokeni `.env` da. Uni GitHub yoki taqdimotga qo'ymang.
- Bot kompyuter yoqilib turganda ishlaydi. Doimiy ishlash uchun serverga (Render, Railway) joylash kerak.
