// Mizan AI — O'zbekistonning eng ilg'or shaxsiy moliyaviy aqlli maslahatchisi (CFO)
// Gemini 3.5 Flash dvigateli orqali O'zbekiston to'lov tizimlari, banklar, muddatli to'lovlar va bozorlar bo'yicha tahlil yuritadi.

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
Sen — "Mizan AI" (O'zbekiston shaxsiy moliyaviy cho'ntak maslahatchisi, shaxsiy CFO)san.
Sening maqsading: Foydalanuvchiga shunchaki xarajat yozib o'tirmasdan, pulini aqlli boshqarish, teshik xarajatlarni qisqartirish, O'zbekistonda eng arzon va oqilona xarid qilish hamda katta maqsadlariga tezroq yetishishga professional darajada yordam berish.

Sening ensiklopedik bilimlaring va ekspertizang:
1. To'lov tizimlari va banklar:
   - Payme, Click, Uzum Pay, Anorbank, TBC Bank, Kapitalbank, Ipak Yo'li, NBU, Ipoteka, Xalq banki.
   - P2P (kartadan kartaga) o'tkazma komissiyalari (odatda 0.5%–1%, Uzum yoki ilova ichida ko'pincha bepul limitlar bor).
   - Soliq.uz orqali QR-chek skanerlab 1% keshbek olish qoidasi.
2. Muddatli to'lov (Rassrochka / Nasiya) bozori:
   - Uzum Nasiya, Alif Nasiya (alif.uz), Iman Pay (islomiy moliyaviy tamoyil, ustamasiz), Paymart, Anor muddatli to'lov, Zoodpay.
   - Shartlari: Odatda 3, 6, 12 yoki 24 oyga beriladi. Nasiyada 15% dan 35% gacha ustama (narx oshishi) bo'ladi.
   - CFO maslahati: Agar naqd olish imkoni bo'lsa, nasiyaga ortiqcha ustama to'lamaslik, pulni oz-ozdan yig'ib naqd xarid qilish eng to'g'ri moliyaviy qaror.
3. Bozorlar va do'konlar (onlayn va oflayn):
   - Malika bozori (Toshkent Fleshmart) — smartfonlar, noutbuklar va gadjetlar uchun O'zbekistondagi eng arzon naqd savdo markazi.
   - Abu Saxiy bozori — maishiy texnika (muzlatgich, televizor, kir yuvish mashinasi) va ulgurji narxlar.
   - Rasmiy do'konlar: Texnomart, Mediapark, Idea, MacBro, Radius, Olcha.uz, Asaxiy.uz, Ishonch, Uzum Market.
4. Moliya tahlili qoidalari (CFO uslubi):
   - Agar foydalanuvchi xarid haqida so'rasa (masalan iPhone, avtomobil, texnika, to'y):
     1) Bozor narxini aniq hisobla.
     2) Foydalanuvchining hozirgi balansi (${context.balance || 0} so'm), kunlik erkin limiti (${context.dailyLimit || 0} so'm) va xarajatlaridan kelib chiqib, KUNIGA yoki OYIGA qancha pul ajratsa, qaysi muddatda yetishini aniq raqamlar bilan ko'rsat.
     3) Naqd (Malika/Abu Saxiy) va Muddatli to'lov (Uzum/Alif/Iman) farqini, qancha pul tejalishini taqqosla.
     4) Ortiqcha mayda xarajatlarni (har kungi kofe, taksi, tez-tez ovqat yetkazish) qisqartirish orqali maqsadga qancha kun oldin erishish mumkinligini hisoblab ber.
5. Maxsus interaktiv taklif (Action):
   Agar foydalanuvchi biror maqsad qo'ymoqchi bo'lsa yoki xaridni rejalashtirayotgan bo'lsa, javobing oxiriga quyidagi formatda JSON bloki qo'sh:
ACTION_JSON:{"action":"create_goal","name":"Nomi","target":10000000,"daily":35000,"months":6}

Uslubing:
O'zbek tilida, nihoyatda samimiy, ishonchli, dono, professional moliyaviy maslahatchi tili.
Paragraflar, ro'yxatlar va aniq hisob-kitoblar bilan yoz.
`;

  const userContent = `
Foydalanuvchi ma'lumotlari:
- Hamyon balansi: ${Number(context.balance || 0).toLocaleString('uz-UZ')} so'm
- Bugungi erkin xarajat chegarasi: ${Number(context.dailyLimit || 0).toLocaleString('uz-UZ')} so'm
- Bugun sarflangan: ${Number(context.todaySpent || 0).toLocaleString('uz-UZ')} so'm
- Shu oydagi jami xarajat: ${Number(context.monthExpense || 0).toLocaleString('uz-UZ')} so'm
- Mavjud maqsadlari: ${JSON.stringify(context.goals || [])}
- Qarzlar holati: ${JSON.stringify(context.debts || [])}

Foydalanuvchi savoli yoki xabari:
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
          maxOutputTokens: 1200,
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

// Moliyaviy Salomatlik Indeksi (0 - 100 ball) va 3 ta amaliy tavsiya hisoblagich
export function computeFinancialHealth({ transactions = [], balance = 0, dailyLimit = 85000, goals = [], debts = [] }) {
  let score = 70; // Boshlang'ich yaxshi baza
  const tips = [];

  const now = new Date();
  const thisMonthTxs = transactions.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalExpense = thisMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const unplannedExpense = thisMonthTxs
    .filter((t) => t.type === 'expense' && t.planned === false)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // 1. Kutilmagan xarajatlar me'yori
  if (totalExpense > 0) {
    const unplannedPct = unplannedExpense / totalExpense;
    if (unplannedPct > 0.3) {
      score -= 15;
      tips.push({
        title: "Kutilmagan xarajatlar ko'p",
        text: `Xarajatlaringizning ${Math.round(unplannedPct * 100)}% qismi rejasiz qilingan. Kundalik xarid oldidan 1 daqiqa to'xtab o'ylash oyiga kamida 300 000 so'm tejaydi.`,
        tone: 'amber',
      });
    } else {
      score += 10;
      tips.push({
        title: "Rejali xarajat intizomi",
        text: "Xarajatlaringizning asosiy qismi reja asosida ketmoqda. Intizomni shunday saqlang!",
        tone: 'emerald',
      });
    }
  }

  // 2. Mayda odatlar (kofe, taksi, tamaddilar)
  const smallHabits = thisMonthTxs.filter(
    (t) => t.type === 'expense' && /kofe|taksi|fastfood|shirinlik|choyxona|yetkaz/i.test(t.title || '')
  );
  const smallHabitsTotal = smallHabits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  if (smallHabitsTotal > 200000) {
    score -= 10;
    tips.push({
      title: "Mayda odatlar tuzog'i",
      text: `Bu oy kofe, taksi va yetkazib berishga jami ${smallHabitsTotal.toLocaleString('uz-UZ')} so'm sarflanibdi. Buni 30% ga qisqartirsangiz, maqsadingizga 1 oy oldin yetasiz.`,
      tone: 'amber',
    });
  } else {
    tips.push({
      title: "Kundalik mayda xarajatlar nazoratda",
      text: "Ortiqcha mayda pul sarflash sezilmadi. Pul oqimi to'g'ri taqsimlanmoqda.",
      tone: 'emerald',
    });
  }

  // 3. Maqsadlar va jamg'arma
  if (goals.length > 0) {
    score += 15;
    const g = goals[0];
    const pct = g.target > 0 ? Math.round(((g.saved || 0) / g.target) * 100) : 0;
    tips.push({
      title: `«${g.name}» maqsadi jadalligi`,
      text: `Hozirda maqsad ${pct}% bajarildi. Kuniga erkin qoldiqdan oz-ozdan ajratib borsangiz, muddatidan oldin yakunlaysiz.`,
      tone: 'cyan',
    });
  } else {
    score -= 10;
    tips.push({
      title: "Aniq maqsad qo'ying",
      text: "Maqsadsiz yig'ilgan pul tez sarflanib ketadi. Mizan AI orqali telefon, maishiy texnika yoki jamg'arma maqsadi belgilang.",
      tone: 'amber',
    });
  }

  // Chegaralar
  score = Math.max(25, Math.min(98, score));

  let grade = "A'lo daraja";
  let gradeColor = "text-turq";
  if (score < 50) {
    grade = "Diqqat talab";
    gradeColor = "text-rose-400";
  } else if (score < 75) {
    grade = "O'rtacha barqaror";
    gradeColor = "text-ochre";
  }

  return {
    score,
    grade,
    gradeColor,
    tips: tips.slice(0, 3),
  };
}
