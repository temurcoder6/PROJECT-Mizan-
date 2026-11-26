import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, Target } from 'lucide-react';
import { categoryOf } from '../lib/categories';
import { dateLabel, money, percent, todayISO } from '../lib/format';
import { debtRemaining } from '../lib/finance';
import { goalStep, weeklySummary } from '../lib/insights';
import { daysWithEntries } from '../lib/plan';
import { useStore } from '../store';
import { Button, Card, CardTitle } from './ui';

export function WeeklyCard() {
  const { transactions, debts, goals } = useStore();
  const today = todayISO();
  const w = useMemo(() => weeklySummary(transactions, debts, goals, today), [transactions, debts, goals, today]);

  return (
    <Card>
      <CardTitle icon={CalendarClock}>Haftalik jamlanma</CardTitle>
      {!w.enough ? (
        <p className="text-sm text-plaster/70">
          Oxirgi 7 kunda yozuv kam ({w.entries} ta yozuv, {w.days} kun). Xulosa chiqarish uchun kamida 5 ta yozuv va 3 ta turli kun kerak, shuning uchun hozircha xulosa yo'q.
        </p>
      ) : (
        <ul className="space-y-2 text-sm text-plaster/80">
          <li>
            Oxirgi 7 kunda <b className="text-plaster">{money(w.expense)}</b> yozilgan xarajat.
          </li>
          {w.top && (
            <li>
              Eng ko'p xarajat: <b className="text-plaster">{categoryOf(w.top.id).uz}</b> — {money(w.top.sum)} ({percent(w.top.pct)}).
              {w.topChange !== undefined && Math.abs(w.topChange) >= 0.1 && (
                <> Avvalgi haftaga nisbatan {w.topChange > 0 ? `${Math.round(w.topChange * 100)}% ko'p` : `${Math.round(-w.topChange * 100)}% kam`}.</>
              )}
            </li>
          )}
          {w.debtDue && (
            <li>
              Qarz muddati yaqin: <b className="text-plaster">{w.debtDue.debt.person}</b> — {money(debtRemaining(w.debtDue.debt))},{' '}
              {w.debtDue.days < 0 ? `${-w.debtDue.days} kun o'tgan` : w.debtDue.days === 0 ? 'bugun' : `${w.debtDue.days} kun qoldi`}.
            </li>
          )}
          {w.goals.map((g) => (
            <li key={g.id}>
              «{g.name}»: {percent(g.progress)}
              {g.added > 0 ? `, shu hafta +${money(g.added)}` : ", shu hafta qo'shilmagan"}.
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-plaster/50">Faqat siz kiritgan ma'lumotdan. Yozilmagan kunlar xulosaga ta'sir qilishi mumkin.</p>
    </Card>
  );
}

export function GoalStepLine({ goal }) {
  const s = goalStep(goal, todayISO());
  let text = null;
  if (s.kind === 'done') text = 'Maqsadga yetdingiz!';
  else if (s.kind === 'overdue') text = `Muddat o'tdi, yana ${money(s.remaining)} kerak. Yangi sana belgilash mumkin.`;
  else if (s.kind === 'nodeadline') text = `Yana ${money(s.remaining)} kerak. Muddat qo'ysangiz, qadamni hisoblayman.`;
  else if (s.kind === 'ontrack') text = `Shu hafta reja bajarildi: ${money(s.addedThisWeek)} qo'shilgan (reja ${money(s.perWeek)}).`;
  else text = `Keyingi kichik qadam: shu hafta ${money(s.amount)} qo'shing (haftalik reja ${money(s.perWeek)}).`;
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs text-plaster/70">
      <Target className="mt-0.5 size-3.5 shrink-0 text-turq-soft" aria-hidden /> {text}
    </p>
  );
}

function reminderDue(profile, transactions, now) {
  const r = profile.reminder;
  if (!r.enabled) return false;
  const today = todayISO();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm < r.time || r.last === today) return false;
  if (profile.noSpend.includes(today) || daysWithEntries(transactions).has(today)) return false;
  return true;
}

// Checks once a minute while the app is open. It never fires more than once per day.
export function ReminderWatcher() {
  const { profile, transactions, actions } = useStore();
  useEffect(() => {
    const tick = () => {
      if (!reminderDue(profile, transactions, new Date())) return;
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Mizan', { body: "Bugun xarajat bo'ldimi? Bir bosishda yozing yoki «xarajat bo'lmadi» deb belgilang.", icon: '/icon-192.png', tag: 'mizan-daily' });
        } catch {
          // some browsers only allow notifications through a service worker
        }
      }
      actions.updateProfile({ reminder: { ...profile.reminder, last: todayISO() } });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [profile, transactions, actions]);
  return null;
}

export function ReminderCard() {
  const { profile, transactions, actions } = useStore();
  const r = profile.reminder;
  const today = todayISO();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const show = r.enabled && hhmm >= r.time && !profile.noSpend.includes(today) && !daysWithEntries(transactions).has(today);
  if (!show) return null;
  return (
    <Card className="border-turq/30 bg-[#0A2247]/80">
      <CardTitle icon={Bell}>Eslatma</CardTitle>
      <p className="text-sm text-plaster/80">Bugun xarajat bo'ldimi? Yuqoridagi «Tez kiritish» bilan yozing yoki bugun xarajat bo'lmagan bo'lsa, shuni belgilang.</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => actions.toggleNoSpend(today)}>
        Bugun xarajat bo'lmadi
      </Button>
      <p className="mt-2 text-xs text-plaster/55">{dateLabel(today)} · eslatma vaqti {r.time}</p>
    </Card>
  );
}
