# Pulim qayerga ketyapti? — Telegram bot

## 1. Bot yaratish
1. Telegram da **@BotFather** ga `/newbot` yozing, nom va username bering.
2. Berilgan **token** ni nusxalang.

## 2. Sozlash (PowerShell)
```powershell
cd backend/eski-python-bot
py -m pip install -r requirements.txt
copy .env.example .env
notepad .env
```
`.env` da `BOT_TOKEN=` ga tokenni yozing, saqlang.

## 3. Ishga tushirish
```powershell
py bot.py
```
"ishga tushdi" yozuvi chiqsa, botingizga Telegramda `/start` yozing.

## 4. Ishlatish
- `non 5000` — xarajat qo'shadi (kategoriya avtomatik aniqlanadi)
- `/hisobot` — shu oy kategoriyalar bo'yicha
- `/tavsiya` — eng ko'p ketgan toifa va tejash
- `/maqsad telefon 1000000 60` — maqsad va kunlik tejash
- `/maqsad` — maqsad holati
- `/ochir` — oxirgi xarajatni o'chirish

Ma'lumot `pulim.db` faylida saqlanadi. Bot kompyuter yoqilgan paytda ishlaydi.
