import { categoryLabel, matchCategory, guessCategory } from '../categories.js';
import { addDays, monthLabel, uid } from '../format.js';
import {
  debtRemaining, debtTotals, detectRecurring, goalPlan, inRange, periodRange, planForDays, summarize, whatIf,
} from '../finance.js';
import { cyrToLat, latToCyr, normalize } from '../text.js';
import {
  debtDirection, detectDate, detectLang, detectMethod, extractPerson, extractTitle, isAmbiguous, scanNumbers, splitClauses,
} from './nlp.js';
import { adviceText } from './advice.js';
import { buildAdvice } from '../insights.js';
import { repliesFor } from './replies.js';

// The assistant never writes data itself. It returns text plus "drafts" that the UI shows
// as editable cards; nothing is saved until the user presses "Saqlash".

const RX = {
  advice: /(maslahat|kamaytir|qayerda tejay|nimani kamaytir|qayerdan tejay|совет|где сэкономить|как сэкономить|что сократить|advice|where can i (save|cut)|cut back|what should i cut)/,
  whatIfVerb:/(sarflasam|sarf qilsam|xarid qilsam|sotib olsam|\bolsam|потрачу|потрачу|если (я )?(потра|куплю|куп)|if i (spend|buy|spent))/,
  whatIfAsk: /(\?|nima bo'ladi|rejam|reja\b|maqsad|telefon|yig'|что будет|план|цел|what happens|plan|goal|affect)/,
  incomeDrop:/(daromad\S* kamay|maosh\S* kamay|oyli[gk]\S* kamay|ish haqi\S* kamay|pul\S* kam qoldi|доход\S* (уменьш|упал|снизил|сократил)|зарплат\S* (уменьш|урезал|снизил|сократил)|меньше (денег|зарабат|получа)|income (dropped|decreased|fell|went down)|earn(ing)? less|salary (was )?(cut|dropped|decreased)|pay cut)/,
  debt: /(qarz|долг|взайм|занял|одолжил|debt|\bowe|lent|loan|borrow)/,
  repay: /(qaytardi|qaytardim|qaytarib berdi|qaytarib berdim|вернул|returned|paid back|repaid)/,
  repayMine: /(qaytardim|qaytarib berdim|я вернул|\bi (paid back|returned|repaid))/,
  goal: /(yig'|yig'?(ish|ib|sam|moqchi)|jamg'ar|maqsad|tejab|tejash|накоп|копить|цел[ьи]|отлож|\bsave|saving|goal)/,
  wish: /(olmoqchi|sotib olmoq|olgim kel|olishni (xohla|istay)|xohlayman|хочу (купить|взять)|хочу накопить|want to (buy|get)|planning to buy)/,
  haveMoney: /(pulim|puli\S* bor|qo'lim\S* bor|bor|mavjud|есть|у меня|i have|have)/,
  goalAdded: /(yig'dim|qo'ydim|tejadim|jamg'ardim|qo'shdim|отложил|накопил|добавил|i saved|put aside|added)/,
  top: /(nimaga ko'p|nimalarga ko'p|qayerga (ketdi|ketyapti|ketayapti|ketgan|ketadi)|eng ko'p|ko'p ketdi|ko'p sarfla|на что|куда (ушл|уход|трат|деньги)|больше всего|where (did|does|do) (my|the) money|spent the most|most money|where.{0,20}money go)/,
  question: /(qancha|nechpul|necha|qayer|qaysi|\?|сколько|куда|how much|how many|where|what)/,
  balance: /(balans|hisobot|qoldiq|qancha qoldi|qolgan|bu oy|shu oy|баланс|отч[её]т|итог|остаток|остал|в этом месяце|\bleft\b|remain|balance|report|summary|this month)/,
  income: /(maosh|oylik oldim|oylik tushdi|oylik berdi|ish haqi|daromad|tushdi|ishlab topdim|topdim|sotdim|avans|otamdan|onamdan|akamdan|opamdan|зарплат|получил|доход|заработал|аванс|продал|salary|earned|income|got paid|received|sold)/,
  // Ovozdan keladigan qo'shimcha daromad so'zlari: "buyurtmadan 150 ming berdi", "oylik 1 500 000 so'm berdi"
  incomeUz: /(buyurtma|savdodan|savdo qildim|xizmat haqi|hosil|paxta|chorva|bug'doy|sovrin|yutdim|\bberdi\b|\bkeldi\b)/,
  spendVerb: /(sarf|to'la|oldim|xarid|ketdi|потрат|заплатил|купил|оплатил|ушло|spent|spend|paid|bought|cost)/,
  greet: /^(salom|assalom|привет|здравств|добрый|hello|hi|hey)/,
  help: /(yordam|nima qila olasan|nima qilasan|qanday ishlaysan|помощ|что ты умеешь|что умеешь|help|what can you)/,
};

const say = (lang, text, extra = {}) => ({ id: uid(), role: 'assistant', lang, text, ...extra });
const draft = (kind, data) => ({ id: uid(), kind, data, status: 'pending' });

function localize(name, lang) {
  return lang === 'uz-cyrl' ? latToCyr(name) : name;
}

function sameName(a, b) {
  const x = cyrToLat(normalize(a));
  const y = cyrToLat(normalize(b));
  if (!x || !y) return false;
  const n = Math.min(4, x.length, y.length);
  return x.startsWith(y.slice(0, n)) || y.startsWith(x.slice(0, n));
}

function txDrafts(proc, lang, today, type, forcedAmount) {
  const date = detectDate(proc, today);
  const method = detectMethod(proc) || 'naqd';
  // Bo'laklarga ajratamiz, agar kamida ikkitasida o'z summasi bo'lsa ("nonga 5000 va taksiga o'n ming").
  const parts = splitClauses(proc);
  const clauses = parts.length > 1 && parts.filter((p) => scanNumbers(p, lang).amounts.length).length > 1 ? parts : [proc];
  const drafts = [];
  for (const clause of clauses) {
    const own = forcedAmount != null ? { value: forcedAmount } : scanNumbers(clause, lang).amounts[0];
    if (!own) continue;
    const category = guessCategory(clause, type);
    const title = extractTitle(clause, lang);
    drafts.push(
      draft('tx', {
        type,
        title: title ? localize(title, lang) : categoryLabel(category),
        amount: own.value,
        category,
        date,
        method,
        planned: true,
        note: '',
      }),
    );
    if (forcedAmount != null) break;
  }
  return drafts;
}

function topAnswer(T, data, today, lang) {
  const { from, to } = periodRange('month', today);
  const s = summarize(inRange(data.transactions, from, to));
  if (!s.categories.length) return T.topNone();
  const lines = s.categories.slice(0, 4).map((c, i) => T.topLine(i + 1, categoryLabel(c.id, lang === 'uz-cyrl' ? 'uz' : lang), c.sum, Math.round(c.pct * 100)));
  const top = s.categories[0];
  return [T.topIntro(s.expense), ...lines, T.topTip(categoryLabel(top.id, lang === 'uz-cyrl' ? 'uz' : lang), top.sum * 0.1)].join('\n');
}

function debtAnswer(T, data, lang) {
  const open = data.debts.filter((d) => debtRemaining(d) > 0);
  if (!open.length) return T.debtNone();
  const { owedToMe, iOwe } = debtTotals(open);
  const lines = open.map((d) => T.debtLine({ ...d, person: localize(d.person, lang), remaining: debtRemaining(d) }));
  return [T.debtTotals(owedToMe, iOwe), ...lines].join('\n');
}

function goalAnswer(T, data, today, proc, lang, amounts, durations) {
  const goal = findGoal(data.goals, proc, lang);
  if (!goal) {
    if (amounts.length && durations.length) return T.adhocPlan(amounts[0].value, planForDays(amounts[0].value, durations[0].days));
    if (!data.goals.length) return T.goalNone();
    if (data.goals.length === 1) return goalText(T, data.goals[0], today, lang);
    return T.goalNotFound(data.goals.map((g) => `«${g.name}»`).join(', ')) + '\n\n' + data.goals.map((g) => goalText(T, g, today, lang)).join('\n\n');
  }
  return goalText(T, goal, today, lang);
}

function goalText(T, goal, today, lang) {
  const name = localize(goal.name, lang);
  const p = goalPlan(goal, today);
  if (p.done) return T.goalDone(name);
  if (p.overdue) return T.goalOverdue(name, p.remaining);
  if (p.noDeadline) return T.goalNoDeadline(name, p.remaining);
  return T.goalPlan(name, p, goal.saved, goal.target);
}

function whatIfText(T, goal, spend, today, lang) {
  const p = goalPlan(goal, today);
  if (!(p.daysLeft > 0) || p.remaining <= 0) return goalText(T, goal, today, lang);
  const r = whatIf(goal, spend, today);
  return T.whatIf(localize(goal.name, lang), spend, r, p.weeks);
}

function incomeDropAnswer(T, data, today, amounts, lang) {
  const last30 = inRange(data.transactions, addDays(today, -29), today);
  const s = summarize(last30);
  const lines = [T.dropIntro()];
  if (amounts.length) lines.push(T.dropAmount(amounts[0].value));
  let options = 0;
  if (s.unplanned > 0) { lines.push(T.dropUnplanned(s.unplanned / 2, s.unplanned)); options++; }
  if (s.categories.length) {
    const top = s.categories[0];
    lines.push(T.dropTop(categoryLabel(top.id, lang === 'uz-cyrl' ? 'uz' : lang), top.sum * 0.2));
    options++;
  }
  const habit = detectRecurring(data.transactions, today)[0];
  if (habit) { lines.push(T.dropHabit(localize(habit.title, lang), habit.monthly / 2)); options++; }
  const active = data.goals.map((g) => ({ g, p: goalPlan(g, today) })).filter(({ p }) => p.daysLeft > 0);
  if (active.length) {
    const before = active.reduce((sum, { p }) => sum + p.perMonth, 0);
    const after = active.reduce((sum, { g }) => sum + goalPlan({ ...g, deadline: addDays(g.deadline, 30) }, today).perMonth, 0);
    lines.push(T.dropGoals(before, after));
    options++;
  }
  return options ? lines.join('\n') : T.dropNoData();
}

const capitalizeRaw = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// "iPhone 18 Pro olmoqchiman, ..." -> "iPhone 18 Pro": "olmoqchi" so'zidan oldingi oxirgi 3 so'z.
function wishName(input) {
  const m = String(input).match(/^(.*?)\s*(olmoqchi|sotib olmoq|olgim|olishni|xohlayman)/i);
  const words = (m ? m[1] : '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean).slice(-3);
  const name = words.join(' ');
  return name ? capitalizeRaw(name) : 'Yangi maqsad';
}

function resolvePending(pending, input, proc, lang, today) {
  const T = repliesFor(pending.lang);
  const { amounts } = scanNumbers(proc, lang);
  const clearAmount = amounts.length && !isAmbiguous(amounts[0]);
  if (pending.kind === 'amount' && clearAmount) {
    const drafts = txDrafts(pending.source, pending.lang, today, pending.type, amounts[0].value);
    if (drafts.length) return { reply: say(pending.lang, T.draftTx(1, pending.type === 'income'), { drafts }), pending: null };
  }
  if (pending.kind === 'debtAmount' && clearAmount) {
    return debtFlow({ ...pending.debt, amount: amounts[0].value }, pending.lang);
  }
  if (pending.kind === 'person') {
    const name = input.trim().replace(/[.!?]+$/, '');
    if (name && name.length <= 40 && !amounts.length) {
      return debtFlow({ ...pending.debt, person: capitalizeRaw(name) }, pending.lang);
    }
  }
  if (pending.kind === 'direction') {
    const dir = debtDirection(proc, lang);
    if (dir) return debtFlow({ ...pending.debt, direction: dir }, pending.lang);
  }
  return null;
}

function debtFlow(debt, lang) {
  const T = repliesFor(lang);
  if (!debt.direction) {
    return {
      reply: say(lang, T.askDirection(), { choices: [T.choiceLent(), T.choiceBorrowed()] }),
      pending: { kind: 'direction', lang, debt },
    };
  }
  if (!debt.person) return { reply: say(lang, T.askPerson()), pending: { kind: 'person', lang, debt } };
  return { reply: say(lang, T.draftDebt(), { drafts: [draft('debt', debt)] }), pending: null };
}

function findGoal(goals, proc, lang) {
  const latin = cyrToLat(proc);
  const title = extractTitle(proc, lang);
  return goals.find((g) => latin.includes(cyrToLat(normalize(g.name))) || sameName(g.name, title));
}

// Returns { reply, pending }.
export function respond(rawInput, { data, today, pending }) {
  const input = String(rawInput).slice(0, 1000);
  const lang = detectLang(input);
  const norm = normalize(input);
  const proc = lang === 'uz-cyrl' ? cyrToLat(norm) : norm;
  const T = repliesFor(lang);
  const { amounts, durations } = scanNumbers(proc, lang);

  if (pending) {
    const resolved = resolvePending(pending, input, proc, lang, today);
    if (resolved) return resolved;
  }

  if (!amounts.length && RX.help.test(proc)) return { reply: say(lang, T.help()), pending: null };
  if (!amounts.length && RX.greet.test(proc)) return { reply: say(lang, `${T.greet()}\n\n${T.help()}`), pending: null };

  if (RX.incomeDrop.test(proc)) return { reply: say(lang, incomeDropAnswer(T, data, today, amounts, lang)), pending: null };

  if (!amounts.length && RX.advice.test(proc)) {
    return { reply: say(lang, adviceText(buildAdvice(data, today), lang)), pending: null };
  }

  if (amounts.length && !isAmbiguous(amounts[0]) && RX.whatIfVerb.test(proc) && RX.whatIfAsk.test(proc)) {
    if (!data.goals.length) return { reply: say(lang, T.goalNone()), pending: null };
    const goal = findGoal(data.goals, proc, lang) || data.goals[0];
    return { reply: say(lang, whatIfText(T, goal, amounts[0].value, today, lang)), pending: null };
  }

  // Debts: repayment, new debt, or a question about debts.
  if (RX.repay.test(proc) && (RX.debt.test(proc) || amounts.length)) {
    if (!amounts.length) return { reply: say(lang, debtAnswer(T, data, lang)), pending: null };
    const person = extractPerson(proc, lang);
    const direction = RX.repayMine.test(proc) ? 'borrowed' : 'lent';
    const debt = person && data.debts.find((d) => debtRemaining(d) > 0 && d.direction === direction && sameName(d.person, person));
    if (!debt) return { reply: say(lang, person ? T.noDebtMatch(localize(person, lang)) : T.askPerson()), pending: null };
    const payment = { debtId: debt.id, person: debt.person, amount: Math.min(amounts[0].value, debtRemaining(debt)), date: detectDate(proc, today) };
    return { reply: say(lang, T.draftPayment(localize(debt.person, lang)), { drafts: [draft('payment', payment)] }), pending: null };
  }
  if (RX.debt.test(proc)) {
    if (!amounts.length || (RX.question.test(proc) && !debtDirection(proc, lang))) {
      return { reply: say(lang, debtAnswer(T, data, lang)), pending: null };
    }
    const a = amounts[0];
    const person = extractPerson(proc, lang);
    const debt = {
      direction: debtDirection(proc, lang),
      person: person ? localize(person, lang) : '',
      amount: a.value,
      date: detectDate(proc, today),
      dueDate: durations.length ? addDays(today, durations[0].days) : '',
      note: '',
      remind: true,
    };
    if (isAmbiguous(a)) {
      return {
        reply: say(lang, T.askSmall(a.base), { choices: [T.choiceThousand(a.base), T.choiceExact(a.base)] }),
        pending: { kind: 'debtAmount', lang, debt },
      };
    }
    return debtFlow(debt, lang);
  }

  // "iPhone olmoqchiman, pulim 3,5 million, qancha yig'ishim kerak?" — bu xarajat emas, jamg'arma savoli.
  // Hech narsa saqlanmaydi: narx va muddat bo'lsa hisoblab beradi, bo'lmasa so'raydi.
  if (RX.wish.test(proc) && (RX.question.test(proc) || RX.goal.test(proc)) && !RX.goalAdded.test(proc)) {
    // "iPhone 18 Pro" dagi 18 kabi model raqamlari summa emas: 1000 dan kichiklarini hisobga olmaymiz.
    const vals = amounts.map((a) => a.value).filter((v) => v >= 1000).sort((x, y) => y - x);
    let price = 0;
    let have = 0;
    if (vals.length >= 2) { price = vals[0]; have = vals[vals.length - 1]; }
    else if (vals.length === 1) { if (RX.haveMoney.test(proc)) have = vals[0]; else price = vals[0]; }
    if (!price) return { reply: say(lang, T.wishAsk(have)), pending: null };
    const need = Math.max(price - have, 0);
    if (need <= 0) return { reply: say(lang, T.wishEnough(price, have)), pending: null };
    // Maqsad kartasi (tasdiq tugmali): bosilmaguncha hech narsa saqlanmaydi. Muddat aytilmasa 12 oy.
    const goalDays = durations.length ? durations[0].days : 365;
    const goalCard = lang === 'uz'
      ? { action: 'create_goal', name: wishName(input), target: price, saved: have, daily: Math.round(need / goalDays), months: Math.max(1, Math.round(goalDays / 30)) }
      : undefined;
    const plans = durations.length ? [planForDays(need, durations[0].days)] : [90, 180, 365].map((d) => planForDays(need, d));
    return { reply: say(lang, T.wishPlan(price, have, need, plans), goalCard ? { action: goalCard } : {}), pending: null };
  }

  // Goals: adding money to a goal, or asking how much to save.
  if (RX.goal.test(proc)) {
    const goal = findGoal(data.goals, proc, lang);
    if (goal && amounts.length && RX.goalAdded.test(proc) && !isAmbiguous(amounts[0])) {
      const payload = { goalId: goal.id, goalName: goal.name, amount: amounts[0].value };
      return { reply: say(lang, T.draftGoalAdd(localize(goal.name, lang)), { drafts: [draft('goalAdd', payload)] }), pending: null };
    }
    if (RX.question.test(proc) || !amounts.length || durations.length) {
      return { reply: say(lang, goalAnswer(T, data, today, proc, lang, amounts, durations)), pending: null };
    }
  }

  if (!amounts.length && RX.top.test(proc)) return { reply: say(lang, topAnswer(T, data, today, lang)), pending: null };

  // "Taksiga qancha ketdi?" — spending in one category this month.
  if (!amounts.length && RX.question.test(proc)) {
    const cat = matchCategory(proc, 'expense');
    if (cat) {
      const { from, to } = periodRange('month', today);
      const items = inRange(data.transactions, from, to).filter((t) => t.type === 'expense' && t.category === cat);
      const label = categoryLabel(cat, lang === 'uz-cyrl' ? 'uz' : lang);
      const sum = items.reduce((s, t) => s + t.amount, 0);
      return { reply: say(lang, items.length ? T.catSum(label, sum, items.length) : T.catNone(label)), pending: null };
    }
  }

  if (!amounts.length && RX.question.test(proc) && (RX.balance.test(proc) || RX.spendVerb.test(proc) || /(pul|ден[ьг]|money)/.test(proc))) {
    return { reply: say(lang, balanceText(T, data, today, lang)), pending: null };
  }

  const type = RX.income.test(proc) || RX.incomeUz.test(proc) ? 'income' : 'expense';

  if (amounts.length) {
    const first = amounts[0];
    if (amounts.length === 1 && isAmbiguous(first)) {
      return {
        reply: say(lang, T.askSmall(first.base), { choices: [T.choiceThousand(first.base), T.choiceExact(first.base)] }),
        pending: { kind: 'amount', lang, source: proc, type },
      };
    }
    const drafts = txDrafts(proc, lang, today, type);
    if (drafts.length) return { reply: say(lang, T.draftTx(drafts.length, type === 'income'), { drafts }), pending: null };
  }

  if (RX.spendVerb.test(proc) || RX.income.test(proc)) {
    return { reply: say(lang, T.askAmount()), pending: { kind: 'amount', lang, source: proc, type } };
  }

  if (RX.balance.test(proc)) return { reply: say(lang, balanceText(T, data, today, lang)), pending: null };

  return { reply: say(lang, T.fallback()), pending: null };
}

function balanceText(T, data, today, lang) {
  const { from, to } = periodRange('month', today);
  const s = summarize(inRange(data.transactions, from, to));
  return T.balance(localize(monthLabel(today), lang), s.income, s.expense, s.balance);
}
