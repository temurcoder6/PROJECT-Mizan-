# Mizan

Chiroqchi IT & English Talent Selection 2026 uchun loyiha: «Pulim qayerga ketyapti?» — kunlik sarflash rejasi, tez kiritish, qarz daftari, jamg'arma maqsadlari va yordamchi.

| Papka | Nima |
|---|---|
| `frontend/` | Asosiy ilova (React + Tailwind CSS). Batafsil: `frontend/README.md` |
| `backend/` | Hisoblar va SQLite ma'lumotlar bazasi serveri (Node.js 24+). Batafsil: `backend/README.md` |
| `frontend/Mizan.html` | Ilovaning yagona faylli nusxasi: brauzerda ochish kifoya, server kerak emas |
| `backend/bot.mjs` | Telegram bot: server bilan birga ishlaydi, saytdagi hisob va baza bilan bitta (`backend/README.md`) |
| `backend/eski-python-bot/` | Eski Python bot (alohida bazada), endi kerak emas |
| `docs/taqdimot/` | Taqdimot qo'llanmasi va video ssenariy |
| `frontend/eski/pulim-site/`, `frontend/eski/pulim-demo/` | Dastlabki oddiy prototiplar |
| `boshqa-loyihalar/xavfsiz-hudud/` | Boshqa mavzu bo'yicha dastlabki urinish (loyihaga aloqasi yo'q) |

## Tez boshlash

```powershell
cd frontend
npm install
npm run build
cd ..\backend
npm start
```

So'ng `http://localhost:8787` ni oching. Server kerak bo'lmasa, `frontend/Mizan.html` ni brauzerda oching.

Maxfiy kalit va tokenlar repoda yo'q: bot tokeni `backend/.env` da turadi (`.env.example` dan nusxalang) va git'ga kirmaydi.

