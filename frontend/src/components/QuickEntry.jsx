import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Loader2, Plus, Undo2 } from 'lucide-react';
import { api } from '../lib/api';
import { EXPENSE_CATEGORIES, categoryLabel, matchCategory } from '../lib/categories';
import { formatDigitsInput, money, parseDigits, todayISO } from '../lib/format';
import { normalize } from '../lib/text';
import { useStore } from '../store';
import { Button, Card, CardTitle, MoneyInput, inputCls } from './ui';

const SELECTABLE_CATEGORIES = EXPENSE_CATEGORIES.filter((c) => c.id !== 'kunjami');

export default function QuickEntry() {
  const { transactions, actions } = useStore();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('oziq');
  const [showTitle, setShowTitle] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hint, setHint] = useState('');
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const inputRef = useRef(null);
  const receiptRef = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const { repeats, method } = useMemo(() => {
    const exp = transactions.filter((t) => t.type === 'expense' && t.category !== 'kunjami').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const names = new Set();
    const repeats = [];
    for (const t of exp) {
      const k = normalize(t.title);
      if (k && !names.has(k) && repeats.length < 3) {
        names.add(k);
        repeats.push({ title: t.title, amount: t.amount, category: t.category });
      }
    }
    return { repeats, method: exp[0]?.method || 'naqd' };
  }, [transactions]);

  const value = parseDigits(amount);

  const save = ({ category: catId, name, sum }) => {
    const t = {
      type: 'expense',
      title: (name || '').trim() || categoryLabel(catId),
      amount: sum,
      category: catId,
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

  const submitQuick = (e) => {
    e?.preventDefault();
    if (value <= 0) return setHint('Avval summani kiriting.');
    const typed = title.trim();
    const fromName = typed ? matchCategory(typed, 'expense') : null;
    save({ category: typed && fromName ? fromName : category, name: typed, sum: value });
  };

  const onScanReceipt = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 6 * 1024 * 1024) {
      setHint("Chek rasmi 6 MB dan kichik bo'lishi kerak.");
      return;
    }
    setScanning(true);
    setHint('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.scanReceipt({ imageBase64: String(reader.result || ''), mimeType: file.type || 'image/jpeg' });
        if (res?.ok && res.amount > 0) {
          setAmount(formatDigitsInput(res.amount));
          setTitle(res.title || '');
          setShowTitle(true);
          if (SELECTABLE_CATEGORIES.some((c) => c.id === res.category)) setCategory(res.category);
          setHint(`Chek o'qildi: ${res.title} (${money(res.amount)}). «Saqlash» ni bosing.`);
        } else {
          setHint("Chekdan summani aniqlab bo'lmadi, qo'lda kiriting.");
        }
      } catch {
        setHint("Chek skanerlashda server bilan bog'lanib bo'lmadi.");
      }
      setScanning(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardTitle
        icon={Plus}
        action={
          <select
            aria-label="Xarajat toifasi"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-plaster/15 bg-[#071633] px-2.5 py-1.5 text-xs font-semibold text-plaster/90 outline-none focus:border-turq"
          >
            {SELECTABLE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.uz}
              </option>
            ))}
          </select>
        }
      >
        Tez kiritish
      </CardTitle>

      <form onSubmit={submitQuick} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <MoneyInput
            ref={inputRef}
            className={`${inputCls} min-w-[140px] flex-1 text-lg font-semibold`}
            placeholder="Summa, masalan 12 000"
            aria-label="Xarajat summasi"
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setHint('');
            }}
          />
          <Button type="submit" className="shrink-0">
            <Plus className="size-4" /> Saqlash
          </Button>
        </div>

        {showTitle ? (
          <input className={inputCls} placeholder="Nomi (ixtiyoriy, masalan: kofe)" value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setShowTitle(true)} className="text-xs font-semibold text-plaster/55 hover:text-plaster">
              + Nom yozish (ixtiyoriy)
            </button>
            <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={onScanReceipt} />
            <button
              type="button"
              disabled={scanning}
              onClick={() => receiptRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-turq-soft hover:underline disabled:opacity-50"
            >
              {scanning ? <><Loader2 className="size-3.5 animate-spin" /> Chek o'qilmoqda...</> : <><Camera className="size-3.5" /> Chekni AI skanerlash</>}
            </button>
          </div>
        )}
      </form>

      {repeats.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-plaster/45 uppercase">Tezkor takrorlash</p>
          <div className="flex flex-wrap gap-1.5">
            {repeats.map((r) => (
              <button
                key={r.title}
                type="button"
                onClick={() => save({ category: r.category, name: r.title, sum: value > 0 ? value : r.amount })}
                className="rounded-xl border border-plaster/12 bg-[#071633] px-2.5 py-1 text-xs text-plaster/80 transition hover:border-ochre/40 hover:text-plaster"
              >
                {r.title} · {money(value > 0 ? value : r.amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      {hint && <p className="mt-2 text-sm text-[#F2C46B]">{hint}</p>}
      {toast && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-turq/30 bg-turq/15 px-3 py-2 text-sm text-turq-soft" role="status">
          <span className="flex items-center gap-2">
            <Check className="size-4" /> Saqlandi: {toast.text}
          </span>
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-plaster underline"
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
