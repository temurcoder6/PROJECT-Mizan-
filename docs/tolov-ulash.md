# Haqiqiy to'lovni ulash (Mizan Pro)

Hozir saytda **haqiqiy to'lov yo'q**: Payme, Click va Uzum Pay bilan savdogar shartnomasi tuzilmagan. Quyida nima tayyor, nima qilish kerakligi yozilgan.

## Qoidalar (o'zgartirilmaydi)

- Sayt **hech qachon** karta raqami, amal qilish muddati, CVV yoki PIN so'ramaydi va saqlamaydi. `/api/pro/checkout` bunday maydonlar kelsa so'rovni rad etadi (`findForbiddenCardKey`).
- Pro muddatini (`users.pro_until`) **faqat server** o'zgartiradi: provayder webhooki, admin yoki sinov/referal. Brauzerdagi hech narsa Pro bera olmaydi.
- To'lov provayderning o'z sahifasida (hosted checkout) bajariladi, foydalanuvchi o'sha yerga yo'naltiriladi.

## Hozir tayyor bo'lgan qism

| Qism | Holati |
|---|---|
| `users.pro_until` (ISO sana, `NULL` = bepul), `isPro = pro_until > hozir` | tayyor |
| `GET /api/me` → `isPro`, `proUntil` | tayyor |
| `GET /api/pro/options` (tariflar, qaysi usul yoqilgan) | tayyor |
| `POST /api/pro/checkout {plan, provider}` → `pro_orders` ga `pending` buyurtma yozadi va provayder sahifasiga URL qaytaradi | tayyor |
| `extendPro(userId, days)` (`server.mjs`): mavjud muddat ustiga qo'shadi | tayyor, webhook shuni chaqiradi |
| Provayder webhooki (to'lov tasdig'i) | **YO'Q**: pastdagi 3-qadam |

Tariflar `PRO_PLANS` (`server.mjs`): `monthly` 19 000 so'm / 30 kun, `yearly` 149 000 so'm / 365 kun.

## Foydalanuvchi (loyiha egasi) nima qilishi kerak

1. **Savdogar shartnomasi.** Har bir usul uchun alohida ro'yxatdan o'ting va merchant hisobi oling:
   - Payme: <https://business.payme.uz> (Payme Business, Merchant API)
   - Click: <https://merchant.click.uz> (Click Merchant, SHOP-API)
   - Uzum Pay (Uzum Bank): Uzum Business orqali murojaat qiling
   Shartnoma uchun odatda YaTT/MChJ va bank hisob raqami kerak bo'ladi. Shartnomasiz haqiqiy pul qabul qilib bo'lmaydi.
2. **Server sozlamasi.** Provayder bergan to'lov sahifasi manzilini `backend/.env` ga qo'ying (faqat `https://`):

   ```
   PAYMENT_PROVIDER_URL_PAYME=https://checkout.paycom.uz/...
   PAYMENT_PROVIDER_URL_CLICK=https://my.click.uz/services/pay
   PAYMENT_PROVIDER_URL_UZUM=https://...
   ```

   Qiymat qo'yilgan usulning tugmasi Pro oynasida avtomatik yonadi. Bo'sh bo'lsa «Tez orada (shartnoma jarayonida)» deb o'chiq turadi.
   Hozir server manzilga `order_id`, `plan`, `amount` so'rov parametrlarini qo'shadi. Provayder o'z formatini talab qilsa (masalan Payme `m=...;ac.order_id=...;a=<tiyin>` ni base64 qiladi), shuni `POST /api/pro/checkout` ichida provayder hujjatiga moslab o'zgartiring.
3. **Webhook (to'lov tasdig'i).** Shartnomadan keyin yozing. Umumiy shakli:

   - Alohida marshrut, masalan `POST /api/pay/payme`, `POST /api/pay/click`, `POST /api/pay/uzum`. Bular `requireUser` orqali emas, **imzo** orqali himoyalanadi (foydalanuvchi cookie'si yo'q, so'rovni provayder yuboradi). `checkOrigin` va JSON tekshiruvidan o'tkazib yuboriladi, `globalLimit` esa qoladi.
   - **Imzoni tekshiring** (tekshirilmasa, istalgan kishi o'ziga Pro berib yuboradi):
     - Payme: `Authorization: Basic base64("Paycom:<KEY>")` sarlavhasini doimiy vaqtda (`crypto.timingSafeEqual`) solishtiring. JSON-RPC metodlari: `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction`, `GetStatement`.
     - Click: `sign_string` = `md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)`; `Prepare` (action=0) va `Complete` (action=1) ikki bosqich.
     - Uzum: provayder hujjatidagi imzo yoki token sxemasi.
   - **Summani tekshiring**: provayder yuborgan summa `pro_orders.amount` bilan tiyin/so'm hisobida bir xil bo'lsin. Boshqacha bo'lsa rad eting.
   - **Takrorlanishga chidamli (idempotent) bo'ling**: provayderlar bitta tasdiqni bir necha marta yuborishi mumkin. `pro_orders.status` `pending` → `paid` o'zgarishini **bitta tranzaksiyada** bajaring: `UPDATE pro_orders SET status='paid' WHERE id=? AND status='pending'` va `changes === 1` bo'lsagina `extendPro(order.user_id, PRO_PLANS[order.plan].days)` chaqiring.
   - Bekor qilish/qaytarish (`Cancel`) kelsa `status='refunded'` qiling; kerak bo'lsa `pro_until` ni qisqartiring.
   - Provayder tranzaksiya raqamini `pro_orders` ga alohida ustun sifatida qo'shing (yangi migratsiya: `MIGRATIONS` ro'yxati oxiriga; eskisini o'zgartirmang) va uni `UNIQUE` qiling.
4. **Sinov.** Provayderning test (sandbox) rejimida to'liq aylanib chiqing: to'lov → webhook → `GET /api/me` da `isPro: true`. Faqat shundan keyin haqiqiy kalitlarga o'ting.
5. **Hujjatlar.** Foydalanuvchi shartlari, qaytarish siyosati va soliq hisobi (chek) talablarini yuridik jihatdan hal qiling. Bu kod bilan hal bo'lmaydi.

## Sinov rejimi (`DEMO_PAYMENTS=1`)

`backend/.env` da `DEMO_PAYMENTS=1` bo'lsa Pro oynasida «Sinov rejimi: to'lovsiz 7 kunlik Pro» tugmasi chiqadi. U **pul yechmaydi**, `POST /api/pro/demo` orqali serverda `pro_until` ni 7 kunga qo'yadi (har hisobga bir marta; soatiga 5 urinish). Env qo'yilmasa endpoint `404` qaytaradi. Haqiqiy ishga tushirishda bu o'zgaruvchini **olib tashlang**.

Hakamlarga Pro berish uchun sinov tugmasi o'rniga admin paneldagi «Pro +30 kun» tugmasidan foydalanish xavfsizroq.

## Referal sozlamalari (ixtiyoriy env)

| O'zgaruvchi | Standart | Ma'nosi |
|---|---|---|
| `REFERRAL_BONUS_DAYS` | 30 | Har ikki tomonga beriladigan kun |
| `REFERRAL_MONTHLY_MAX` | 12 | Bir foydalanuvchi uchun 30 kunda eng ko'pi bilan mukofot |
| `REFERRAL_IP_DAILY` | 3 | Bir IP dan sutkada eng ko'pi bilan bonus |
| `REFERRAL_NEW_ACCOUNT_HOURS` | 48 | Hisob shu soatdan yosh bo'lsagina bonus oladi |

Tunnel yoki reverse proxy orqasida bo'lsa `TRUST_PROXY=1` qo'ying, aks holda hamma foydalanuvchi bitta IP deb hisoblanadi va IP chegarasi hammaga birdan tegadi.
