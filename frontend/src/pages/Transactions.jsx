import { useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, Minus, Plus, Search } from 'lucide-react';
import TransactionForm from '../components/TransactionForm';
import TxRow from '../components/TxRow';
import { Button, Card, Empty, IconButton, Segmented, inputCls } from '../components/ui';
import { byDateDesc, dateLabel, monthLabel, money, shiftMonth, todayISO } from '../lib/format';
import { inRange, periodRange, summarize } from '../lib/finance';
import { useStore } from '../store';

export default function Transactions() {
  const { transactions, actions } = useStore();
  const [ref, setRef] = useState(() => `${todayISO().slice(0, 8)}01`);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(80);

  const { from, to } = periodRange('month', ref);
  const inMonth = inRange(transactions, from, to);
  const s = summarize(inMonth);
  const needle = query.trim().toLowerCase();
  const all = inMonth
    .filter((t) => (filter === 'all' || t.type === filter) && (!needle || `${t.title} ${t.category} ${t.note || ''}`.toLowerCase().includes(needle)))
    .sort(byDateDesc);
  // Ko'p yozuv bo'lsa hammasini birdan chizmaymiz: sahifa qotmasligi uchun bo'laklab ko'rsatiladi.
  const list = all.slice(0, limit);

  const groups = [];
  for (const t of list) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  }

  const remove = (t) => {
    if (window.confirm(`«${t.title}» (${money(t.amount)}) o'chirilsinmi?`)) actions.deleteTx(t.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster">Yozuvlar</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setForm({ type: 'income' })}>
            <Plus className="size-4" /> Daromad
          </Button>
          <Button onClick={() => setForm({ type: 'expense' })}>
            <Minus className="size-4" /> Xarajat
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[20rem_1fr] xl:items-start">
      <Card className="flex flex-wrap items-center justify-between gap-3 xl:sticky xl:top-20 xl:flex-col xl:items-stretch xl:gap-3.5">
        <div className="flex items-center gap-1 xl:justify-between">
          <IconButton label="Oldingi oy" icon={ChevronLeft} onClick={() => setRef(shiftMonth(ref, -1))} />
          <span className="min-w-32 text-center font-semibold text-plaster">{monthLabel(ref)}</span>
          <IconButton label="Keyingi oy" icon={ChevronRight} onClick={() => setRef(shiftMonth(ref, 1))} />
        </div>
        <div className="flex gap-4 text-sm tabular-nums xl:justify-between">
          <span className="text-turq-soft">+{money(s.income)}</span>
          <span className="text-plaster/80">−{money(s.expense)}</span>
        </div>
        <label className="relative block w-full sm:w-48 xl:w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-plaster/45" />
          <input type="search" aria-label="Yozuvlardan qidirish" placeholder="Qidirish" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(80); }} className={`${inputCls} pl-8`} />
        </label>
        <Segmented
          className="xl:flex"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Hammasi' },
            { value: 'expense', label: 'Xarajat' },
            { value: 'income', label: 'Daromad' },
          ]}
        />
      </Card>

      <Card>
        {groups.length === 0 ? (
          <Empty icon={ListChecks} title="Bu oyda yozuv yo'q" text="Yuqoridagi tugma bilan qo'shing yoki yordamchiga yozing." />
        ) : (
          groups.map((g) => (
            <div key={g.date} className="mb-2 last:mb-0">
              <div className="sticky top-16 z-[1] -mx-1 rounded bg-[#081734]/95 px-2 py-1 text-xs font-semibold tracking-wide text-ochre uppercase backdrop-blur">
                {dateLabel(g.date)}
              </div>
              <ul className="divide-y divide-plaster/10">
                {g.items.map((t) => (
                  <TxRow key={t.id} tx={t} showDate={false} onEdit={setForm} onDelete={remove} />
                ))}
              </ul>
            </div>
          ))
        )}
        {all.length > list.length && (
          <div className="mt-3 text-center">
            <Button variant="outline" onClick={() => setLimit((n) => n + 120)}>Yana ko'rsatish ({all.length - list.length} ta qoldi)</Button>
          </div>
        )}
      </Card>
      </div>

      {form && (
        <TransactionForm
          initial={form}
          onSave={(data) => (form.id ? actions.updateTx(form.id, data) : actions.addTx(data))}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
