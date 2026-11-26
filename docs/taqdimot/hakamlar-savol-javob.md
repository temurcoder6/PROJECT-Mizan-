# Mizan: hakamlar savollari va halol javoblar

Qoida: faqat haqiqatan bor narsani «bor» deb ayting. Bilmagan narsangizni «tekshirmaganman» deng. Bitta yolg'on hamma javobingizga ishonchni buzadi.

## Hozirgi holat (bir qarashda)

| Nima | Holat |
|---|---|
| Sayt va ilova (xarajat, daromad, qarz, maqsad, kunlik reja, hisobot) | Ishlaydi, brauzerda sinalgan |
| Server va ma'lumotlar bazasi (SQLite, 13 jadval, hisoblar) | Ishlaydi, 82 ta avtomatik test o'tgan |
| Telegram bot (@mizan_uzbot), sayt bilan bitta baza | Ishlaydi: ulash, tasdiq bilan yozuv, `/reja`, eslatma |
| Internetdan ochiq havola | Vaqtincha (kompyuter yoqiq bo'lsa), manzili har safar o'zgaradi |
| Ovozli kiritish | Brauzerga bog'liq, o'zbekcha ba'zan xato qiladi |
| Haqiqiy foydalanuvchilar | Hali yo'q (sinov natijasi bo'lmasa, «tekshirmaganman» deng) |
| Daromad | Hali yo'q, faqat faraz |

## 1. Mahsulot haqida

**Bu demo-mi, haqiqiy mahsulotmi?**
Haqiqiy. Hisob ochasiz, yozuvlar serverdagi SQLite bazaga yoziladi, boshqa qurilmadan ochsangiz o'sha ma'lumot chiqadi, Telegram botda yozganingiz saytda ham ko'rinadi. Saytdagi telefon va noutbuk ichidagi *namuna ma'lumot* faqat tasviriy: u alohida xotirada ishlaydi va haqiqiy bazaga tegmaydi.

**Click, Payme va bank ilovalarida allaqachon xarajat tahlili bor-ku?**
Ularni rasmiy manbadan tekshirmaganman, shuning uchun «ularda yo'q» deb aytmayman. Men bilganim: ular o'z kartangiz to'lovlarini ko'radi. Mizan'da siz naqd pulni ham, kartani ham bir joyga yozasiz, va asosiy farqi: «bugun qancha sarflasam bo'ladi?» savoliga qo'lingizdagi pul, daromad sanasi, to'lovlar, qarz va jamg'armadan formula bilan javob beradi.

**Nega bankka ulanmadingiz?**
Men bilishimcha, hozircha ochiq bank API'si yo'q (bunga ishonchim to'liq emas, tekshirmaganman), va bankdan ma'lumot olish uchun litsenziya va xavfsizlik talablari bor. Bu bir odamlik loyiha uchun ham juda xavfli. Shuning uchun foydalanuvchi o'zi kiritadi, buning ustiga hech qanday bank paroli yoki karta ma'lumoti bizda bo'lmaydi.

**Odamlar har kuni yozishdan erinsa-chi?**
Eng katta xavf shu. Shuning uchun: xarajat ikki bosish (summa + toifa), unutilgan kunni keyin bir summa bilan to'ldirish, yozmagan kun maqsadga zarar qilmaydi, Telegramda «non 5000» yozish, kunlik yumshoq eslatma. Bu yechimlar ishlayaptimi, buni hali haqiqiy odamlarda o'lchaganim yo'q.

**Kunlik reja qanchalik aniq?**
Hisobi aniq formula: (hozirgi pul − to'lovlar − qarz muddatlari − jamg'arma ajratmasi) ÷ daromadgacha kunlar. Ekranda «Hisob qanday chiqdi» ko'rinadi. Natija siz kiritgan ma'lumotga bog'liq: yozilmagan xarajat hisobga kirmaydi, shuning uchun u kafolatlangan mablag' emas.

**AI qayerda?**
Hozir katta til modeli yo'q. Yordamchi qoidalarga asoslangan: summa, sana, toifa va til aniqlaydi, hisobni dastur qiladi. Hamma yozuvni siz tasdiqlaysiz. AI bashorat yoki «aqlli moliyaviy menejer» deb aytmayman, chunki bu hali yo'q.

**Ovozli kiritish aniqmi?**
Brauzerning o'z nutqni tanishiga bog'liq (Chrome, Edge). O'zbek tilida ba'zan xato qiladi, shuning uchun har gal tasdiq kartasi chiqadi va summani ko'rasiz. Kuchli o'zbekcha ovoz uchun serverda alohida xizmat kerak, uni hali tanlamaganman va sinamaganman.

## 2. Ma'lumotlar va xavfsizlik

**Ma'lumot qayerda saqlanadi?**
Hisob ochmasangiz, faqat o'zingizning brauzeringizda. Hisob ochsangiz, serverdagi SQLite bazada. Hozir server mening kompyuterimda (vaqtincha internetga ochiq). Doimiy ishlashi uchun keyin arzon serverga ko'chiriladi.

**Parol qanday saqlanadi? Hack bo'lsa-chi?**
Parol oddiy matn emas, `scrypt` bilan tuzlangan xesh. Sessiya tokeni ham faqat xesh sifatida. Xato urinishlar chegaralangan. Men saytni o'zim hujumga qarshi tekshirdim va 11 ta zaif joyni topib tuzatdim (yo'l hujumi, tarmoqqa ochiqlik, API keshi, so'rov hajmi, oson parollar va boshqalar), 12 ta xavfsizlik testi bor. «100% xavfsiz» deb aytmayman, bu mumkin emas. Mustaqil audit o'tkazilmagan.

**Nega faqat foydalanuvchi nomi va parol? Pochta yoki pasport nega yo'q?**
Ataylab: byudjet ilovasiga pochta, telefon yoki hujjat kerak emas, kerak bo'lmagan shaxsiy ma'lumotni yig'maymiz. Pasportni hech qachon so'ramaymiz. Parolni unutsangiz, ro'yxatdan o'tganda berilgan bir martalik tiklash kodi bilan tiklaysiz. Pochta yoki Google bilan kirish keyingi bosqichda ixtiyoriy bo'ladi.

**Ma'lumotimni sotasizmi?**
Yo'q, va sotmoqchi emasman. Foydalanuvchi ma'lumotini banklarga sotish ishonchni ham buzadi, qonuniy xavfi ham bor. Daromad boshqa yo'ldan bo'lishi kerak.

**Foydalanuvchi ma'lumotini o'chira oladimi?**
Ha. Sozlamalarda yuklab olish (JSON, CSV) va hisobni butunlay o'chirish bor; o'chirsa, uning hamma yozuvi, murojaati va Telegram ulanishi ham o'chadi.

## 3. Biznes

**Qanday daromad olasiz?**
Hozir daromad yo'q, hammasi faraz. Reja: asosiy funksiyalar bepul, pullik qism (oila byudjeti, chuqur hisobot, PDF) taxminan 10–20 ming so'm/oy. Bu narxlar sinalmagan faraz. Foydalanuvchilar to'laydimi, buni hali bilmayman va tekshirishim kerak.

**Hamkorlik yoki affiliate-chi?**
Hozir yo'q. Haqiqiy hamkor bo'lmasa, soxta taklif ko'rsatmayman. Kelajakda bo'lsa, aniq «Reklama» deb belgilangan bo'lim bo'ladi va u foydalanuvchining shaxsiy ma'lumotiga bog'lanmaydi.

**Qancha xarajat ketadi?**
Hozir deyarli nol: kod mening kompyuterimda. Doimiy ishlashi uchun oyiga taxminan 5–10 dollar (server) va domen (yiliga ~10–15 dollar). Bu yuzaki baho, aniq narxni tekshirmaganman. Telegram bot va `https` sertifikati bepul.

**Nechta foydalanuvchiga chidaydi?**
SQLite bitta serverda minglab foydalanuvchiga yetadi. Yuz minglab bo'lganda PostgreSQL'ga o'tish kerak; jadvallar shunga mos tuzilgan. Bu o'lchovni yuk bilan sinab ko'rmaganman.

**Nega aynan Chiroqchi uchun?**
Kategoriyalar mahalliy (bozor, to'y va mehmon, kommunal), o'zbek tili birinchi o'rinda, naqd pul ko'p ishlatilishi sababli «naqd + karta bir joyda» muhim. Ammo Chiroqchida muammo qanchalik keng ekanini so'rov bilan tekshirmaganman.

## 4. Texnik

**Nima bilan yozilgan?**
Faqat JavaScript: React + Vite + Tailwind (ilova), Node.js va SQLite (server, tashqi framework yo'q), Telegram Bot API. Taxminan 8 000 qator kod, 400 qator test.

**Kodni kim yozdi? O'zingizmi?**
Halol javob bering: kodni Claude (Anthropic'ning AI yordamchisi) bilan birga, men maqsadni, mahsulotni va qarorlarni belgiladim, tekshirdim va sinadim. Hakam so'rasa, yashirmang.

**Telegram botda nima qiladi?**
«non 5000» yozasiz, bot yozuvni tayyorlaydi, siz «Saqlash» ni bosasiz. `/reja` bugungi rejani hisobi bilan beradi. `/eslatma 21:00` kunlik eslatmani yoqadi, u telefon yopiq bo'lsa ham keladi. Bot sayt bilan bitta hisob va bazani ishlatadi.

## Hakamlar uchun «qiyin» savollarga qisqa javoblar

- **«Nega bu startap bo'lishi kerak?»** Muammo oddiy va hamma uchun: pul qayerga ketdi. Farq: kunlik reja, naqd bilan karta bir joyda, maqsad va qarz bir hisobda, Telegram.
- **«Sizda nima yo'q?»** Haqiqiy foydalanuvchilar, daromad, bank ulanishi, kuchli o'zbekcha ovoz, doimiy server. Hammasini ochiq aytaman va keyingi qadam sifatida ko'rsataman.
- **«Birinchi 100 foydalanuvchini qanday topasiz?»** Telegram bot orqali: tanishlar, oila, mahalliy guruhlar. Birinchi qadam: 10 kishiga berib, 2 kun yozishni kuzatish va nima to'xtatganini so'rash.

## G'oyalar (keyingi bosqich, tartib bilan)

| G'oya | Qiyinlik | Eslatma |
|---|---|---|
| 10 kishi bilan haqiqiy sinov, natijani slaydga qo'yish | Oson | Eng muhim: hakamlar uchun dalil |
| Doimiy server + domen (`mizan.uz`) | O'rtacha | Pul va hisob kerak |
| Pochta yoki Google orqali kirish (ixtiyoriy) | O'rtacha | Google kaliti kerak |
| Bank SMS matnini **o'zingiz** qo'yib, yozuvga aylantirish | O'rtacha | SMS'larni yashirincha o'qimaymiz, foydalanuvchi o'zi qo'yadi |
| Haftalik hisobotni Telegramga yuborish | Oson | Bot bor, ma'lumot bor |
| PDF oylik hisobot | Oson | Pullik tarif uchun |
| Oilaviy umumiy maqsad | Qiyin | Hisob va ruxsat tuzilmasi kerak |
| Kuchli o'zbekcha ovoz (server tomonida) | O'rtacha | Xizmat tanlash va kalit kerak, avval sifatini sinash |
| Android ilova (PWA'dan) | O'rtacha | `https` kerak |
| Katta til modeli yordamchisi | Qiyin | Faqat serverda, kalit brauzerga yozilmaydi |
