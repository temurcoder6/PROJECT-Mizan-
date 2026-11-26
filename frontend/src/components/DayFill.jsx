import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../lib/categories';
import { dateLabel, monthLabel, parseISODate, shiftMonth, toISODate, todayISO } from '../lib/format';
import { daysWithEntries, firstEntryDate, missingDays } from '../lib/plan';
import { useStore } from '../store';
import TxRow from './TxRow';
import { Button, Card, CardTitle, Field, IconButton, Modal, inputCls } from './ui';

export function DayModal({ date, onClose }) {
  const { transactions, profile, actions } = useStore();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('kunjami');
  const [error, setError] = useState('');
  const entries = transactions.filter((t) => t.date === date);
  const expenses = entries.filter((t) => t.type === 'expense');
  const marked = profile.noSpend.includes(date);

  const save = (e) => {
    e.preventDefault();
    const v = Number(amount.replace(/\s/g, ''));
    if (!v || v <= 0) return setError('Summani kiriting.');
    actions.addTx({ type: 'expense', title: category === 'kunjami' ? 'Kun jami' : EXPENSE_CATEGORIES.find((c) => c.id === category).uz, amount: Math.round(v), category, date, method: 'naqd', planned: true, note: '', dayTotal: true });
    setAmount('');
    setError('');
  };

  return (
    <Modal title={dateLabel(date)} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">
        Mayda xarajatlarni alohida yozish shart emas. Shu kun uchun umumiy summani kiritsangiz yetadi.
      </p>
      {entries.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
          {entries.map((t) => (
            <TxRow key={t.id} tx={t} showDate={false} onDelete={(x) => actions.deleteTx(x.id)} />
          ))}
        </ul>
      )}
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shu kun jami (so'm)">
            <input autoFocus className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="masalan 85 000" />
          </Field>
          <Field label="Toifa">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.uz}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Saqlash</Button>
          {expenses.length === 0 && (
            <Button variant="outline" onClick={() => actions.toggleNoSpend(date)}>
              {marked ? "«Xarajat bo'lmadi» belgisini olib tashlash" : "Bu kuni xarajat bo'lmadi"}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CalendarModal({ onClose, onPick }) {
  const { transactions, profile } = useStore();
  const today = todayISO();
  const [ref, setRef] = useState(`${today.slice(0, 8)}01`);
  const has = useMemo(() => daysWithEntries(transactions), [transactions]);
  const first = firstEntryDate(transactions);
  const noSpend = new Set(profile.noSpend);

  const start = parseISODate(ref);
  const lead = (start.getDay() + 6) % 7;
  const total = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => toISODate(new Date(start.getFullYear(), start.getMonth(), i + 1)))];

  return (
    <Modal title="Kunlar kalendari" onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <IconButton label="Oldingi oy" icon={ChevronLeft} onClick={() => setRef(shiftMonth(ref, -1))} />
        <span className="font-semibold">{monthLabel(ref)}</span>
        <IconButton label="Keyingi oy" icon={ChevronRight} onClick={() => setRef(shiftMonth(ref, 1))} />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
        {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const future = d > today;
          const filled = has.has(d);
          const none = noSpend.has(d);
          const missing = !future && !filled && !none && first && d >= first && d < today;
          return (
            <button
              key={d}
              type="button"
              disabled={future}
              onClick={() => onPick(d)}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition ${
                future ? 'text-slate-300' : filled ? 'bg-emerald-100 text-emerald-800' : none ? 'bg-slate-100 text-slate-500' : missing ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'text-slate-600 hover:bg-slate-100'
              } ${d === today ? 'outline-2 outline-emerald-600' : ''}`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-emerald-100" /> yozilgan</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-amber-50 ring-1 ring-amber-200" /> yozilmagan</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-slate-100" /> xarajat bo'lmagan</span>
      </div>
    </Modal>
  );
}

export function MissingDaysCard() {
  const { transactions, profile } = useStore();
  const today = todayISO();
  const [day, setDay] = useState(null);
  const [cal, setCal] = useState(false);
  const missing = useMemo(() => missingDays(transactions, profile.noSpend, today), [transactions, profile.noSpend, today]);
  const todayEmpty = !daysWithEntries(transactions).has(today) && !profile.noSpend.includes(today);

  return (
    <Card>
      <CardTitle icon={CalendarDays} action={<Button size="sm" variant="subtle" onClick={() => setCal(true)}>Kalendar</Button>}>
        Unutilgan kunni to'ldirish
      </CardTitle>
      {missing.length === 0 ? (
        <p className="text-sm text-slate-600">So'nggi 7 kunda yozilmagan kun yo'q. Xohlagan kunni kalendardan ochib, umumiy summani qo'shishingiz mumkin.</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">Bu kunlar uchun yozuv yo'q. Xohlasangiz, umumiy summani kiriting. Shart emas.</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((d) => (
              <button key={d} type="button" onClick={() => setDay(d)} className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100">
                {dateLabel(d)}
              </button>
            ))}
          </div>
        </>
      )}
      {todayEmpty && (
        <button type="button" onClick={() => setDay(today)} className="mt-3 text-sm font-semibold text-emerald-700 underline">
          Bugun uchun jami summa yoki «xarajat bo'lmadi»
        </button>
      )}
      {day && <DayModal date={day} onClose={() => setDay(null)} />}
      {cal && (
        <CalendarModal
          onClose={() => setCal(false)}
          onPick={(d) => {
            setCal(false);
            setDay(d);
          }}
        />
      )}
    </Card>
  );
}
