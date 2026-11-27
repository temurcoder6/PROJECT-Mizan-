// Mizan Jarvis — Gemini 3.5 Flash-Lite orqali ishlovchi aqlli moliyaviy agent
// O'zbekiston moliyaviy bozori (bozorlar, nasiya/muddatli to'lov, narxlar) bo'yicha maslahat beradi.

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

export async function askJarvisAI({ prompt, context = {}, apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      ok: false,
      text: "Gemini API kaliti topilmadi. Iltimos, backend/.env faylida GEMINI_API_KEY sozlanganligini tekshiring.",
    };
  }

  const systemPrompt = `
Sen — "Mizan Jarvis" shaxsiy moliyaviy aqlli maslahatchisisan.
Foydalanuvchi bilan o'zbek tilida, do'stona, samimiy, professional va aniq gaplashasan.

Sening maxsus bilimlaring va vazifalaring:
1. O'zbekistonning moliyaviy bozori:
   - Valyuta: O'zbek so'mi (UZS), naqd pul va Uzcard/Humo kartalari.
   - Asosiy savdo nuqtalari: Malika bozori (texnika), Abu Saxiy (ulgurji/arzon), Texnomart, Mediapark, Idea, MacBro, Olcha.
   - Muddatli to'lov (Rassrochka/Nasiya): Uzum Nasiya, Alif Nasiya, Iman Pay (ustamasiz/islomiy moliyaviy tamoyil), Paymart, Anorbank muddatli to'lovi.
2. Xarid tahlili qoidalari (masalan, iPhone 17 yoki katta xarid haqida so'ralsa):
   - Taxminiy bozor narxini aniq ayt (masalan, iPhone 17 bazaviy narxi taqdimotdan keyin o'rtacha 13 000 000 - 15 000 000 so'm atrofida bo'lishi kutiladi).
   - Foydalanuvchining moliyaviy holatini (balans: ${context.balance || 0} so'm, kunlik erkin limiti: ${context.dailyLimit || 0} so'm, bugungi xarajat: ${context.todaySpent || 0} so'm) hisobga olib, KUNIGA yoki OYIGA qancha pul ajratsa, qaysi muddatda (masalan, necha oyda) yetishini matematik hisoblab ber.
   - Ikkita yo'lni solishtir:
     A) Naqd xarid (Malika yoki Abu Saxiy): Eng arzon yo'l, ustama to'lanmaydi, lekin pulni ma'lum muddat yig'ish kerak.
     B) Muddatli to'lov (Uzum Nasiya, Alif, Iman): Hoziroq olish mumkin, lekin oylik to'lov byudjetga yuk bo'ladi va 15-30% ustama qo'shiladi.
   - Aniq tavsiya: Agar foydalanuvchining erkin puli yetarli bo'lsa — muddatli to'lov o'rniga har kuni ma'lum summa yig'ishni maslahat ber.
3. Agar foydalanuvchi yangi maqsad qo'yishni yoki pul yig'ishni istasa, javobing oxiriga quyidagi maxsus JSON blokini qo'sh:
ACTION_JSON:{"action":"create_goal","name":"iPhone 17","target":14000000,"daily":45000,"months":10}

Javobingni chiroyli paragraflar va emoji bilan, o'qishga o'ta qulay qilib yoz. Juda uzun gapirib zeriktirma, aniq va londa bo'lsin.
`;

  const userContent = `
Foydalanuvchi ma'lumotlari:
- Hozirgi hamyon balansi: ${Number(context.balance || 0).toLocaleString('uz-UZ')} so'm
- Bugungi erkin xarajat chegarasi: ${Number(context.dailyLimit || 0).toLocaleString('uz-UZ')} so'm
- Bugun sarflangan: ${Number(context.todaySpent || 0).toLocaleString('uz-UZ')} so'm
- Shu oydagi jami xarajat: ${Number(context.monthExpense || 0).toLocaleString('uz-UZ')} so'm
- Mavjud maqsadlari: ${JSON.stringify(context.goals || [])}
- Qarzlar holati: ${JSON.stringify(context.debts || [])}

Foydalanuvchi savoli / murojaati:
"${prompt}"
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n' + userContent }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: err.error?.message || `API error ${res.status}`,
      };
    }

    const data = await res.json();
    let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Action JSON ni ajratib olamiz agar mavjud bo'lsa
    let action = null;
    const actionMatch = replyText.match(/ACTION_JSON:(\{.*?\})/);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
        replyText = replyText.replace(/ACTION_JSON:\{.*?\}/, '').trim();
      } catch {}
    }

    return {
      ok: true,
      text: replyText,
      action,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
    };
  }
}
