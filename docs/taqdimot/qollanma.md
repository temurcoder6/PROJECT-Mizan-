# "Pulim qayerga ketyapti?" — Taqdimot qo'llanmasi

**Mavzu:** 13. Kundalik xarajatlarni tahlil qilib, ortiqcha sarflarni aniqlaydigan va tejash rejasini tuzadigan dastur.
**Hudud:** Qashqadaryo, Chiroqchi tumani.
**Vaqt:** 10 daqiqa (taxminan 5 daqiqa nutq, 5 daqiqa savol-javob va demo).

> **Qoida:** taqdimotda faqat haqiqatda bajarilgan narsani "bor" deb ayting. Qolgani "rejada" deb ayting. Hakamlar buni sezadi, va bitta yolg'on butun loyihani zaiflashtiradi.

---

## 1. Holat: nima bor, nima yo'q

| Qism | Holat | Taqdimotda qanday ayting |
|---|---|---|
| Veb-sahifa (xarajat, kategoriya, maqsad, tavsiya) | Tayyor (shu qurilmada saqlaydi) | "Ishlaydigan prototip" |
| Telegram bot (xarajat kiritish, hisobot) | Kod tayyor, tokeni hali yo'q | "Bot tayyor, ishga tushirish bosqichida" |
| Telefonga o'rnatish (PWA) | Tayyor, sinalmagan | "Telefonga o'rnatish imkoniyati bor" |
| Serverda ma'lumot, login, sinxronlash | Yo'q | "Keyingi bosqich" |
| AI (ovoz, tabiiy til tushunish) | Yo'q | "Rejada: ovozli kiritish" |
| Haqiqiy foydalanuvchilar sinovi | Hali yo'q | "Shanba kuni 10 kishi bilan sinov o'tkazamiz" (sinovdan keyin natijani ayting) |

---

## 2. Muammo

**Asosiy savol:** oy oxirida pul qayerga ketganini bilmaymiz.

**Chiroqchi uchun aniq holat:**
- Kundalik mayda xarajatlar (non, choy, taksi, bozor) ko'rinmaydi. Har biri kichik, lekin oyda katta bo'ladi.
- Ko'p xarajat naqd pulda bo'ladi. Click yoki Payme ularni ko'rmaydi.
- Daftar yuritish erinchoqlik, ko'p ilova esa ingliz yoki rus tilida.

**Muammo bor-yo'qligini qanday bilamiz?** (Hakamlar so'raydi.)
Haqiqiy javob: hozircha rasmiy tadqiqot yo'q. Shanba kuni 10 ta odam bilan suhbat va sinov qiling, ularning javobini yozib oling. Shu sizning dalilingiz bo'ladi.

---

## 3. Minus taraflar va yechimlar

| Xavf | Nega xavfli | Yechim (qilingan yoki rejada) |
|---|---|---|
| **Erinchoqlik** — odamlar 3–5 kundan keyin yozishni to'xtatadi | Eng katta xavf. Ilova yaxshi bo'lsa ham, kiritish qiyin bo'lsa, hech kim ishlatmaydi | Kiritish qisqa: "non 5000" (bot va sayt). Keyingi bosqich: ovozli kiritish, kechki eslatma |
| **Bank ma'lumotlariga ulanish** — O'zbekistonda ochiq bank API yo'q | Avtomatik xarajat olish imkonsiz | Bank API ga ulanmaymiz. Foydalanuvchi o'zi kiritadi. Bu xavfsizroq va to'g'ri |
| **Raqobat** — Click, Payme, bank ilovalari bor | Hakamlar "bu allaqachon bor" deydi | Farq: naqd pulni ham kiritish, o'zbekcha va oddiy, mahalliy kategoriyalar, maqsadli tejash |
| **Maxfiylik** — odamlar pulini birov ko'rib qolishidan qo'rqadi | Ishonch bo'lmasa, hech kim kiritmaydi | Karta raqami, PIN yoki SMS-kod so'ramaymiz. Ma'lumot faqat xarajat nomi va summasi. Serverli versiyada shifrlash va faqat egasi ko'rishi |
| **To'lov qilishga tayyorlik** — odamlar obuna uchun pul to'lamasligi mumkin | Daromad bo'lmaydi | Asosiy funksiyalar bepul. Pullik qism — oila byudjeti va chuqur hisobot. Daromad modeli 4-bo'limda |
| **Texnik ishonchlilik** — sayt faqat bitta qurilmada ishlaydi | Telefon almashsa ma'lumot yo'qoladi | Hozircha buni ochiq ayting. Keyingi bosqich: server va login |
| **Noto'g'ri tavsiya** — tizim noto'g'ri maslahat berishi mumkin | Odam noto'g'ri qaror qilishi mumkin | Tavsiya faqat umumiy hisob-kitob. "Moliyaviy maslahat emas" deb yozing |

---

## 4. Daromad yo'llari

Hozircha **daromad yo'q**. Quyidagilar kelajak rejasi. Taqdimotda "farazlar" deb ayting.

1. **Pullik obuna (asosiy):** bepul — xarajat kiritish, oddiy hisobot. Pullik — oila byudjeti, eksport, chuqur tahlil. Narx taxminan 10 000–20 000 so'm/oy. To'lov: Click yoki Payme (ulanish uchun tadbirkor sifatida ro'yxatdan o'tish kerak).
2. **Kichik biznes tarifi:** do'kon, usta, taksichi uchun savdo va xarajat hisobi. Narx taxminan 30 000–50 000 so'm/oy. Bu segment keyinroq.
3. **Mahalliy hamkorlik:** do'konlar bilan kelishuv, foydalanuvchi o'zi tanlasa va reklama aniq belgilangan bo'lsa. Ehtiyotkorlik bilan.
4. **Grant va tanlov mukofotlari:** yoshlar dasturlari, startap konkurslari.

**Farazli hisob (faqat misol, haqiqat emas):**
- 1 000 faol foydalanuvchi, 10% pullik = 100 kishi.
- 100 × 15 000 so'm = **1 500 000 so'm/oy**, server va boshqa xarajatlar chiqarilmagan.

Taqdimotda aytish: "Agar 1 000 kishidan 100 tasi to'lasa, oyiga taxminan 1,5 mln so'm. Bu farazni haqiqiy sinovdan keyin tekshiramiz."

---

## 5. Foydalanuvchini qiziqtirib ushlash

Bular rejada, hozir qilinmagan. Ayting: "Shu mexanizmlarni keyingi bosqichda qo'shamiz".

- **Maqsad (eng kuchli):** odam "telefon 1 000 000 so'm" uchun tejaydi. Sayt kunlik tejash summasini ko'rsatadi. (Hozir sayt shu funksiyani qiladi.)
- **Tavsiya:** "Taksiga 300 000 sarflayapsiz. 10% tejasangiz, oyiga 30 000 qoladi." (Hozir bor.)
- **Kechki eslatma:** har kuni 21:00 da bot "bugun nimalarga pul ketdi?" deb so'raydi. (Botda qo'shish kerak.)
- **Ketma-ket kunlar (streak):** 7 kun ketma-ket yozsa, belgi. (Rejada.)
- **Ulashish:** oy oxirida "bu oy X so'm tejadim" kartochkasi. (Rejada.)

---

## 6. 10 daqiqalik nutq (taxminiy matn)

**0:00–0:30 — Tanishtirish**
"Assalomu alaykum! Har birimiz oy oxirida o'zimizga savol beramiz: pulim qayerga ketdi? Biz Chiroqchida shu savolga javob beradigan dastur yasadik — 'Pulim qayerga ketyapti?'"

**0:30–1:30 — Muammo**
"Kofe, non, taksi, bozor — har biri kichik, lekin oyda bir necha yuz ming so'm bo'ladi. Ko'p xarajat naqd pulda, shuning uchun bank ilovalari ko'rmaydi. Daftar yuritish erinchoqlik, boshqa ilovalar esa ingliz tilida."

**1:30–3:00 — Yechim**
"Biz oddiy, o'zbekcha ilova yasadik. Xarajatni bir qatorda yozasiz: 'non 5000'. Tizim kategoriyani o'zi aniqlaydi, oy oxirida qayerga ko'p ketganini ko'rsatadi, va tejash bo'yicha aniq tavsiya beradi. Bu Telegram bot va telefonga o'rnatiladigan sayt sifatida ishlaydi."

**3:00–6:00 — Jonli demo (3 daqiqa)**
1. Saytni oching. Ikki xarajat kiriting: "non 5000", "taksi 15000".
2. Kategoriya qanday avtomatik tanlanganini ko'rsating.
3. Tavsiyani o'qing.
4. Maqsad qo'shing: "telefon 1000000, 60 kun" — kunlik summa chiqadi.
5. Telegram botga "non 5000" yozing (agar bot ishga tushgan bo'lsa).

**6:00–7:30 — Daromad va keyingi qadam**
"Asosiy funksiyalar bepul. Pullik qism — oila byudjeti va chuqur hisobot. Faraz: 1 000 kishidan 100 tasi to'lasa, oyiga taxminan 1,5 mln so'm. Bu farazni haqiqiy sinovda tekshiramiz."

**7:30–8:30 — Haqiqat va cheklovlar**
"Hozir bu prototip. Serverli versiya, ovozli kiritish va AI — keyingi bosqich. Sinovni shanba kuni 10 kishi bilan o'tkazdik (sinovdan keyin haqiqiy natijani ayting)."

**8:30–10:00 — Yakun**
"Biz xarajatni yozishni oson qildik, foydalanuvchi ko'radi pulini qayerga ketayotganini, va tejash yo'lini biladi. Rahmat, savollaringiz bo'lsa marhamat."

---

## 7. Savol-javob (eng ehtimolli 10 ta savol)

**1. Click va Payme'da ham xarajat tahlili bor, sizniki nimasi farq qiladi?**
Ular faqat o'z ilovasidagi karta to'lovlarini ko'radi. Naqd pulni ko'rmaydi. Bizda naqd va karta bir joyda, va tavsiya ham beriladi.

**2. Odamlar 3 kundan keyin yozishni tashlasa-chi?**
Bu eng katta xavf. Yechim: kiritish bir qatorda, kechki eslatma va maqsad. Buni shanba kuni sinovda tekshiramiz. Natijani ko'rsatamiz.

**3. Muammo haqiqatan borligini qanday bildingiz?**
Hozircha 10 ta odam bilan suhbat va sinov. Shu natija bilan javob beramiz. (Sinovdan keyin haqiqiy raqamni ayting, o'ylab topmang.)

**4. Odamlar bu uchun pul to'laydimi?**
Hozir noma'lum. Asosiy funksiyalar bepul. Pullik qism uchun sinovda so'raymiz. Bu farazmi, tasdiqlanmagan.

**5. Ma'lumotlaringiz xavfsizmi?**
Karta, PIN yoki SMS-kod so'ramaymiz. Faqat xarajat nomi va summasi. Serverli versiyada shifrlash qo'shiladi. "100% xavfsiz" deb aytmang.

**6. Bank bilan ulanasizmi?**
Yo'q. Ochiq bank API yo'q, va biz bank xabarlarini o'qimaymiz. Foydalanuvchi o'zi kiritadi. Bu xavfsizroq.

**7. AI qayerda?**
Hozir kalit so'zlar orqali kategoriya aniqlanadi. AI (ovozli kiritish, tabiiy til) keyingi bosqich. Aniqlik o'lchanmagan, shuning uchun raqam aytmang.

**8. Qancha xarajat ketadi?**
Boshlang'ich bosqichda bepul xizmatlar (bot, hosting) yetadi. Foydalanuvchilar ko'payganda server va API xarajati paydo bo'ladi, obuna shuni qoplashi kerak.

**9. Investitsiya bersak, nimaga ishlatasiz?**
Asosan: serverli versiya va xavfsizlik, foydalanuvchi jalb qilish, va mahalliy hamkorlik. Foizlarni taxmin deb ayting.

**10. 1 yildan keyin nima?**
Chiroqchi va Qashqadaryoda haqiqiy foydalanuvchilar, keyin kichik biznes tarifi. Maqsadni taxmin sifatida ayting, va'da qilmang.

---

## 8. Shanba kunigacha qilinadigan ishlar

1. **Bot tokenini oling** (BotFather) va `backend/eski-python-bot` ni ishga tushiring.
2. **Saytni telefonda sinab ko'ring** va bitta xatoni tuzating.
3. **10 kishi bilan sinov:** o'zingiz, oila, do'stlar. 2 kun xarajat kiritsinlar.
4. **Fikr yozib oling:** nima qiyin bo'ldi, nima yoqdi, pulini tejashga yordam berdimi.
5. **Taqdimotni shu haqiqiy natijalar bilan yangilang.**
6. **Dushanba:** 3 daqiqalik demo, mashq va taymer.

---

**Eslatma:** bu qo'llanmadagi raqamlar farazlar. Haqiqiy natijani sinovdan keyin kiriting.
