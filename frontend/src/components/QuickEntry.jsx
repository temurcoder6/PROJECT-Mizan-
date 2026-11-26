import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Undo2 } from 'lucide-react';
import { categoryLabel, categoryOf, matchCategory } from '../lib/categories';
import { money, todayISO } from '../lib/format';
import { normalize } from '../lib/text';
import { useStore } from '../store';
import { Card, CardTitle, inputCls } from './ui';

const DEFAULTS = ['oziq', 'transport', 'bozor', 'kommunal', 'salomatlik', 'boshqa'];

export default function QuickEntry() {
  const { transactions, actions } = useStore();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [showTitle, setShowTitle] = useState(false);
  const [hint, setHint] = useState('');
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const { cats, repeats, method } = useMemo(() => {
    const exp = transactions.filter((t) => t.type === 'expense' && t.category !== 'kunjami').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const seen = new Set();
    const cats = [];
    const lastTitle = {};
    for (const t of exp) {
      if (!(t.category in lastTitle)) lastTitle[t.category] = t.title;
      if (!seen.has(t.category) && cats.length < 6) {
        seen.add(t.category);
        cats.push(t.category);
      }
    }
    for (const id of DEFAULTS) if (cats.length < 6 && !seen.has(id)) cats.push(id);
    const names = new Set();
    const repeats = [];
    for (const t of exp) {
      const k = normalize(t.title);
      if (k && !names.has(k) && repeats.length < 4) {
        names.add(k);
        repeats.push({ title: t.title, amount: t.amount, category: t.category });
      }
    }
    return { cats: cats.map((id) => ({ id, last: lastTitle[id] })), repeats, method: exp[0]?.method || 'naqd' };
  }, [transactions]);

  const value = Number(amount.replace(/\s/g, '')) || 0;

  const save = ({ category, name, sum }) => {
    const t = {
      type: 'expense',
      title: (name || '').trim() || categoryLabel(category),
      amount: sum,
      category,
      date: todayISO(),
      method,
      planned: true,
      note: '',
    };
    const id = actions.addTx(t);
    setToast({ id, text: `${t.title} · ${money(sum)}` });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 7000);
    setAmount('');
    setTitle('');
    setHint('');
    inputRef.current?.focus();
  };

  const pickCategory = (c) => {
    if (value <= 0) return setHint('Avval summani yozing, keyin toifani bosing.');
    const typed = title.trim();
    // A typed name that clearly matches another category wins over the chip the user tapped.
    const fromName = typed ? matchCategory(typed, 'expense') : null;
    save({ category: typed && fromName ? fromName : c.id, name: typed || c.last, sum: value });
  };

  return (
    <Card>
      <CardTitle icon={Plus}>Tez kiritish</CardTitle>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className={`${inputCls} text-lg font-semibold`}
          inputMode="numeric"
          placeholder="Summa, masalan 12 000"
          aria-label="Xarajat summasi"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^\d\s]/g, ''));
            setHint('');
          }}
        />
      </div>
      {showTitle ? (
        <input className={`${inputCls} mt-2`} placeholder="Nomi (ixtiyoriy)" value={title} onChange={(e) => setTitle(e.target.value)} />
      ) : (
        <button type="button" onClick={() => setShowTitle(true)} className="mt-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          + Nom yozish (shart emas)
        </button>
      )}

      <p className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">Toifani bosing, saqlanadi</p>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => {
          const cat = categoryOf(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCategory(c)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition active:scale-95"
              style={{ background: `${cat.color}14`, color: cat.color, boxShadow: `inset 0 0 0 1px ${cat.color}40` }}
            >
              <span className="size-2 rounded-full" style={{ background: cat.color }} />
              {cat.uz}
            </button>
          );
        })}
      </div>

      {repeats.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">Yaqinda yozilganlar (bir bosishda takrorlash)</p>
          <div className="flex flex-wrap gap-2">
            {repeats.map((r) => (
              <button
                key={r.title}
                type="button"
                onClick={() => save({ category: r.category, name: r.title, sum: value > 0 ? value : r.amount })}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200 active:scale-95"
              >
                {r.title} · {money(value > 0 ? value : r.amount)}
              </button>
            ))}
          </div>
        </>
      )}

      {hint && <p className="mt-2 text-sm text-amber-700">{hint}</p>}
      {toast && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          <span className="flex items-center gap-2">
            <Check className="size-4" /> Saqlandi: {toast.text}
          </span>
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-emerald-800 underline"
            onClick={() => {
              actions.deleteTx(toast.id);
              setToast(null);
            }}
          >
            <Undo2 className="size-3.5" /> Bekor qilish
          </button>
        </div>
      )}
    </Card>
  );
}
