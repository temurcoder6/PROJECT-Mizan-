import { money } from '../format.js';
import { latToCyr } from '../text.js';

const fmtWeeks = (w) => w.toFixed(1);

const UZ = {
  m: (n) => money(n),
  draftTx: (n, income) =>
    n > 1
      ? `Quyidagi ${n} ta ${income ? 'daromadni' : 'xarajatni'} saqlaymi? Tekshiring, kerak bo'lsa tuzating.`
      : `Shu ${income ? 'daromadni' : 'xarajatni'} saqlaymi? Tekshiring, kerak bo'lsa tuzating.`,
  draftDebt: () => "Shu qarzni daftarga yozaymi? Tekshirib, tasdiqlang.",
  draftPayment: (p) => `${p} qarziga qaytarilgan pulni yozaymi?`,
  draftGoalAdd: (g) => `«${g}» maqsadiga shu summani qo'shaymi?`,
  askAmount: () => "Summani tushunmadim. Qancha? Masalan: «12 ming».",
  askSmall: (n) => `${n} deb yozdingiz. Aniqlashtiring: ${n} so'mmi yoki ${n} ming so'mmi?`,
  choiceThousand: (n) => `${n} ming so'm`,
  choiceExact: (n) => `${n} so'm`,
  askPerson: () => "Qarz kim bilan? Ismini yozing.",
  askDirection: () => "Siz qarz berdingizmi yoki oldingizmi?",
  choiceLent: () => 'Men qarz berdim',
  choiceBorrowed: () => 'Men qarz oldim',
  noDebtMatch: (p) => `«${p}» bilan ochiq qarz topilmadi. «Qarzlar» bo'limini tekshiring.`,
  topNone: () => "Shu oyda hali xarajat yozilmagan.",
  topIntro: (total) => `Shu oy jami ${money(total)} sarflandi. Eng ko'p ketgan joylar:`,
  topLine: (i, label, sum, pct) => `${i}. ${label} — ${money(sum)} (${pct}%)`,
  topTip: (label, save) => `Maslahat: «${label}» ni 10% kamaytirsangiz, bu oydagi xarajatingiz bo'yicha ${money(save)} qoladi.`,
  catSum: (label, sum, count) => `Shu oy «${label}» uchun ${count} marta, jami ${money(sum)} sarflandi.`,
  catNone: (label) => `Shu oy «${label}» uchun xarajat yozilmagan.`,
  debtNone: () => "Ochiq qarz yo'q.",
  debtTotals: (toMe, iOwe) => `Sizga qaytarilishi kerak: ${money(toMe)}. Siz qaytarishingiz kerak: ${money(iOwe)}.`,
  debtLine: (d) => `• ${d.person} — ${money(d.remaining)} qoldi${d.dueDate ? `, muddat ${d.dueDate}` : ''} (${d.direction === 'lent' ? 'sizga qaytaradi' : 'siz qaytarasiz'})`,
  goalNone: () => "Hali maqsad yo'q. «Maqsadlar» bo'limida summa va sanani kiriting, men aniq hisoblayman.",
  goalNotFound: (list) => `Bunday nomli maqsad topilmadi. Bor maqsadlar: ${list}.`,
  goalDone: (g) => `«${g}» maqsadiga yetdingiz!`,
  goalOverdue: (g, rem) => `«${g}» muddati o'tgan, yana ${money(rem)} kerak. Yangi sana belgilang.`,
  goalNoDeadline: (g, rem) => `«${g}» uchun yana ${money(rem)} kerak. Muddat kiritilmagan, shuning uchun haftalik summani hisoblab bo'lmaydi.`,
  goalPlan: (g, p, saved, target) =>
    `«${g}»: ${money(saved)} / ${money(target)} yig'ilgan. Yana ${money(p.remaining)} kerak, ${p.daysLeft} kun qoldi.\n` +
    `Haftasiga ${money(p.perWeek)}, oyiga ${money(p.perMonth)} yig'ish kerak.\n` +
    `Hisob: ${money(p.remaining)} ÷ ${fmtWeeks(p.weeks)} hafta. Har hafta bir xil summa yig'ilsa shunday bo'ladi.`,
  wishAsk: (have) =>
    `Bu xarajat emas, maqsad. Hech narsa saqlanmadi.${have ? ` Qo'lingizda ${money(have)} borligini ko'rdim.` : ''}
` +
    `Hisoblab berishim uchun narxi va muddati kerak. Masalan: «Narxi 18 million, 6 oyda». Natijani kuniga, haftasiga va oyiga ko'rsataman.`,
  wishEnough: (price, have) =>
    `Pulingiz yetadi: narxi ${money(price)}, sizda ${money(have)}. Yig'ish shart emas.`,
  wishPlan: (price, have, need, plans) =>
    `Narxi ${money(price)}${have ? `, sizda ${money(have)}, yetishmaydi ${money(need)}` : ''}.
` +
    plans.map((p) => `• ${p.days} kunda: kuniga ${money(p.perDay)}, haftasiga ${money(p.perWeek)}, oyiga ${money(p.perMonth)}`).join('\n') +
    `
Hisob: ${money(need)} ÷ kunlar soni. Pastdagi tugma bilan maqsad yaratishingiz mumkin. Tugmani bosmaguningizcha hech narsa saqlanmaydi.`,
  adhocPlan: (amount, p) =>
    `${money(amount)} ni ${p.days} kunda yig'ish uchun: haftasiga ${money(p.perWeek)}, oyiga ${money(p.perMonth)}.\n` +
    `Hisob: ${money(amount)} ÷ ${fmtWeeks(p.weeks)} hafta. Maqsadni saqlash uchun «Maqsadlar» bo'limida yarating.`,
  whatIf: (g, spend, r, weeks) =>
    `Agar ${money(spend)} sarflasangiz, «${g}» maqsadi uchun yig'ish kerak bo'lgan pul ${money(r.remaining)} dan ${money(r.newRemaining)} ga oshadi.\n` +
    `Muddatni saqlash uchun haftalik jamg'arma ${money(r.perWeekBefore)} dan ${money(r.perWeekAfter)} ga ko'tariladi.\n` +
    `Hisob: (${money(r.remaining)} + ${money(spend)}) ÷ ${fmtWeeks(weeks)} hafta. Hech narsa saqlanmadi.`,
  advIntro: () => 'Yozuvlaringiz asosida:',
  advOver: (i) =>
    `• Bugun reja ${money(i.over)} ga oshdi (reja ${money(i.today)}).${i.catLabel ? ` Eng ko'p «${i.catLabel}» ga ketdi.` : ''} ` +
    `Ertangi kunlik reja ${money(i.today)} dan ${money(i.tomorrow)} ga tushadi. Ertaga shu toifani kamaytirsangiz, reja saqlanadi.`,
  advCat: (i) =>
    `• Oxirgi 7 kunda «${i.catLabel}» ga ${money(i.week)} ketdi (xarajatning ${i.share}%). Shu tezlikda oyiga ${money(i.monthly)} bo'ladi; ` +
    `yarmiga kamaytirsangiz ${money(i.half)} qoladi. Hisob: ${money(i.week)} ÷ 7 × 30.`,
  advHabit: (i) => `• «${i.title}» odati oyiga ${money(i.monthly)} ketyapti. Yarmiga kamaytirsangiz oyiga ${money(i.half)} qoladi.`,
  advNone: () => "Oxirgi kunlarda ko'zga tashlanadigan ortiqcha xarajat topilmadi.",
  advFew: (i) => `Maslahat berish uchun yozuv kam (${i.entries} ta yozuv, ${i.days} kun). Bir necha kun yozing yoki «Unutilgan kun»ni to'ldiring.`,
  dropIntro: () => "Daromad kamaygan bo'lsa, mana bir nechta variant. Men hech narsani o'zim o'zgartirmayman, tanlov sizda:",
  dropAmount: (n) => `Kamaygan summa: ${money(n)}.`,
  dropUnplanned: (save, total) => `• Kutilmagan xarajatlarni yarmiga qisqartirish — oyiga ${money(save)} (oxirgi 30 kunda kutilmagan: ${money(total)}).`,
  dropTop: (label, save) => `• «${label}» xarajatini 20% kamaytirish — oyiga ${money(save)}.`,
  dropHabit: (title, save) => `• «${title}» odatini yarmiga kamaytirish — oyiga ${money(save)}.`,
  dropGoals: (before, after) => `• Maqsad muddatlarini 1 oyga uzaytirish — oylik jamg'arma ${money(before)} dan ${money(after)} ga tushadi.`,
  dropNoData: () => "Variant taklif qilishim uchun avval bir necha kunlik xarajatlarni yozing.",
  balance: (month, inc, exp, bal) => `${month}: daromad ${money(inc)}, xarajat ${money(exp)}, qoldiq ${money(bal)}.`,
  help: () =>
    "Men yozuv tayyorlayman va savollarga javob beraman. Hisob-kitobni dastur aniq formula bilan qiladi, men faqat tushuntiraman.\n" +
    "Misollar:\n• Bugun yo'lga 12 ming sarfladim\n• Pulim nimaga ko'p ketdi?\n• Qarzimdan qancha qoldi?\n• Telefon olishga qancha yig'ishim kerak?\n• Daromadim kamaydi",
  greet: () => "Assalomu alaykum! Xarajat, daromad yoki qarzni yozing, yoki savol bering.",
  fallback: () => "Tushunmadim. Masalan: «Bugun yo'lga 12 ming sarfladim» yoki «Pulim nimaga ko'p ketdi?»",
};

const RU = {
  m: (n) => money(n, 'сум'),
  draftTx: (n, income) =>
    n > 1 ? `Сохранить эти записи (${n})? Проверьте и при необходимости исправьте.` : `Сохранить этот ${income ? 'доход' : 'расход'}? Проверьте и при необходимости исправьте.`,
  draftDebt: () => 'Записать этот долг? Проверьте и подтвердите.',
  draftPayment: (p) => `Записать возврат по долгу (${p})?`,
  draftGoalAdd: (g) => `Добавить эту сумму к цели «${g}»?`,
  askAmount: () => 'Не понял сумму. Сколько? Например: «12 тысяч».',
  askSmall: (n) => `Вы написали ${n}. Уточните: ${n} сум или ${n} тысяч сум?`,
  choiceThousand: (n) => `${n} тысяч сум`,
  choiceExact: (n) => `${n} сум`,
  askPerson: () => 'С кем этот долг? Напишите имя.',
  askDirection: () => 'Вы дали в долг или взяли в долг?',
  choiceLent: () => 'Я дал в долг',
  choiceBorrowed: () => 'Я взял в долг',
  noDebtMatch: (p) => `Открытый долг с «${p}» не найден. Проверьте раздел «Qarzlar».`,
  topNone: () => 'В этом месяце расходов пока нет.',
  topIntro: (total) => `В этом месяце потрачено ${money(total, 'сум')}. Больше всего ушло на:`,
  topLine: (i, label, sum, pct) => `${i}. ${label} — ${money(sum, 'сум')} (${pct}%)`,
  topTip: (label, save) => `Совет: если сократить «${label}» на 10%, останется примерно ${money(save, 'сум')} в месяц.`,
  catSum: (label, sum, count) => `В этом месяце на «${label}»: ${count} раз, всего ${money(sum, 'сум')}.`,
  catNone: (label) => `В этом месяце расходов на «${label}» нет.`,
  debtNone: () => 'Открытых долгов нет.',
  debtTotals: (toMe, iOwe) => `Вам должны вернуть: ${money(toMe, 'сум')}. Вы должны вернуть: ${money(iOwe, 'сум')}.`,
  debtLine: (d) => `• ${d.person} — осталось ${money(d.remaining, 'сум')}${d.dueDate ? `, срок ${d.dueDate}` : ''} (${d.direction === 'lent' ? 'вернут вам' : 'возвращаете вы'})`,
  goalNone: () => 'Целей пока нет. Создайте цель в разделе «Maqsadlar» (сумма и дата) — я посчитаю точно.',
  goalNotFound: (list) => `Цель с таким названием не найдена. Ваши цели: ${list}.`,
  goalDone: (g) => `Цель «${g}» достигнута!`,
  goalOverdue: (g, rem) => `Срок цели «${g}» прошёл, осталось ${money(rem, 'сум')}. Укажите новую дату.`,
  goalNoDeadline: (g, rem) => `Для «${g}» осталось ${money(rem, 'сум')}. Срок не указан, поэтому недельную сумму посчитать нельзя.`,
  goalPlan: (g, p, saved, target) =>
    `«${g}»: накоплено ${money(saved, 'сум')} из ${money(target, 'сум')}. Осталось ${money(p.remaining, 'сум')}, дней: ${p.daysLeft}.\n` +
    `Нужно откладывать ${money(p.perWeek, 'сум')} в неделю или ${money(p.perMonth, 'сум')} в месяц.\n` +
    `Расчёт: ${money(p.remaining, 'сум')} ÷ ${fmtWeeks(p.weeks)} нед. При равных взносах так и будет.`,
  wishAsk: (have) =>
    `Это не расход, а цель. Ничего не сохранено.${have ? ` Вижу, что у вас ${money(have, 'сум')}.` : ''}
` +
    `Для расчёта нужны цена и срок. Например: «Цена 18 миллионов, за 6 месяцев». Покажу по дням, неделям и месяцам.`,
  wishEnough: (price, have) =>
    `Денег хватает: цена ${money(price, 'сум')}, у вас ${money(have, 'сум')}. Копить не нужно.`,
  wishPlan: (price, have, need, plans) =>
    `Цена ${money(price, 'сум')}${have ? `, у вас ${money(have, 'сум')}, не хватает ${money(need, 'сум')}` : ''}.
` +
    plans.map((p) => `• за ${p.days} дн.: в день ${money(p.perDay, 'сум')}, в неделю ${money(p.perWeek, 'сум')}, в месяц ${money(p.perMonth, 'сум')}`).join('\n') +
    `
Расчёт: ${money(need, 'сум')} ÷ число дней. Ничего не сохранено.`,
  adhocPlan: (amount, p) =>
    `Чтобы накопить ${money(amount, 'сум')} за ${p.days} дн.: ${money(p.perWeek, 'сум')} в неделю, ${money(p.perMonth, 'сум')} в месяц.\n` +
    `Расчёт: ${money(amount, 'сум')} ÷ ${fmtWeeks(p.weeks)} нед. `,
  whatIf: (g, spend, r, weeks) =>
    `Если потратить ${money(spend, 'сум')}, сумма для цели «${g}» вырастет с ${money(r.remaining, 'сум')} до ${money(r.newRemaining, 'сум')}.\n` +
    `Чтобы уложиться в срок, недельный взнос вырастет с ${money(r.perWeekBefore, 'сум')} до ${money(r.perWeekAfter, 'сум')}.\n` +
    `Расчёт: (${money(r.remaining, 'сум')} + ${money(spend, 'сум')}) ÷ ${fmtWeeks(weeks)} нед. Ничего не сохранено.`,
  advIntro: () => 'По вашим записям:',
  advOver: (i) =>
    `• Сегодня план превышен на ${money(i.over, 'сум')} (план ${money(i.today, 'сум')}).${i.catLabel ? ` Больше всего ушло на «${i.catLabel}».` : ''} ` +
    `Завтрашний дневной план снизится с ${money(i.today, 'сум')} до ${money(i.tomorrow, 'сум')}. Если завтра сократить эту категорию, план сохранится.`,
  advCat: (i) =>
    `• За последние 7 дней на «${i.catLabel}» ушло ${money(i.week, 'сум')} (${i.share}% расходов). При таком темпе это ${money(i.monthly, 'сум')} в месяц; ` +
    `если сократить вдвое, останется ${money(i.half, 'сум')}. Расчёт: ${money(i.week, 'сум')} ÷ 7 × 30.`,
  advHabit: (i) => `• Привычка «${i.title}» обходится в ${money(i.monthly, 'сум')} в месяц. Если сократить вдвое, останется ${money(i.half, 'сум')} в месяц.`,
  advNone: () => 'За последние дни заметных лишних расходов не найдено.',
  advFew: (i) => `Для совета записей мало (${i.entries} шт., ${i.days} дн.). Запишите несколько дней или заполните «Забытый день».`,
  dropIntro: () => 'Если доход уменьшился, вот несколько вариантов. Я ничего не меняю сам — выбор за вами:',
  dropAmount: (n) => `Снижение дохода: ${money(n, 'сум')}.`,
  dropUnplanned: (save, total) => `• Сократить незапланированные расходы вдвое — около ${money(save, 'сум')} в месяц (за 30 дней: ${money(total, 'сум')}).`,
  dropTop: (label, save) => `• Сократить «${label}» на 20% — около ${money(save, 'сум')} в месяц.`,
  dropHabit: (title, save) => `• Вдвое сократить привычку «${title}» — около ${money(save, 'сум')} в месяц.`,
  dropGoals: (before, after) => `• Продлить сроки целей на 1 месяц — ежемесячный взнос снизится с ${money(before, 'сум')} до ${money(after, 'сум')}.`,
  dropNoData: () => 'Чтобы предложить варианты, сначала запишите расходы за несколько дней.',
  balance: (month, inc, exp, bal) => `${month}: доход ${money(inc, 'сум')}, расход ${money(exp, 'сум')}, остаток ${money(bal, 'сум')}.`,
  help: () =>
    'Я готовлю записи и отвечаю на вопросы. Расчёты делает программа по точным формулам, я только объясняю.\n' +
    'Примеры:\n• Сегодня потратил 12 тысяч на такси\n• На что ушли мои деньги?\n• Сколько осталось по долгам?\n• Сколько копить на телефон?',
  greet: () => 'Здравствуйте! Напишите расход, доход или долг, либо задайте вопрос.',
  fallback: () => 'Не понял. Например: «Сегодня потратил 12 тысяч на такси» или «На что ушли деньги?»',
};

const EN = {
  m: (n) => money(n),
  draftTx: (n, income) =>
    n > 1 ? `Save these ${n} entries? Check them and edit if needed.` : `Save this ${income ? 'income' : 'expense'}? Check it and edit if needed.`,
  draftDebt: () => 'Add this debt to the ledger? Check and confirm.',
  draftPayment: (p) => `Record a repayment for ${p}?`,
  draftGoalAdd: (g) => `Add this amount to the goal "${g}"?`,
  askAmount: () => 'I did not get the amount. How much? For example: "12k".',
  askSmall: (n) => `You wrote ${n}. Do you mean ${n} so'm or ${n} thousand so'm?`,
  choiceThousand: (n) => `${n} thousand so'm`,
  choiceExact: (n) => `${n} so'm`,
  askPerson: () => 'Who is this debt with? Type the name.',
  askDirection: () => 'Did you lend money or borrow it?',
  choiceLent: () => 'I lent money',
  choiceBorrowed: () => 'I borrowed money',
  noDebtMatch: (p) => `No open debt with "${p}" found. Check the Debts section.`,
  topNone: () => 'No expenses recorded this month yet.',
  topIntro: (total) => `This month you spent ${money(total)}. Most went to:`,
  topLine: (i, label, sum, pct) => `${i}. ${label} — ${money(sum)} (${pct}%)`,
  topTip: (label, save) => `Tip: cutting "${label}" by 10% leaves about ${money(save)} a month.`,
  catSum: (label, sum, count) => `This month "${label}": ${count} times, ${money(sum)} in total.`,
  catNone: (label) => `No "${label}" expenses this month.`,
  debtNone: () => 'No open debts.',
  debtTotals: (toMe, iOwe) => `Owed to you: ${money(toMe)}. You owe: ${money(iOwe)}.`,
  debtLine: (d) => `• ${d.person} — ${money(d.remaining)} left${d.dueDate ? `, due ${d.dueDate}` : ''} (${d.direction === 'lent' ? 'owes you' : 'you owe'})`,
  goalNone: () => 'No goals yet. Create one in Goals with an amount and a date, and I will calculate exactly.',
  goalNotFound: (list) => `No goal with that name. Your goals: ${list}.`,
  goalDone: (g) => `Goal "${g}" reached!`,
  goalOverdue: (g, rem) => `The deadline for "${g}" has passed; ${money(rem)} still needed. Set a new date.`,
  goalNoDeadline: (g, rem) => `"${g}" still needs ${money(rem)}. No deadline is set, so a weekly amount cannot be calculated.`,
  goalPlan: (g, p, saved, target) =>
    `"${g}": ${money(saved)} of ${money(target)} saved. ${money(p.remaining)} left, ${p.daysLeft} days to go.\n` +
    `Save ${money(p.perWeek)} a week or ${money(p.perMonth)} a month.\n` +
    `Calculation: ${money(p.remaining)} ÷ ${fmtWeeks(p.weeks)} weeks. Assuming equal weekly savings.`,
  wishAsk: (have) =>
    `This is a goal, not an expense. Nothing was saved.${have ? ` I see you have ${money(have)}.` : ''}
` +
    `To calculate I need the price and a deadline. For example: "Price 18 million, in 6 months". I will show it per day, week and month.`,
  wishEnough: (price, have) =>
    `You can afford it: price ${money(price)}, you have ${money(have)}. No need to save.`,
  wishPlan: (price, have, need, plans) =>
    `Price ${money(price)}${have ? `, you have ${money(have)}, short by ${money(need)}` : ''}.
` +
    plans.map((p) => `• in ${p.days} days: ${money(p.perDay)} a day, ${money(p.perWeek)} a week, ${money(p.perMonth)} a month`).join('\n') +
    `
Calculation: ${money(need)} ÷ number of days. Nothing was saved.`,
  adhocPlan: (amount, p) =>
    `To save ${money(amount)} in ${p.days} days: ${money(p.perWeek)} a week, ${money(p.perMonth)} a month.\n` +
    `Calculation: ${money(amount)} ÷ ${fmtWeeks(p.weeks)} weeks. `,
  whatIf: (g, spend, r, weeks) =>
    `If you spend ${money(spend)}, the amount still needed for "${g}" rises from ${money(r.remaining)} to ${money(r.newRemaining)}.\n` +
    `To keep the deadline, weekly saving rises from ${money(r.perWeekBefore)} to ${money(r.perWeekAfter)}.\n` +
    `Calculation: (${money(r.remaining)} + ${money(spend)}) ÷ ${fmtWeeks(weeks)} weeks. Nothing was saved.`,
  advIntro: () => 'Based on your entries:',
  advOver: (i) =>
    `• Today went ${money(i.over)} over plan (plan ${money(i.today)}).${i.catLabel ? ` Most went to "${i.catLabel}".` : ''} ` +
    `Tomorrow's daily plan drops from ${money(i.today)} to ${money(i.tomorrow)}. Cutting that category tomorrow keeps the plan intact.`,
  advCat: (i) =>
    `• In the last 7 days "${i.catLabel}" took ${money(i.week)} (${i.share}% of spending). At this pace that is ${money(i.monthly)} a month; ` +
    `halving it leaves ${money(i.half)}. Calculation: ${money(i.week)} ÷ 7 × 30.`,
  advHabit: (i) => `• The "${i.title}" habit costs ${money(i.monthly)} a month. Halving it leaves ${money(i.half)} a month.`,
  advNone: () => 'No standout extra spending found in recent days.',
  advFew: (i) => `Not enough entries for advice (${i.entries} entries, ${i.days} days). Log a few days or fill in a forgotten day.`,
  dropIntro: () => 'If your income dropped, here are some options. I will not change anything myself — you choose:',
  dropAmount: (n) => `Income drop: ${money(n)}.`,
  dropUnplanned: (save, total) => `• Halve unplanned spending — about ${money(save)} a month (last 30 days: ${money(total)}).`,
  dropTop: (label, save) => `• Cut "${label}" by 20% — about ${money(save)} a month.`,
  dropHabit: (title, save) => `• Halve the "${title}" habit — about ${money(save)} a month.`,
  dropGoals: (before, after) => `• Extend goal deadlines by 1 month — monthly saving drops from ${money(before)} to ${money(after)}.`,
  dropNoData: () => 'Record a few days of expenses first so I can suggest options.',
  balance: (month, inc, exp, bal) => `${month}: income ${money(inc)}, expenses ${money(exp)}, balance ${money(bal)}.`,
  help: () =>
    'I prepare entries and answer questions. The app does the math with exact formulas; I only explain.\n' +
    'Examples:\n• Spent 12k on taxi today\n• Where did my money go?\n• How much debt is left?\n• How much should I save for a phone?',
  greet: () => 'Hello! Tell me an expense, income or debt, or ask a question.',
  fallback: () => 'I did not understand. Try: "Spent 12k on taxi today" or "Where did my money go?"',
};

const CYR = Object.fromEntries(
  Object.entries(UZ).map(([k, fn]) => [k, (...args) => (k === 'm' ? fn(...args) : latToCyr(fn(...args)))]),
);

export function repliesFor(lang) {
  if (lang === 'ru') return RU;
  if (lang === 'en') return EN;
  if (lang === 'uz-cyrl') return CYR;
  return UZ;
}

export const LANG_NAMES = { uz: "O'zbek (lotin)", 'uz-cyrl': 'Ўзбек (кирилл)', ru: 'Русский', en: 'English' };
