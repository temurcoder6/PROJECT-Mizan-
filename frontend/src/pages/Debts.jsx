import { useState } from 'react';
import { Bell, BellOff, CalendarClock, HandCoins, Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import RecurringCard from '../components/RecurringCard';
import { Badge, Button, Card, CardTitle, Empty, Field, IconButton, Modal, Progress, Segmented, inputCls } from '../components/ui';
import { addDays, dateLabel, money, todayISO } from '../lib/format';
import { debtPaid, debtPlan, debtRemaining, debtStatus, debtTotals } from '../lib/finance';
import { useStore } from '../store';

function DebtForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    direction: 'lent',
    person: '',
    date: todayISO(),
    dueDate: '',
    note: '',
    remind: true,
    ...initial,
    amount: initial?.amount ? String(initial.amount) : '',
  }));
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(f.amount.replace(/\s/g, ''));
    if (!f.person.trim()) return setError('Ismni kiriting.');
    if (!amount || amount <= 0) return setError("Summani to'g'ri kiriting.");
    if (f.dueDate && f.dueDate < f.date) return setError("Qaytarish muddati qarz sanasidan oldin bo'lishi mumkin emas.");
    onSave({ direction: f.direction, person: f.person.trim(), amount: Math.round(amount), date: f.date, dueDate: f.dueDate, note: f.note.trim(), remind: f.remind });
    onClose();
  };

  return (
    <Modal title={initial?.id ? 'Qarzni tahrirlash' : 'Yangi qarz'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full"
          value={f.direction}
          onChange={(v) => set('direction', v)}
          options={[
            { value: 'lent', label: 'Men berdim' },
            { value: 'borrowed', label: 'Men oldim' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label={f.direction === 'lent' ? 'Kimga berdingiz' : 'Kimdan oldingiz'} className="col-span-2 sm:col-span-1">
            <input autoFocus className={inputCls} value={f.person} onChange={(e) => set('person', e.target.value)} placeholder="Ism" />
          </Field>
          <Field label="Summa (so'm)" className="col-span-2 sm:col-span-1">
            <input className={inputCls} inputMode="numeric" value={f.amount} onChange={(e) => set('amount', e.target.value.replace(/[^\d\s]/g, ''))} />
          </Field>
          <Field label="Sana">
            <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Qaytarish muddati">
            <input type="date" className={inputCls} value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>
        <Field label="Izoh (ixtiyoriy)">
          <input className={inputCls} value={f.note} onChange={(e) => set('note', e.target.value)} />
        </Field>
        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-emerald-600" checked={f.remind} onChange={(e) => set('remind', e.target.checked)} />
          Muddat yaqinlashganda ilova ichida eslatish
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

function StatusBadge({ status }) {
  if (status.kind === 'closed') return <Badge tone="green">Yopilgan</Badge>;
  if (status.kind === 'overdue') return <Badge tone="red">{-status.days} kun kechikdi</Badge>;
  if (status.kind === 'soon') return <Badge tone="amber">{status.days === 0 ? 'Bugun' : `${status.days} kun qoldi`}</Badge>;
  if (status.days != null) return <Badge tone="slate">{status.days} kun qoldi</Badge>;
  return <Badge tone="slate">Muddatsiz</Badge>;
}

function DebtCard({ debt, onEdit }) {
  const { actions, settings } = useStore();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');
  const remaining = debtRemaining(debt);
  const plan = debtPlan(debt, todayISO());
  const paid = debtPaid(debt);
  const status = debtStatus(debt, todayISO(), Math.max(settings.remindDays, 7));
  const lent = debt.direction === 'lent';

  const addPayment = (e) => {
    e.preventDefault();
    const v = Number(amount.replace(/\s/g, ''));
    if (!v || v <= 0) return setError('Summani kiriting.');
    if (v > remaining) return setError(`Qoldiqdan ko'p: qoldiq ${money(remaining)}.`);
    actions.addPayment(debt.id, { amount: Math.round(v), date });
    setAmount('');
    setError('');
  };

  const remove = () => {
    if (window.confirm(`${debt.person} bilan qarz yozuvi o'chirilsinmi? Qaytarilgan pullar tarixi ham o'chadi.`)) actions.deleteDebt(debt.id);
  };

  return (
    <Card className={status.kind === 'overdue' ? 'ring-rose-200' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{debt.person}</h3>
            <Badge tone={lent ? 'green' : 'red'}>{lent ? 'Menga qaytaradi' : 'Men qaytaraman'}</Badge>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500">
            {dateLabel(debt.date)} da {lent ? 'berilgan' : 'olingan'}
            {debt.dueDate && ` · muddat ${dateLabel(debt.dueDate)}`}
            {debt.note && ` · ${debt.note}`}
          </p>
        </div>
        <div className="flex shrink-0">
          <IconButton
            label={debt.remind ? "Eslatmani o'chirish" : 'Eslatmani yoqish'}
            icon={debt.remind ? Bell : BellOff}
            className={debt.remind ? 'text-emerald-600' : ''}
            onClick={() => actions.updateDebt(debt.id, { remind: !debt.remind })}
          />
          <IconButton label="Tahrirlash" icon={Pencil} onClick={() => onEdit(debt)} />
          <IconButton label="O'chirish" icon={Trash2} className="hover:bg-rose-50! hover:text-rose-600!" onClick={remove} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-slate-500">Jami</div>
          <div className="font-semibold tabular-nums">{money(debt.amount)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Qaytarildi</div>
          <div className="font-semibold tabular-nums text-emerald-600">{money(paid)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Qoldiq</div>
          <div className="font-bold tabular-nums">{money(remaining)}</div>
        </div>
      </div>
      <Progress className="mt-2" value={debt.amount ? paid / debt.amount : 0} color={lent ? 'bg-emerald-500' : 'bg-rose-500'} />

      {plan && !plan.overdue && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">
            {lent ? 'Qaytarilishi kutiladigan jadval' : "To'lov jadvali"}: {plan.weeks} ta teng to'lov
          </p>
          <ul className="mt-1 space-y-0.5 tabular-nums">
            {plan.installments.slice(0, 3).map((i) => (
              <li key={i.date} className="flex justify-between">
                <span>{dateLabel(i.date)}</span>
                <span className="font-semibold">{money(i.amount)}</span>
              </li>
            ))}
            {plan.installments.length > 3 && <li className="text-slate-500">... yana {plan.installments.length - 3} ta, oxirgisi {dateLabel(debt.dueDate)} da</li>}
          </ul>
          <p className="mt-1 text-slate-500">Hisob: {money(plan.remaining)} ÷ {plan.weeks} hafta (muddatgacha {plan.days} kun).</p>
        </div>
      )}
      {plan?.overdue && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">Muddat o'tgan. Jadval tuzish uchun qaytarish muddatini yangilang.</p>}

      {debt.payments?.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {debt.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
              <span className="text-slate-600">{dateLabel(p.date)} — qaytarildi</span>
              <span className="flex items-center gap-1 font-semibold tabular-nums">
                {money(p.amount)}
                <IconButton label="To'lovni o'chirish" icon={X} className="size-7" onClick={() => actions.deletePayment(debt.id, p.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <form onSubmit={addPayment} className="mt-3 flex flex-wrap gap-2">
          <input className={`${inputCls} min-w-28 flex-1`} inputMode="numeric" placeholder="Qaytarilgan summa" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))} />
          <input type="date" className={`${inputCls} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
          <Button type="submit" variant="outline">
            Qo'shish
          </Button>
          <Button variant="ghost" onClick={() => actions.addPayment(debt.id, { amount: remaining, date })}>
            To'liq qaytarildi
          </Button>
          {error && <p className="w-full text-sm text-rose-600">{error}</p>}
        </form>
      )}
    </Card>
  );
}

function DebtPlanCard({ debts }) {
  const today = todayISO();
  const weekEnd = addDays(today, 7);
  const rows = debts
    .filter((d) => d.direction === 'borrowed')
    .map((d) => ({ d, plan: debtPlan(d, today) }))
    .filter((r) => r.plan && !r.plan.overdue)
    .sort((a, b) => a.d.dueDate.localeCompare(b.d.dueDate));
  if (!rows.length) return null;
  const thisWeek = rows.reduce((s, r) => s + r.plan.installments.filter((i) => i.date <= weekEnd).reduce((x, i) => x + i.amount, 0), 0);
  return (
    <Card>
      <CardTitle icon={CalendarClock}>Qarzni oldindan rejalash</CardTitle>
      <p className="text-sm text-slate-600">
        Men qaytarishim kerak bo'lgan qarzlar muddatigacha teng haftalik to'lovlarga bo'lindi. Shu hafta (7 kun ichida) ajratib qo'yish kerak: <b className="tabular-nums">{money(thisWeek)}</b>.
      </p>
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {rows.map(({ d, plan }) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <b>{d.person}</b> <span className="text-slate-500">· muddat {dateLabel(d.dueDate)}</span>
              <span className="block text-xs text-slate-500">{plan.weeks} hafta, har hafta {money(plan.base)}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{money(plan.remaining)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Bu rejalar kunlik rejaga ham ta'sir qiladi: daromad sanasigacha muddati kelgan qarz u yerda ajratib qo'yiladi.</p>
    </Card>
  );
}

export default function Debts() {
  const { debts, actions } = useStore();
  const [filter, setFilter] = useState('open');
  const [form, setForm] = useState(null);
  const open = debts.filter((d) => debtRemaining(d) > 0);
  const { owedToMe, iOwe } = debtTotals(open);
  const list = debts
    .filter((d) => (filter === 'all' ? true : filter === 'open' ? debtRemaining(d) > 0 : debtRemaining(d) === 0))
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Qarz daftari</h1>
        <Button onClick={() => setForm({})}>
          <Plus className="size-4" /> Qarz yozish
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">Menga qaytarilishi kerak</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{money(owedToMe)}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">Men qaytarishim kerak</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{money(iOwe)}</div>
        </div>
      </div>

      <DebtPlanCard debts={open} />
      <RecurringCard />

      <p className="flex gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Mizan qarz bermaydi, qarz undirmaydi va to'lov qilmaydi. U faqat siz yozgan qarzlarni hisoblaydi va eslatadi.
      </p>

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'open', label: `Ochiq (${open.length})` },
          { value: 'closed', label: 'Yopilgan' },
          { value: 'all', label: 'Hammasi' },
        ]}
      />

      {list.length === 0 ? (
        <Card>
          <Empty icon={HandCoins} title={filter === 'open' ? "Ochiq qarz yo'q" : "Yozuv yo'q"} text="Kimga qarz berganingiz yoki kimdan olganingizni yozing — qoldiq va muddatni kuzatamiz." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((d) => (
            <DebtCard key={d.id} debt={d} onEdit={setForm} />
          ))}
        </div>
      )}

      {form && (
        <DebtForm
          initial={form}
          onSave={(data) => (form.id ? actions.updateDebt(form.id, data) : actions.addDebt(data))}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
