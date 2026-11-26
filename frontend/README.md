# Mizan — pul rejangiz

Kunlik sarflash rejasi, tez kiritish, qarz daftari, jamg'arma maqsadlari va yordamchi bitta ilovada. React + Tailwind CSS (Vite). Server (`../backend`) bo'lsa hisob va SQLite bazasi bilan, bo'lmasa faqat qurilmada ishlaydi.

## Ishga tushirish (uch usul)

**1. Eng oddiy: ikki marta bosib ochish.** `Mizan.html` ni brauzerda oching. Server kerak emas, ma'lumot shu brauzerda saqlanadi. (Hisob/sinxronlash va telefonga o'rnatish bu usulda yo'q.)

**2. Serverli (haqiqiy baza bilan):**

```powershell
cd frontend
npm install
npm run build
cd ..\backend
npm start
```

`http://localhost:8787` ni oching. Batafsil: `../backend/README.md`.

**3. Dasturlash rejimi:** bir oynada `npm start` (backend), ikkinchisida `npm run dev` (shu papka), `http://localhost:5173` ni oching. `/api` so'rovlari avtomatik serverga yo'naltiriladi.

Yagona fayl qayta yig'ish: `npm run build:single` (natija `dist-single/index.html`, uni `Mizan.html` ga nusxalang).

## Sayt (ko'p sahifali)

Ilova ochilganda ko'rinadigan umumiy sayt oltita sahifadan iborat: Bosh sahifa (`#/`), Xarajatlar (`#/xarajatlar`), Qarzlar (`#/qarzlar`), Maqsadlar (`#/maqsadlar`), Yordamchi (`#/yordamchi`), Xavfsizlik va ochiq holat (`#/xavfsizlik`). Har sahifadagi telefon ichida rasm emas, **haqiqiy ilova** ishlaydi (`?demo=1` rejimi): namuna ma'lumot bilan, saytning va sizning haqiqiy ma'lumotingizdan alohida xotirada. Bosib ko'rish mumkin, server so'ralmaydi.

## Hozir nima ishlaydi

Brauzerda va server bilan sinab ko'rilgan:

| Qism | Holat |
|---|---|
| **Kunlik reja** «Bugun qancha sarflasam bo'ladi?»: hozirgi pul, daromad sanasi, zarur to'lovlar (bir martalik va oylik), qarz muddati, jamg'arma ajratmasi. Hisobi ekranda ko'rinadi; natija kiritilgan ma'lumotga bog'liq va kafolatlangan mablag' emas deb yoziladi. Ma'lumot yetmasa raqam chiqarmaydi, so'raydi. Pul yetmasa «yetishmaydi» deydi | Ishlaydi |
| **Tez kiritish**: summa yozib, toifani bosish bilan saqlash; yaqinda ishlatilgan toifalar; yozilganini bir bosishda takrorlash; «bekor qilish»; nom va izoh shart emas | Ishlaydi |
| **Unutilgan kun**: kalendar, kun uchun umumiy summa, «bu kuni xarajat bo'lmadi» belgisi | Ishlaydi |
| Daromad/xarajat: qo'shish, tahrirlash, o'chirish; toifa, sana, to'lov usuli; hafta/oy hisoboti; rejalangan va kutilmagan | Ishlaydi |
| Haftalik jamlanma (faqat yetarli ma'lumot bo'lsa), odat tuzog'i | Ishlaydi, formulasi ko'rsatilgan |
| **Bugungi maslahat** (bosh sahifada va yordamchida: «Qayerda kamaytirsam bo'ladi?»): bugungi reja oshgan bo'lsa ertangi reja qanchaga tushishi; oxirgi 7 kunda eng ko'p ketgan ixtiyoriy toifa va uni kamaytirsa qancha qolishi; takrorlanadigan odat. Har bir raqam formulasi bilan, faqat yozuvlaringizdan; ma'lumot kam bo'lsa maslahat bermaydi. Ovoz chiqarib o'qish mumkin (qurilmada ovoz bo'lsa) | Ishlaydi |
| **Jamg'arma o'yini** (Maqsadlar): halqa, 25/50/75/100% bosqichlari, daraja nomi, ketma-ket haftalar (haftalik reja bajarilgan haftalar). Yozmagan kunlar maqsadga va ketma-ketlikka zarar bermaydi | Ishlaydi |
| **Qarzni oldindan rejalash**: muddatgacha teng haftalik to'lov jadvali (har bir qarz kartasida), shu hafta ajratish kerak summa. **Davriy to'lovlar**: har oy, har hafta yoki bir martalik; keyingi 30 kun, oylik yuk (haftalik × 52 ÷ 12), kunlik rejadan ajratish | Ishlaydi |
| Qarz daftari: qisman qaytarish, qoldiq, muddat, ilova ichidagi eslatma | Ishlaydi |
| Maqsadlar: haftalik/oylik formula, «agar sarflasam-chi?», keyingi kichik qadam. Yozilmagan kunlar maqsad hisobiga ta'sir qilmaydi | Ishlaydi |
| Yordamchi (o'zbek lotin/kirill, rus, ingliz): yozuv tayyorlaydi, tasdiqdan keyin saqlaydi; «50 ming sarflasam, telefon rejam nima bo'ladi?» kabi savollarga hisob bilan javob beradi | Ishlaydi, qoidalarga asoslangan |
| **Hisob va SQLite baza** (backend bilan): ro'yxatdan o'tish, serverda saqlash, boshqa qurilmadan ochish, ziddiyatni hal qilish, hisobni o'chirish | Ishlaydi, 20 ta avtomatik tekshiruv + brauzerda sinalgan |
| Shubhali xabarni tushuntirish, JSON/CSV yuklab olish, tiklash, hammasini o'chirish | Ishlaydi |

## Qurilma va brauzerga bog'liq

- **Ovozli kiritish:** Chrome/Edge nutqni tanish xizmati. O'zbek tilida ba'zan xato qiladi, shuning uchun summa har doim tasdiq kartasida ko'rinadi. Mikrofon uchun rozilik so'raladi, ovoz saqlanmaydi.
- **Javobni ovoz chiqarib o'qish:** qurilmada shu til uchun ovoz o'rnatilgan bo'lsa.
- **Kunlik eslatma:** faqat ilova/brauzer ochiq bo'lganda bildirishnoma beradi (kuniga bir marta, ayblamasdan). Yopiq telefonga push kelmaydi.
- **PWA (bosh ekranga qo'shish):** `https` manzilda ishlaydi, haqiqiy telefonda hali sinalmagan.

## O'zbekcha ovoz: hozirgi holat va kuchaytirish yo'li

Hozir ovozni brauzerning o'z xizmati matnga aylantiradi (Chrome/Edge). Uning o'zbek tilidagi sifati qurilmaga bog'liq va **kuchli deb kafolatlab bo'lmaydi**. Shuning uchun har bir ovozli yozuv tasdiq kartasida summa bilan ko'rsatiladi va tasdiqsiz saqlanmaydi.

Kuchli o'zbekcha ovoz uchun server tomonida alohida nutqni tanish xizmati kerak, uning kaliti faqat serverda turadi (brauzerga yozilmaydi) va u pullik/hisob talab qiladi. Qidiruvda quyidagilar uchraydi, lekin sifati va narxini **tekshirmadim**: ElevenLabs va AssemblyAI (o'zbek tilini e'lon qilgan), mahalliy Muxlisa (yangilangan o'zbek modeli haqida xabar bor), Yandex SpeechKit (o'zbek tilini qo'shgan). Azure uchun o'zbekcha neyron ovoz borligi tasdiqlanmadi, Google Cloud haqida ham aniq ma'lumot topmadim. Tanlashdan oldin 20–30 ta haqiqiy o'zbekcha jumla bilan sinab ko'ring.

Ulash tartibi: brauzer mikrofon yozuvini serverga yuboradi → server tanlangan xizmatga jo'natadi → matn tasdiq kartasiga tushadi. Yozuv saqlanmaydi.

## Hali ishlamaydi (keyingi bosqich)

- Server tomonidagi kuchli o'zbekcha nutqni tanish va ovoz chiqarish (yuqoriga qarang; xizmat tanlanib, kalit olinishi kerak).

- Yopiq telefonga push eslatma (server bildirishnomasi).
- Telegram bot bilan umumiy baza. `..\backend/eski-python-bot` hozir alohida bazada ishlaydi va faqat xarajat kiritish/hisobot beradi.
- Katta til modeli (AI). Maxfiy kalit brauzerga yozilmaydi, faqat serverda bo'ladi.
- Parolni tiklash, PostgreSQL, oilaviy maqsad, PDF hisobot, Android ilova.
- Click, Payme yoki bankka ulanish. Mizan hech qanday ulanishni ko'rsatmaydi: bank ma'lumoti yo'q, hozirgi pulni foydalanuvchi o'zi kiritadi.

## Kunlik reja formulasi

```
erkin pul = hozirgi pul
          − daromad sanasigacha zarur to'lovlar
          − shu sanagacha muddati keladigan qarzlar (men qaytaradigan)
          − jamg'arma ajratmasi (maqsadning kunlik summasi × kunlar)
kunlik reja = erkin pul ÷ daromad sanasigacha kunlar
```

«Hozirgi pul» foydalanuvchi aytgan summa, uni kiritgandan keyingi yozuvlar (xarajat, daromad, qarz harakati, maqsadga qo'shilgan pul) avtomatik hisobga olinadi. Oldingi sanali yozuv keyin qo'shilsa, ikki marta ayirilmaydi. Yozilmagan xarajatlar hisobga olinmaydi, shuning uchun haftada bir «Pulni yangilash» tavsiya etiladi. Sizga qaytariladigan pullar va muddatsiz qarzlar rejaga kirmaydi.

## Raqobatchilar

Click va Payme imkoniyatlarini rasmiy manbalardan **tekshirmadim**, shuning uchun «ularda bu funksiya yo'q» deb yozmayman. Mizan'ning farqi sifatida faqat uyg'unlikni aytish mumkin: qarz daftari, maqsadli jamg'arma, xarajatning maqsadga ta'siri, kunlik reja va yordamchi bir joyda. Banklar Mizan bilan hamkor bo'ladi yoki to'laydi degan dalil yo'q. Taqdimotdan oldin ularning rasmiy ilovalarini o'zingiz ko'rib chiqing.

## Tuzilma

```
src/lib/finance.js, plan.js, insights.js   hisob-kitob formulalari
src/lib/assistant/                         yordamchi (til, summa, javoblar)
src/lib/scam.js, voice.js, api.js          shubhali xabar, ovoz, server so'rovlari
src/store.jsx                              ombor va server sinxronlashi
src/components/, src/pages/                interfeys
public/                                    manifest, service worker, ikonlar
```

