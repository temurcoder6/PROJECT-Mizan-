import { useMemo, useState } from 'react';
import { ChevronDown, Info, Plus, ReceiptText, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { guessCategory } from '../lib/categories';
import { addDays, dateLabel, money, todayISO } from '../lib/format';
import { dailyPlan, nextBillDate } from '../lib/plan';
import { useStore } from '../store';
import AnimatedNumber from './AnimatedNumber';
import { Badge, Button, Card, CardTitle, Field, Modal, Progress, inputCls } from './ui';

const digits = (s) => s.replace(/[^\d\s]/g, '');
const num = (s) => Number(String(s).replace(/\s/g, '')) || 0;

function PlanSetup({ onClose }) {
  const { profile, actions } = useStore();
  const [cash, setCash] = useState(profile.cash !== null ? String(Math.round(profile.cash)) : '');
  const [next, setNext] = useState(profile.nextIncome && profile.nextIncome > todayISO() ? profile.nextIncome : '');
  const [goals, setGoals] = useState(profile.includeGoals);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (cash.trim() === '') return setError('Hozirgi pul miqdorini kiriting. 0 bo\'lsa, 0 deb yozing.');
    if (!next || next <= todayISO()) return setError('Keyingi daromad sanasi ertadan boshlab bo\'lishi kerak.');
    actions.setCash(num(cash));
    actions.updateProfile({ nextIncome: next, includeGoals: goals });
    onClose();
  };

  return (
    <Modal title="Kunlik reja uchun ma'lumot" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Reja faqat siz kiritgan ma'lumotdan hisoblanadi. Bank ma'lumoti ko'rinmaydi, shuning uchun hozirgi pulni o'zingiz yozasiz (naqd + kartadagi umumiy summa).
        </p>
        <Field label="Hozir qo'lingizda qancha pul bor (so'm)">
          <input autoFocus className={inputCls} inputMode="numeric" value={cash} onChange={(e) => setCash(digits(e.target.value))} placeholder="masalan 850 000" />
        </Field>
        <Field label="Keyingi daromad qachon tushadi" hint="Maosh, avans yoki boshqa asosiy kirim sanasi.">
          <input type="date" className={inputCls} value={next} min={addDays(todayISO(), 1)} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-emerald-600" checked={goals} onChange={(e) => setGoals(e.target.checked)} />
          Jamg'arma maqsadlari uchun ham pul ajratilsin
        </label>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
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
    if (num(f.amount) <= 0) return setError('Summani kiriting.');
    if (!f.dueDate) return setError('Sanani tanlang.');
    actions.addBill({ name: f.name.trim(), amount: Math.round(num(f.amount)), dueDate: f.dueDate, repeat: f.repeat });
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
      <p className="mb-3 text-sm text-slate-600">Daromad sanasigacha to'lanishi shart bo'lgan narsalar (ijara, internet, kredit). Reja shu summani ajratib qo'yadi.</p>
      {profile.bills.length === 0 ? (
        <p className="mb-3 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">Hali to'lov kiritilmagan.</p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-100">
          {profile.bills.map((b) => {
            const next = nextBillDate(b, today);
            return (
              <li key={b.id} className="flex items-center gap-2 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-900">
                    {b.name} {b.repeat === 'monthly' && <Badge tone="blue">Har oy</Badge>}
                    {b.repeat === 'weekly' && <Badge tone="blue">Har hafta</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{next ? `Keyingi: ${dateLabel(next)}` : "To'langan"}</div>
                </div>
                <span className="font-bold tabular-nums">{money(b.amount)}</span>
                {next && (
                  <Button size="sm" variant="outline" onClick={() => pay(b, next)}>
                    To'landi
                  </Button>
                )}
                <button type="button" aria-label="O'chirish" onClick={() => actions.deleteBill(b.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className="space-y-3 rounded-2xl bg-slate-50 p-3">
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Nomi (ijara, internet...)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inputCls} inputMode="numeric" placeholder="Summa" value={f.amount} onChange={(e) => setF({ ...f, amount: digits(e.target.value) })} />
          <input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          <select className={inputCls} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })}>
            <option value="none">Bir marta</option>
            <option value="weekly">Har hafta</option>
            <option value="monthly">Har oy</option>
          </select>
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <Button type="submit" className="w-full">
          <Plus className="size-4" /> To'lov qo'shish
        </Button>
      </form>
    </Modal>
  );
}

function Row({ label, value, sign, sub, bold }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-1 ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
      <span>
        {label}
        {sub && <span className="block text-xs font-normal text-slate-500">{sub}</span>}
      </span>
      <span className="shrink-0 tabular-nums">
        {sign}
        {money(value)}
      </span>
    </div>
  );
}

export default function DailyPlanCard() {
  const { transactions, debts, goals, profile, actions } = useStore();
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
      <Card className="bg-gradient-to-br from-emerald-50 to-white">
        <CardTitle icon={Wallet}>Bugun qancha sarflash rejam bor?</CardTitle>
        <p className="text-sm text-slate-600">{text}</p>
        <Button className="mt-3" onClick={() => setModal('setup')}>
          Ma'lumot kiritish (1 daqiqa)
        </Button>
        {modal === 'setup' && <PlanSetup onClose={() => setModal(null)} />}
      </Card>
    );
  }

  const deficit = plan.status === 'deficit';
  const used = plan.todayBudget > 0 ? plan.spentToday / plan.todayBudget : 0;

  return (
    <Card className={deficit ? 'bg-gradient-to-br from-amber-50 to-white ring-amber-200' : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white ring-emerald-700'}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Wallet className="size-4.5" aria-hidden /> Bugun sarflash rejam
        </h2>
        <Badge tone="green">Hisobi ochiq</Badge>
      </div>

      {deficit ? (
        <div className="mt-3">
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{money(plan.shortfall)} yetishmaydi</p>
          <p className="mt-1 text-sm text-slate-700">
            Daromad sanasigacha ({dateLabel(profile.nextIncome)}, {plan.days} kun) rejalangan to'lovlar, qarzlar va jamg'arma ajratmasi hozirgi pulingizdan ko'p. Kunlik summa chiqarmadim.
            To'lov sanalarini, jamg'arma ajratmasini yoki daromad sanasini tekshirib ko'ring.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-4xl font-extrabold tracking-tight tabular-nums"><AnimatedNumber value={Math.max(plan.leftToday, 0)} /></p>
          <p className="mt-1 text-sm text-emerald-50">
            {plan.leftToday >= 0
              ? `bugun uchun qoldi (reja: ${money(plan.todayBudget)})`
              : `Bugungi reja ${money(-plan.leftToday)} ga oshdi. Ertangi reja shunga qarab biroz o'zgaradi.`}
          </p>
          <Progress value={used} className="mt-3 bg-white/25" color={used > 1 ? 'bg-amber-300' : 'bg-white'} />
          <p className="mt-2 text-xs text-emerald-100">
            Bugun yozilgan: {money(plan.spentToday)} · daromad sanasigacha {plan.days} kun · o'rtacha {money(plan.perDay)} / kun
          </p>
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${deficit ? 'text-slate-700' : 'text-emerald-50'}`} aria-expanded={open}>
        <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} /> Hisob qanday chiqdi
      </button>

      {open && (
        <div className={`mt-2 rounded-xl p-3 text-sm ${deficit ? 'bg-white ring-1 ring-amber-200' : 'bg-white text-slate-800'}`}>
          <Row label="Hozirgi pul" sub={`${dateLabel(profile.cashDate)} da kiritgan summangiz va undan keyingi yozuvlar`} value={plan.cash} />
          <Row label="Zarur to'lovlar" sub={plan.bills.map((b) => `${b.name} ${dateLabel(b.date)}`).join(', ') || "yo'q"} value={plan.billsSum} sign="−" />
          <Row label="Qarz muddatlari" sub={plan.debtItems.map((d) => `${d.person} ${dateLabel(d.dueDate)}`).join(', ') || "yo'q"} value={plan.debtSum} sign="−" />
          <Row label="Jamg'arma ajratmasi" sub={profile.includeGoals ? plan.goalItems.map((g) => g.name).join(', ') || "yo'q" : "o'chirilgan"} value={plan.goalSum} sign="−" />
          <div className="my-1.5 border-t border-slate-200" />
          <Row label="Erkin pul" value={plan.remaining} bold />
          {!deficit && (
            <>
              <Row label={`÷ ${plan.days} kun (bugundan ${dateLabel(plan.lastDay)} gacha)`} value={plan.perDay} sign="= " />
              <Row label="Bugungi reja (bugun yozilgan xarajat qo'shib hisoblanadi)" value={plan.todayBudget} bold />
            </>
          )}
          <p className="mt-2 flex gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Natija siz kiritgan ma'lumotga tayanadi va kafolatlangan mablag' emas. Yozilmagan xarajatlar hisobga olinmaydi, shuning uchun haftada bir «Pulni yangilash» ni bosing. Muddatsiz qarzlar va sizga
            qaytariladigan pullar rejaga kirmaydi. Bankdan ma'lumot olinmaydi.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant={deficit ? 'outline' : 'ghost'} onClick={() => setModal('setup')}>
          <RefreshCw className="size-3.5" /> Pulni yangilash
        </Button>
        <Button size="sm" variant={deficit ? 'outline' : 'ghost'} onClick={() => setModal('bills')}>
          <ReceiptText className="size-3.5" /> Zarur to'lovlar ({profile.bills.length})
        </Button>
        <Button size="sm" variant={deficit ? 'outline' : 'ghost'} onClick={() => actions.updateProfile({ includeGoals: !profile.includeGoals })}>
          Jamg'arma: {profile.includeGoals ? 'hisobda' : "hisobda emas"}
        </Button>
      </div>

      {modal === 'setup' && <PlanSetup onClose={() => setModal(null)} />}
      {modal === 'bills' && <BillsModal onClose={() => setModal(null)} />}
    </Card>
  );
}
