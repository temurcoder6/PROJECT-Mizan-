import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, categoryLabel, matchCategory } from '../lib/categories';
import { formatDigitsInput, parseDigits, todayISO } from '../lib/format';
import { Button, Field, Modal, MoneyInput, Segmented, inputCls } from './ui';

export default function TransactionForm({ initial, onSave, onClose }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({
    type: 'expense',
    title: '',
    category: initial?.type === 'income' ? 'maosh' : 'oziq',
    date: todayISO(),
    method: 'naqd',
    planned: true,
    note: '',
    ...initial,
    amount: initial?.amount ? formatDigitsInput(Math.round(initial.amount)) : '',
  }));
  const [catTouched, setCatTouched] = useState(editing);
  const [error, setError] = useState('');

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const cats = f.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const onTitle = (title) => {
    setF((s) => {
      const guess = !catTouched && matchCategory(title, s.type);
      return { ...s, title, category: guess || s.category };
    });
  };

  const onType = (type) => {
    setF((s) => ({ ...s, type, category: matchCategory(s.title, type) || (type === 'income' ? 'maosh' : 'oziq') }));
    setCatTouched(false);
  };

  const submit = (e) => {
    e.preventDefault();
    const amount = parseDigits(f.amount);
    if (!amount || amount <= 0) return setError("Summani to'g'ri kiriting.");
    if (!f.date) return setError('Sanani tanlang.');
    onSave({
      type: f.type,
      title: f.title.trim() || categoryLabel(f.category),
      amount: Math.round(amount),
      category: f.category,
      date: f.date,
      method: f.method,
      planned: f.type === 'income' ? true : f.planned,
      note: f.note.trim(),
    });
    onClose();
  };

  return (
    <Modal title={editing ? 'Yozuvni tahrirlash' : f.type === 'income' ? "Daromad qo'shish" : "Xarajat qo'shish"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full"
          value={f.type}
          onChange={onType}
          options={[
            { value: 'expense', label: 'Xarajat' },
            { value: 'income', label: 'Daromad' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label={f.type === 'income' ? 'Qayerdan' : 'Nima uchun'} className="col-span-2 sm:col-span-1">
            <input autoFocus className={inputCls} value={f.title} onChange={(e) => onTitle(e.target.value)} placeholder={f.type === 'income' ? 'masalan: maosh' : 'masalan: non, taksi'} />
          </Field>
          <Field label="Summa (so'm)" className="col-span-2 sm:col-span-1">
            <MoneyInput value={f.amount} onChange={(v) => set('amount', v)} placeholder="12 000" />
          </Field>
          <Field label="Toifa" hint={!catTouched && f.title ? "Nomidan avtomatik tanlandi, o'zgartirish mumkin." : undefined} className="col-span-2">
            <select
              className={inputCls}
              value={f.category}
              onChange={(e) => {
                set('category', e.target.value);
                setCatTouched(true);
              }}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.uz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sana">
            <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="To'lov usuli">
            <select className={inputCls} value={f.method} onChange={(e) => set('method', e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.uz}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {f.type === 'expense' && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-plaster/55 uppercase">Xarajat turi</span>
            <Segmented
              className="w-full"
              value={f.planned ? 'planned' : 'unplanned'}
              onChange={(v) => set('planned', v === 'planned')}
              options={[
                { value: 'planned', label: 'Rejalangan' },
                { value: 'unplanned', label: 'Kutilmagan' },
              ]}
            />
          </div>
        )}
        <Field label="Izoh (ixtiyoriy)">
          <textarea className={`${inputCls} min-h-18`} value={f.note} onChange={(e) => set('note', e.target.value)} />
        </Field>
        {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
        <div className="flex gap-2 pt-1">
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
