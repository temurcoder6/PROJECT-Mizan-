import { useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';
import { dateLabel, money, todayISO } from '../lib/format';
import { monthlyLoad, upcomingBills } from '../lib/plan';
import { useStore } from '../store';
import { BillsModal } from './DailyPlan';
import { Badge, Button, Card, CardTitle } from './ui';

export default function RecurringCard() {
  const { profile } = useStore();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const load = useMemo(() => monthlyLoad(profile.bills), [profile.bills]);
  const next = useMemo(() => upcomingBills(profile.bills, today, 30), [profile.bills, today]);
  const total30 = next.reduce((s, b) => s + b.amount, 0);

  return (
    <Card>
      <CardTitle icon={Repeat} action={<Button size="sm" variant="outline" onClick={() => setOpen(true)}>Boshqarish ({profile.bills.length})</Button>}>
        Davriy to'lovlar
      </CardTitle>
      {profile.bills.length === 0 ? (
        <p className="text-sm text-plaster/70">Ijara, internet, kredit kabi har oy yoki har hafta takrorlanadigan to'lovlarni kiriting. Ular kunlik rejadan ajratib qo'yiladi va oldindan ko'rinadi.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-plaster/12 bg-[#071633] p-3">
              <div className="text-xs text-plaster/55">Davriy yuk (oyiga)</div>
              <div className="font-bold text-plaster tabular-nums">{money(load)}</div>
            </div>
            <div className="rounded-xl border border-plaster/12 bg-[#071633] p-3">
              <div className="text-xs text-plaster/55">Keyingi 30 kunda</div>
              <div className="font-bold text-plaster tabular-nums">{money(total30)}</div>
            </div>
          </div>
          {next.length > 0 ? (
            <ul className="mt-3 divide-y divide-plaster/10 text-sm">
              {next.slice(0, 8).map((b) => (
                <li key={`${b.billId}-${b.date}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-plaster">
                    <b>{b.name}</b> <span className="text-plaster/55">· {dateLabel(b.date)}</span> {b.repeat === 'weekly' && <Badge tone="blue">Har hafta</Badge>}
                    {b.repeat === 'monthly' && <Badge tone="blue">Har oy</Badge>}
                  </span>
                  <span className="shrink-0 font-semibold text-plaster tabular-nums">{money(b.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-plaster/55">Keyingi 30 kunda to'lov yo'q.</p>
          )}
          <p className="mt-3 text-xs text-plaster/50">Hisob: oylik to'lov o'z summasi, haftalik to'lov summa × 52 ÷ 12. Bir martalik to'lovlar davriy yukka kirmaydi.</p>
        </>
      )}
      {open && <BillsModal onClose={() => setOpen(false)} />}
    </Card>
  );
}
