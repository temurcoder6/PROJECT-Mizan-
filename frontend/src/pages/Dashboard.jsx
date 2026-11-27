import { useState } from 'react';
import { Bell, ChartColumn, CreditCard, Crown, Minus, PiggyBank, Plus, Repeat, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import AdviceCard from '../components/AdviceCard';
import DailyPlanCard from '../components/DailyPlan';
import { MissingDaysCard } from '../components/DayFill';
import FinancialHealthCard from '../components/FinancialHealthCard';
import { GoalStepLine, ReminderCard, WeeklyCard } from '../components/Insights';
import ProModal from '../components/ProModal';
import QuickEntry from '../components/QuickEntry';
import TransactionForm from '../components/TransactionForm';
import TxRow from '../components/TxRow';
import { Button, Card, CardTitle, Empty, Estimate, Progress, Stat } from '../components/ui';
import { categoryOf } from '../lib/categories';
import { byDateDesc, dateLabel, daysBetween, monthLabel, money, percent, todayISO } from '../lib/format';
import {
  debtRemaining, detectRecurring, dueReminders, frequencyLabel, goalPlan, inRange, periodRange, summarize,
} from '../lib/finance';
import { useStore } from '../store';

export default function Dashboard({ go }) {
  const { auth, transactions, debts, goals, cards = [], profile, settings, actions } = useStore();
  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);
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
  const [showPro, setShowPro] = useState(false);
  const isPro = !!profile?.isPro;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-ochre">{monthLabel(today)}</p>
            {isPro && (
              <span className="flex items-center gap-1 rounded-full bg-ochre/20 border border-ochre/45 px-2 py-0.5 text-[10px] font-bold text-ochre uppercase">
                <Crown className="size-3" /> Pro Max
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster">Pulingiz holati</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPro(true)} className="border-ochre/40 text-ochre hover:bg-ochre/15">
            <Crown className="size-4" /> {isPro ? 'Mizan Pro' : 'Pro Daraja'}
          </Button>
          <Button variant="outline" onClick={() => go('kartalar')}>
            <CreditCard className="size-4 text-ochre" /> Kartalar{cards.length > 0 ? ` (${cards.length})` : ''}
          </Button>
          <Button variant="outline" onClick={() => setForm({ type: 'income' })}>
            <Plus className="size-4" /> Daromad
          </Button>
          <Button onClick={() => setForm({ type: 'expense' })}>
            <Minus className="size-4" /> Xarajat
          </Button>
        </div>
      </div>

      {empty && (
        <Card className="border-ochre/35 bg-gradient-to-br from-[#0E2A5C]/80 to-[#071633]/90">
          <CardTitle icon={Sparkles}>Xush kelibsiz!</CardTitle>
          <p className="text-sm text-plaster/75">
            Birinchi daromad yoki xarajatingizni qo'shing yoxud yordamchiga yozing: «bugun yo'lga 12 ming sarfladim».
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setForm({ type: 'expense' })}>Xarajat qo'shish</Button>
            <Button variant="outline" onClick={() => setForm({ type: 'income' })}>
              Daromad qo'shish
            </Button>
            {isAdmin && (
              <Button variant="ghost" onClick={actions.loadSample}>
                Namuna yuklash (admin)
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyPlanCard onOpenCards={() => go('kartalar')} />
        <QuickEntry />
      </div>

      {/* Mizan AI — Moliyaviy Salomatlik Indeksi, 3 ta CFO Maslahat va Dangasa Rejimi */}
      <FinancialHealthCard onOpenAssistant={() => go('yordamchi')} />

      <ReminderCard />
      <MissingDaysCard />

      {reminders.length > 0 && (
        <Card className="border-ochre/35 bg-[#1B160C]/85">
          <CardTitle icon={Bell} action={<Button variant="subtle" size="sm" onClick={() => go('qarzlar')}>Qarzlar</Button>}>
            Qarz eslatmalari
          </CardTitle>
          <ul className="space-y-1.5 text-sm text-plaster/85">
            {reminders.map((d) => {
              const days = daysBetween(today, d.dueDate);
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
                      <span className="font-medium text-plaster/85">{cat.uz}</span>
                      <span className="tabular-nums text-plaster/60">
                        {money(c.sum)} · {percent(c.pct)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#061228] ring-1 ring-plaster/10">
                      <div className="h-full rounded-full" style={{ width: `${c.pct * 100}%`, background: cat.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {ms.categories.length > 0 && (
            <p className="mt-4 rounded-xl border border-turq/30 bg-turq/12 px-3 py-2 text-sm text-turq-soft">
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
                <li key={h.key} className="rounded-xl border border-ochre/30 bg-ochre/12 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-plaster">{h.title}</span>
                    <span className="font-bold text-[#F2C46B] tabular-nums">~{money(h.monthly)} / oy</span>
                  </div>
                  <div className="text-xs text-plaster/65">
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
                      <span className="font-semibold text-plaster">{g.name}</span>
                      <span className="tabular-nums text-plaster/60">{percent(p.progress)}</span>
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
            <ul className="divide-y divide-plaster/10">
              {recent.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {form && <TransactionForm initial={form} onSave={actions.addTx} onClose={() => setForm(null)} />}
      <ProModal open={showPro} onClose={() => setShowPro(false)} />
    </div>
  );
}
