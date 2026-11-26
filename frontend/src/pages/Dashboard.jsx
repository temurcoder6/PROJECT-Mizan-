import { useState } from 'react';
import { Bell, ChartColumn, Minus, PiggyBank, Plus, Repeat, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import AdviceCard from '../components/AdviceCard';
import DailyPlanCard from '../components/DailyPlan';
import { MissingDaysCard } from '../components/DayFill';
import { GoalStepLine, ReminderCard, WeeklyCard } from '../components/Insights';
import QuickEntry from '../components/QuickEntry';
import TransactionForm from '../components/TransactionForm';
import TxRow from '../components/TxRow';
import { Button, Card, CardTitle, Empty, Estimate, Progress, Stat } from '../components/ui';
import { categoryOf } from '../lib/categories';
import { byDateDesc, dateLabel, monthLabel, money, percent, todayISO } from '../lib/format';
import {
  debtRemaining, detectRecurring, dueReminders, frequencyLabel, goalPlan, inRange, periodRange, summarize,
} from '../lib/finance';
import { useStore } from '../store';

export default function Dashboard({ go }) {
  const { transactions, debts, goals, settings, actions } = useStore();
  const [form, setForm] = useState(null);
  const today = todayISO();
  const month = periodRange('month', today);
  const week = periodRange('week', today);
  const ms = summarize(inRange(transactions, month.from, month.to));
  const ws = summarize(inRange(transactions, week.from, week.to));
  const habits = detectRecurring(transactions, today).slice(0, 3);
  const reminders = dueReminders(debts, today, settings.remindDays);
  const recent = [...transactions].sort(byDateDesc).slice(0, 5);
  const empty = !transactions.length && !debts.length && !goals.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{monthLabel(today)}</p>
          <h1 className="text-2xl font-bold text-slate-900">Pulingiz holati</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setForm({ type: 'income' })}>
            <Plus className="size-4" /> Daromad
          </Button>
          <Button onClick={() => setForm({ type: 'expense' })}>
            <Minus className="size-4" /> Xarajat
          </Button>
        </div>
      </div>

      {empty && (
        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <CardTitle icon={Sparkles}>Xush kelibsiz!</CardTitle>
          <p className="text-sm text-slate-600">
            Birinchi xarajatingizni qo'shing yoki yordamchiga yozing: «bugun yo'lga 12 ming sarfladim». Ilovani tez ko'rish uchun namuna
            ma'lumot yuklashingiz mumkin, keyin uni bir tugma bilan o'chirasiz.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setForm({ type: 'expense' })}>Xarajat qo'shish</Button>
            <Button variant="outline" onClick={actions.loadSample}>
              Namuna ma'lumot bilan sinash
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyPlanCard />
        <QuickEntry />
      </div>
      <ReminderCard />
      <MissingDaysCard />

      {reminders.length > 0 && (
        <Card className="bg-amber-50/60 ring-amber-200">
          <CardTitle icon={Bell} action={<Button variant="subtle" size="sm" onClick={() => go('qarzlar')}>Qarzlar</Button>}>
            Qarz eslatmalari
          </CardTitle>
          <ul className="space-y-1.5 text-sm">
            {reminders.map((d) => {
              const days = Math.round((new Date(d.dueDate) - new Date(today)) / 86400000);
              return (
                <li key={d.id} className="flex justify-between gap-3">
                  <span>
                    <b>{d.person}</b> — {d.direction === 'lent' ? 'sizga qaytarishi kerak' : 'siz qaytarishingiz kerak'}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {money(debtRemaining(d))} · {days < 0 ? `${-days} kun o'tdi` : days === 0 ? 'bugun' : `${days} kun qoldi`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Daromad (oy)" value={money(ms.income)} tone="green" icon={TrendingUp} />
        <Stat label="Xarajat (oy)" value={money(ms.expense)} icon={TrendingDown} />
        <Stat label="Qoldiq (oy)" value={money(ms.balance)} tone={ms.balance < 0 ? 'red' : 'slate'} icon={Wallet} />
        <Stat label="Shu hafta xarajat" value={money(ws.expense)} icon={ChartColumn} sub={`${dateLabel(week.from)} – ${dateLabel(week.to)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={ChartColumn} action={<Button variant="subtle" size="sm" onClick={() => go('hisobot')}>Batafsil</Button>}>
            Pul qayerga ketyapti
          </CardTitle>
          {ms.categories.length === 0 ? (
            <Empty title="Bu oy hali xarajat yo'q" />
          ) : (
            <ul className="space-y-3">
              {ms.categories.slice(0, 5).map((c) => {
                const cat = categoryOf(c.id);
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{cat.uz}</span>
                      <span className="tabular-nums text-slate-500">
                        {money(c.sum)} · {percent(c.pct)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${c.pct * 100}%`, background: cat.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {ms.categories.length > 0 && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              «{categoryOf(ms.categories[0].id).uz}» ni 10% kamaytirsangiz, bu oydagi xarajat bo'yicha <b>{money(ms.categories[0].sum * 0.1)}</b> qoladi.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle icon={Repeat} action={<Estimate />}>
            Odat tuzog'i
          </CardTitle>
          {habits.length === 0 ? (
            <Empty title="Takrorlanuvchi xarajat topilmadi" text="Bir xil nomli xarajat kamida 3 marta, turli kunlarda yozilsa, shu yerda oylik narxi chiqadi." />
          ) : (
            <ul className="space-y-2.5">
              {habits.map((h) => (
                <li key={h.key} className="rounded-xl bg-orange-50 px-3 py-2.5 ring-1 ring-orange-100">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-900">{h.title}</span>
                    <span className="font-bold text-orange-700 tabular-nums">~{money(h.monthly)} / oy</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {h.count} marta, {frequencyLabel(h.interval)}, o'rtacha {money(h.avg)}. Yiliga ~{money(h.yearly)}.
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={PiggyBank} action={<Button variant="subtle" size="sm" onClick={() => go('maqsadlar')}>Barchasi</Button>}>
            Maqsadlar
          </CardTitle>
          {goals.length === 0 ? (
            <Empty title="Maqsad yo'q" text="Telefon, o'qish yoki uy uchun maqsad oching — haftasiga qancha yig'ish kerakligini hisoblaymiz.">
              <Button size="sm" variant="outline" onClick={() => go('maqsadlar')}>
                Maqsad ochish
              </Button>
            </Empty>
          ) : (
            <ul className="space-y-3">
              {goals.slice(0, 3).map((g) => {
                const p = goalPlan(g, today);
                return (
                  <li key={g.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-800">{g.name}</span>
                      <span className="tabular-nums text-slate-500">{percent(p.progress)}</span>
                    </div>
                    <Progress value={p.progress} />
                    <GoalStepLine goal={g} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <AdviceCard />
        <WeeklyCard />

        <Card>
          <CardTitle icon={Wallet} action={<Button variant="subtle" size="sm" onClick={() => go('yozuvlar')}>Barchasi</Button>}>
            Oxirgi yozuvlar
          </CardTitle>
          {recent.length === 0 ? (
            <Empty title="Hali yozuv yo'q" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {form && <TransactionForm initial={form} onSave={actions.addTx} onClose={() => setForm(null)} />}
    </div>
  );
}
