import { useMemo, useState } from 'react';
import { ChevronDown, CreditCard, Info, Plus, ReceiptText, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { guessCategory } from '../lib/categories';
import { addDays, dateLabel, formatDigitsInput, money, parseDigits, todayISO } from '../lib/format';
import { dailyPlan, nextBillDate } from '../lib/plan';
import { useStore } from '../store';
import AnimatedNumber from './AnimatedNumber';
import { Badge, Button, Card, CardTitle, Field, Modal, MoneyInput, Progress, inputCls } from './ui';

function PlanSetup({ onClose, onOpenCards }) {
  const { profile, cards = [], actions } = useStore();
  const [cash, setCash] = useState(profile.cash !== null ? formatDigitsInput(Math.round(profile.cash)) : '');
  const [next, setNext] = useState(profile.nextIncome && profile.nextIncome > todayISO() ? profile.nextIncome : '');
  const [goals, setGoals] = useState(profile.includeGoals);
  const [error, setError] = useState('');
  const cardsTotal = cards.reduce((s, c) => s + (Number(c.balance) || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    if (cash.trim() === '') return setError('Hozirgi pul miqdorini kiriting. 0 bo\'lsa, 0 deb yozing.');
    if (!next || next <= todayISO()) return setError('Keyingi daromad sanasi ertadan boshlab bo\'lishi kerak.');
    actions.setCash(parseDigits(cash));
    actions.updateProfile({ nextIncome: next, includeGoals: goals });
    onClose();
  };

  return (
    <Modal title="Kunlik reja uchun ma'lumot" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-plaster/75">
          Reja faqat siz kiritgan ma'lumotdan hisoblanadi. Bank ma'lumoti ko'rinmaydi, shuning uchun hozirgi pulni o'zingiz yozasiz (naqd + kartadagi umumiy summa).
        </p>
        <Field label="Hozir qo'lingizda qancha pul bor (so'm)">
          <MoneyInput autoFocus value={cash} onChange={setCash} placeholder="masalan 850 000" />
        </Field>
        {(cards.length > 0 || onOpenCards) && (
          <div className="flex flex-wrap items-center gap-2">
            {cards.length > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={() => setCash(formatDigitsInput(Math.round(cardsTotal)))}>
                <CreditCard className="size-3.5 text-ochre" /> Kartalar yig'indisi: {money(cardsTotal)}
              </Button>
            )}
            {onOpenCards && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onClose();
                  onOpenCards();
                }}
              >
                Kartalar bo'limini ochish →
              </Button>
            )}
          </div>
        )}
        <Field label="Keyingi daromad qachon tushadi" hint="Maosh, avans yoki boshqa asosiy kirim sanasi.">
          <input type="date" className={inputCls} value={next} min={addDays(todayISO(), 1)} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-plaster/12 bg-[#071633] px-3 py-2.5 text-sm text-plaster/85">
          <input type="checkbox" className="size-4 accent-turq" checked={goals} onChange={(e) => setGoals(e.target.checked)} />
          Jamg'arma maqsadlari uchun ham pul ajratilsin
        </label>
        {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" className="flex-1">
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function BillsModal({ onClose }) {
  const { profile, actions } = useStore();
  const today = todayISO();
  const [f, setF] = useState({ name: '', amount: '', dueDate: addDays(today, 7), repeat: 'none' });
  const [error, setError] = useState('');

  const add = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setError('Nomini kiriting.');
    if (parseDigits(f.amount) <= 0) return setError('Summani kiriting.');
    if (!f.dueDate) return setError('Sanani tanlang.');
    actions.addBill({ name: f.name.trim(), amount: Math.round(parseDigits(f.amount)), dueDate: f.dueDate, repeat: f.repeat });
    setF({ name: '', amount: '', dueDate: addDays(today, 7), repeat: 'none' });
    setError('');
  };

  const pay = (b, date) => {
    actions.markBillPaid(b.id, date);
    if (window.confirm(`«${b.name}» to'landi deb belgilandi. Shu to'lovni xarajat sifatida ham yozaymi? (${money(b.amount)})`)) {
      actions.addTx({ type: 'expense', title: b.name, amount: b.amount, category: guessCategory(b.name), date: today, method: 'naqd', planned: true, note: '' });
    }
  };

  return (
    <Modal title="Zarur to'lovlar" onClose={onClose}>
      <p className="mb-3 text-sm text-plaster/75">Daromad sanasigacha to'lanishi shart bo'lgan narsalar (ijara, internet, kredit). Reja shu summani ajratib qo'yadi.</p>
      {profile.bills.length === 0 ? (
        <p className="mb-3 rounded-xl border border-dashed border-plaster/18 px-3 py-4 text-center text-sm text-plaster/55">Hali to'lov kiritilmagan.</p>
      ) : (
        <ul className="mb-4 divide-y divide-plaster/10">
          {profile.bills.map((b) => {
            const next = nextBillDate(b, today);
            return (
              <li key={b.id} className="flex items-center gap-2 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-plaster">
                    {b.name} {b.repeat === 'monthly' && <Badge tone="blue">Har oy</Badge>}
                    {b.repeat === 'weekly' && <Badge tone="blue">Har hafta</Badge>}
                  </div>
                  <div className="text-xs text-plaster/55">{next ? `Keyingi: ${dateLabel(next)}` : "To'langan"}</div>
                </div>
                <span className="font-bold text-plaster tabular-nums">{money(b.amount)}</span>
                {next && (
                  <Button size="sm" variant="outline" onClick={() => pay(b, next)}>
                    To'landi
                  </Button>
                )}
                <button type="button" aria-label="O'chirish" onClick={() => actions.deleteBill(b.id)} className="rounded-lg p-1.5 text-plaster/45 hover:bg-rose-500/15 hover:text-rose-300">
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-plaster/12 bg-[#071633] p-3">
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Nomi (ijara, internet...)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <MoneyInput placeholder="Masalan: 150 000" value={f.amount} onChange={(v) => setF({ ...f, amount: v })} />
          <input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          <select className={inputCls} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })}>
            <option value="none">Bir marta</option>
            <option value="weekly">Har hafta</option>
            <option value="monthly">Har oy</option>
          </select>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <Button type="submit" className="w-full">
          <Plus className="size-4" /> To'lov qo'shish
        </Button>
      </form>
    </Modal>
  );
}

function Row({ label, value, sign, sub, bold }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-1 ${bold ? 'font-bold text-plaster' : 'text-plaster/80'}`}>
      <span>
        {label}
        {sub && <span className="block text-xs font-normal text-plaster/55">{sub}</span>}
      </span>
      <span className="shrink-0 tabular-nums">
        {sign}
        {money(value)}
      </span>
    </div>
  );
}

export default function DailyPlanCard({ onOpenCards }) {
  const { transactions, debts, goals, cards = [], profile, actions } = useStore();
  const today = todayISO();
  const plan = useMemo(() => dailyPlan({ profile, transactions, debts, goals, today }), [profile, transactions, debts, goals, today]);
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(false);

  if (['need_cash', 'need_income', 'income_passed'].includes(plan.status)) {
    const text =
      plan.status === 'income_passed'
        ? "Keyingi daromad sanasi o'tib ketdi. Yangi sanani kiriting, shunda reja qayta hisoblanadi."
        : "«Bugun qancha sarflasam bo'ladi?» savoliga javob berish uchun ikki narsa kerak: hozirgi pulingiz va keyingi daromad sanasi. Raqamni o'zim o'ylab topmayman.";
    return (
      <Card className="border-ochre/35 bg-gradient-to-br from-[#0E2A5C]/85 to-[#071633]/90">
        <CardTitle icon={Wallet}>Bugun qancha sarflash rejam bor?</CardTitle>
        <p className="text-sm text-plaster/75">{text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setModal('setup')}>
            Ma'lumot kiritish (1 daqiqa)
          </Button>
          {onOpenCards && (
            <Button variant="outline" onClick={onOpenCards}>
              <CreditCard className="size-4 text-ochre" /> Kartalar ({cards.length})
            </Button>
          )}
        </div>
        {modal === 'setup' && <PlanSetup onClose={() => setModal(null)} onOpenCards={onOpenCards} />}
      </Card>
    );
  }

  const deficit = plan.status === 'deficit';
  const used = plan.todayBudget > 0 ? plan.spentToday / plan.todayBudget : 0;

  return (
    <Card className={deficit ? 'border-ochre/50 bg-gradient-to-br from-[#23190B]/90 to-[#0B1528]/95' : 'border-ochre/40 bg-gradient-to-br from-[#0E2A5C] via-[#0B224B] to-[#071633]'}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-plaster">
          <Wallet className="size-4.5 text-ochre" aria-hidden /> Bugun sarflash rejam
        </h2>
        <Badge tone="green">Hisobi ochiq</Badge>
      </div>

      {deficit ? (
        <div className="mt-3">
          <p className="font-display text-2xl font-semibold text-[#F2C46B] tabular-nums">{money(plan.shortfall)} yetishmaydi</p>
          <p className="mt-1 text-sm text-plaster/75">
            Daromad sanasigacha ({dateLabel(profile.nextIncome)}, {plan.days} kun) rejalangan to'lovlar, qarzlar va jamg'arma ajratmasi hozirgi pulingizdan ko'p. Kunlik summa chiqarmadim.
            To'lov sanalarini, jamg'arma ajratmasini yoki daromad sanasini tekshirib ko'ring.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-display text-4xl font-semibold tracking-tight text-plaster tabular-nums"><AnimatedNumber value={Math.max(plan.leftToday, 0)} /></p>
          <p className="mt-1 text-sm text-turq-soft">
            {plan.leftToday >= 0
              ? `bugun uchun qoldi (reja: ${money(plan.todayBudget)})`
              : `Bugungi reja ${money(-plan.leftToday)} ga oshdi. Ertangi reja shunga qarab biroz o'zgaradi.`}
          </p>
          <Progress value={used} className="mt-3 bg-[#050C1B]/75" color={used > 1 ? 'bg-ochre' : 'bg-turq'} />
          <p className="mt-2 text-xs text-plaster/65">
            Bugun yozilgan: {money(plan.spentToday)} · daromad sanasigacha {plan.days} kun · o'rtacha {money(plan.perDay)} / kun
          </p>
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-plaster/85 hover:text-plaster" aria-expanded={open}>
        <ChevronDown className={`size-4 text-ochre transition ${open ? 'rotate-180' : ''}`} /> Hisob qanday chiqdi
      </button>

      {open && (
        <div className={`mt-2 rounded-xl border p-3 text-sm ${deficit ? 'border-ochre/30 bg-[#071633]' : 'border-plaster/14 bg-[#061228]/90 text-plaster'}`}>
          <Row label="Hozirgi pul" sub={`${dateLabel(profile.cashDate)} da kiritgan summangiz va undan keyingi yozuvlar`} value={plan.cash} />
          <Row label="Zarur to'lovlar" sub={plan.bills.map((b) => `${b.name} ${dateLabel(b.date)}`).join(', ') || "yo'q"} value={plan.billsSum} sign="−" />
          <Row label="Qarz muddatlari" sub={plan.debtItems.map((d) => `${d.person} ${dateLabel(d.dueDate)}`).join(', ') || "yo'q"} value={plan.debtSum} sign="−" />
          <Row label="Jamg'arma ajratmasi" sub={profile.includeGoals ? plan.goalItems.map((g) => g.name).join(', ') || "yo'q" : "o'chirilgan"} value={plan.goalSum} sign="−" />
          <div className="my-1.5 border-t border-plaster/12" />
          <Row label="Erkin pul" value={plan.remaining} bold />
          {!deficit && (
            <>
              <Row label={`÷ ${plan.days} kun (bugundan ${dateLabel(plan.lastDay)} gacha)`} value={plan.perDay} sign="= " />
              <Row label="Bugungi reja (bugun yozilgan xarajat qo'shib hisoblanadi)" value={plan.todayBudget} bold />
            </>
          )}
          <p className="mt-2 flex gap-1.5 text-xs text-plaster/55">
            <Info className="mt-0.5 size-3.5 shrink-0 text-ochre" aria-hidden />
            Natija siz kiritgan ma'lumotga tayanadi va kafolatlangan mablag' emas. Yozilmagan xarajatlar hisobga olinmaydi, shuning uchun haftada bir «Pulni yangilash» ni bosing. Muddatsiz qarzlar va sizga
            qaytariladigan pullar rejaga kirmaydi. Bankdan ma'lumot olinmaydi.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setModal('setup')}>
          <RefreshCw className="size-3.5" /> Pulni yangilash
        </Button>
        {onOpenCards && (
          <Button size="sm" variant="outline" onClick={onOpenCards}>
            <CreditCard className="size-3.5 text-ochre" /> Kartalar ({cards.length})
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setModal('bills')}>
          <ReceiptText className="size-3.5" /> Zarur to'lovlar ({profile.bills.length})
        </Button>
        <Button size="sm" variant="outline" onClick={() => actions.updateProfile({ includeGoals: !profile.includeGoals })}>
          Jamg'arma: {profile.includeGoals ? 'hisobda' : "hisobda emas"}
        </Button>
      </div>

      {modal === 'setup' && <PlanSetup onClose={() => setModal(null)} onOpenCards={onOpenCards} />}
      {modal === 'bills' && <BillsModal onClose={() => setModal(null)} />}
    </Card>
  );
}
