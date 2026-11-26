import { useState } from 'react';
import { Calculator, Pencil, PiggyBank, Plus, Target, Trash2 } from 'lucide-react';
import GoalGame from '../components/GoalGame';
import { GoalStepLine } from '../components/Insights';
import { Badge, Button, Card, CardTitle, Empty, Estimate, Field, IconButton, Modal, Progress, inputCls } from '../components/ui';
import { addDays, dateLabel, money, percent, todayISO } from '../lib/format';
import { goalPlan, whatIf } from '../lib/finance';
import { useStore } from '../store';

const num = (s) => Number(String(s).replace(/\s/g, '')) || 0;
const digits = (s) => s.replace(/[^\d\s]/g, '');
const fmtW = (w) => w.toFixed(1);

function GoalForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({
    name: initial?.name || '',
    target: initial?.target ? String(initial.target) : '',
    saved: initial?.saved ? String(initial.saved) : '',
    deadline: initial?.deadline || addDays(todayISO(), 90),
  }));
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setError('Maqsad nomini kiriting.');
    if (num(f.target) <= 0) return setError('Maqsad summasini kiriting.');
    if (!f.deadline || f.deadline <= todayISO()) return setError("Sana bugundan keyin bo'lishi kerak.");
    onSave({ name: f.name.trim(), target: Math.round(num(f.target)), saved: Math.round(num(f.saved)), deadline: f.deadline });
    onClose();
  };

  return (
    <Modal title={initial?.id ? 'Maqsadni tahrirlash' : 'Yangi maqsad'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nima uchun yig'yapsiz">
          <input autoFocus className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Telefon, o'qish, uy..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kerakli summa">
            <input className={inputCls} inputMode="numeric" value={f.target} onChange={(e) => set('target', digits(e.target.value))} />
          </Field>
          <Field label="Hozir yig'ilgan">
            <input className={inputCls} inputMode="numeric" value={f.saved} onChange={(e) => set('saved', digits(e.target.value))} placeholder="0" />
          </Field>
        </div>
        <Field label="Qachongacha">
          <input type="date" className={inputCls} value={f.deadline} onChange={(e) => set('deadline', e.target.value)} />
        </Field>
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

function GoalCard({ goal, onEdit }) {
  const { actions } = useStore();
  const [amount, setAmount] = useState('');
  const p = goalPlan(goal, todayISO());

  const change = (sign) => {
    const v = num(amount);
    if (v <= 0) return;
    actions.addToGoal(goal.id, sign * Math.round(v));
    setAmount('');
  };

  const remove = () => window.confirm(`«${goal.name}» maqsadi o'chirilsinmi?`) && actions.deleteGoal(goal.id);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{goal.name}</h3>
          <p className="text-xs text-slate-500">Muddat: {dateLabel(goal.deadline)}</p>
        </div>
        <div className="flex">
          <IconButton label="Tahrirlash" icon={Pencil} onClick={() => onEdit(goal)} />
          <IconButton label="O'chirish" icon={Trash2} className="hover:bg-rose-50! hover:text-rose-600!" onClick={remove} />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between text-sm">
        <span className="font-bold tabular-nums text-slate-900">
          {money(goal.saved)} <span className="font-normal text-slate-400">/ {money(goal.target)}</span>
        </span>
        <span className="font-semibold text-emerald-600">{percent(p.progress)}</span>
      </div>
      <Progress className="mt-1.5 h-3" value={p.progress} />
      <GoalGame goal={goal} progress={p.progress} />

      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        {p.done && <p className="font-semibold text-emerald-700">Maqsadga yetdingiz!</p>}
        {p.overdue && <p className="text-rose-700">Muddat o'tdi, yana {money(p.remaining)} kerak. Tahrirlab yangi sana qo'ying.</p>}
        {p.daysLeft > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-slate-600">
                Yana <b>{money(p.remaining)}</b>, {p.daysLeft} kun qoldi
              </span>
              <Estimate />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Kuniga', p.perDay],
                ['Haftasiga', p.perWeek],
                ['Oyiga', p.perMonth],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-white px-2 py-2 ring-1 ring-slate-200/70">
                  <div className="text-[11px] text-slate-500">{l}</div>
                  <div className="text-sm font-bold tabular-nums">{money(v)}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Hisob: {money(p.remaining)} ÷ {fmtW(p.weeks)} hafta = {money(p.perWeek)}. Oyiga: {money(p.remaining)} ÷ {p.months.toFixed(1)} oy. Har hafta bir xil summa
              yig'ilsa shunday bo'ladi.
            </p>
          </>
        )}
      </div>

      <GoalStepLine goal={goal} />

      <div className="mt-3 flex gap-2">
        <input className={`${inputCls} flex-1`} inputMode="numeric" placeholder="Summa" value={amount} onChange={(e) => setAmount(digits(e.target.value))} />
        <Button variant="outline" onClick={() => change(1)}>
          Qo'shish
        </Button>
        <Button variant="ghost" onClick={() => change(-1)}>
          Ayirish
        </Button>
      </div>
    </Card>
  );
}

function WhatIfCard({ goals }) {
  const [goalId, setGoalId] = useState(goals[0]?.id || '');
  const [spend, setSpend] = useState('');
  const [capacity, setCapacity] = useState('');
  const goal = goals.find((g) => g.id === goalId) || goals[0];
  const today = todayISO();
  const r = goal && num(spend) > 0 ? whatIf(goal, num(spend), today, num(capacity)) : null;

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-white">
      <CardTitle icon={Calculator} action={<Estimate />}>
        Agar shu pulni sarflasam-chi?
      </CardTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Maqsad">
          <select className={inputCls} value={goal?.id} onChange={(e) => setGoalId(e.target.value)}>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sarflamoqchi bo'lgan summa">
          <input className={inputCls} inputMode="numeric" value={spend} onChange={(e) => setSpend(digits(e.target.value))} placeholder="masalan 300 000" />
        </Field>
        <Field label="Haftasiga qancha yig'a olasiz" hint="Ixtiyoriy. Bo'sh bo'lsa, rejadagi summa olinadi.">
          <input className={inputCls} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(digits(e.target.value))} />
        </Field>
      </div>

      {r && (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            Bu summa «{goal.name}» maqsadining <b>{percent(r.shareOfTarget)}</b> qismi. Yig'ish kerak bo'lgan pul {money(r.remaining)} dan{' '}
            <b>{money(r.newRemaining)}</b> ga oshadi.
          </p>
          {r.perWeekAfter != null && (
            <p>
              Muddatni saqlash uchun haftalik jamg'arma: {money(r.perWeekBefore)} → <b>{money(r.perWeekAfter)}</b> (+{money(r.perWeekAfter - r.perWeekBefore)}).
            </p>
          )}
          {r.pace > 0 && (
            <p>
              Haftasiga {money(r.pace)} yig'sangiz ({r.paceFromUser ? 'siz kiritgan summa' : 'rejadagi summa'}), maqsad <b>{r.delayDays} kun</b> kechroq bo'ladi:{' '}
              {dateLabel(r.finishBefore)} o'rniga {dateLabel(r.finishAfter)}.
            </p>
          )}
          <p className="text-xs text-slate-500">Hisob: kechikish = summa ÷ haftalik jamg'arma × 7 kun. Daromad va xarajat o'zgarsa, natija ham o'zgaradi.</p>
        </div>
      )}
    </Card>
  );
}

export default function Goals() {
  const { goals, actions } = useStore();
  const [form, setForm] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Maqsadlar</h1>
        <Button onClick={() => setForm({})}>
          <Plus className="size-4" /> Maqsad ochish
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <Empty icon={Target} title="Hali maqsad yo'q" text="Telefon, o'qish, uy yoki boshqa narsa uchun summa va sanani kiriting. Haftasiga va oyiga qancha yig'ish kerakligini aniq hisoblaymiz.">
            <Button onClick={() => setForm({})}>Birinchi maqsad</Button>
          </Empty>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={setForm} />
            ))}
          </div>
          <WhatIfCard goals={goals} />
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <PiggyBank className="size-4" aria-hidden />
        Jamg'arma xarajat sifatida hisoblanmaydi. Yig'ilgan pulni o'zingiz qo'shasiz. <Badge>Mizan pulni saqlamaydi</Badge>
      </p>

      {form && (
        <GoalForm
          initial={form}
          onSave={(data) => (form.id ? actions.updateGoal(form.id, data) : actions.addGoal(data))}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
