import { useState } from 'react';
import { ChartColumn, ChevronLeft, ChevronRight, CreditCard, Download, Repeat, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button, Card, CardTitle, Empty, Estimate, IconButton, Segmented, Stat } from '../components/ui';
import { categoryOf, methodLabel } from '../lib/categories';
import { addDays, dateLabel, monthLabel, money, percent, shiftMonth, todayISO } from '../lib/format';
import { detectRecurring, frequencyLabel, inRange, periodRange, summarize } from '../lib/finance';
import { exportCSV, useStore } from '../store';

export default function Reports() {
  const { transactions } = useStore();
  const today = todayISO();
  const [kind, setKind] = useState('month');
  const [ref, setRef] = useState(today);

  const { from, to } = periodRange(kind, ref);
  const items = inRange(transactions, from, to);
  const s = summarize(items);
  const habits = detectRecurring(transactions, today);
  const label = kind === 'week' ? `${dateLabel(from)} – ${dateLabel(to)}` : monthLabel(from);
  const shift = (n) => setRef(kind === 'week' ? addDays(ref, 7 * n) : shiftMonth(ref, n));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Hisobot</h1>
        <Button variant="outline" disabled={!items.length} onClick={() => exportCSV(items, `mizan-hisobot-${from}_${to}.csv`)}>
          <Download className="size-4" /> CSV yuklab olish
        </Button>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k);
            setRef(today);
          }}
          options={[
            { value: 'week', label: 'Hafta' },
            { value: 'month', label: 'Oy' },
          ]}
        />
        <div className="flex items-center gap-1">
          <IconButton label="Oldingi" icon={ChevronLeft} onClick={() => shift(-1)} />
          <span className="min-w-40 text-center font-semibold text-slate-900">{label}</span>
          <IconButton label="Keyingi" icon={ChevronRight} onClick={() => shift(1)} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Daromad" value={money(s.income)} tone="green" icon={TrendingUp} />
        <Stat label="Xarajat" value={money(s.expense)} icon={TrendingDown} />
        <Stat label="Qoldiq" value={money(s.balance)} tone={s.balance < 0 ? 'red' : 'slate'} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={ChartColumn}>Toifalar bo'yicha</CardTitle>
          {s.categories.length === 0 ? (
            <Empty title="Bu davrda xarajat yo'q" />
          ) : (
            <ul className="space-y-3">
              {s.categories.map((c) => {
                const cat = categoryOf(c.id);
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="size-2.5 rounded-full" style={{ background: cat.color }} />
                        {cat.uz}
                      </span>
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
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle icon={Wallet}>Rejalangan va kutilmagan</CardTitle>
            {s.expense === 0 ? (
              <Empty title="Ma'lumot yo'q" />
            ) : (
              <>
                <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-emerald-500" style={{ width: `${(s.planned / s.expense) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(s.unplanned / s.expense) * 100}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="size-2.5 rounded-full bg-emerald-500" /> Rejalangan
                    </div>
                    <div className="font-bold tabular-nums">{money(s.planned)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="size-2.5 rounded-full bg-amber-400" /> Kutilmagan
                    </div>
                    <div className="font-bold tabular-nums">{money(s.unplanned)}</div>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card>
            <CardTitle icon={CreditCard}>To'lov usuli</CardTitle>
            {s.methods.length === 0 ? (
              <Empty title="Ma'lumot yo'q" />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {s.methods.map((m) => (
                  <li key={m.id} className="flex justify-between">
                    <span className="text-slate-600">{methodLabel(m.id)}</span>
                    <span className="font-semibold tabular-nums">
                      {money(m.sum)} · {percent(m.pct)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardTitle icon={Repeat} action={<Estimate />}>
          Takrorlanadigan xarajatlar (oxirgi 90 kun)
        </CardTitle>
        {habits.length === 0 ? (
          <Empty title="Takrorlanuvchi xarajat topilmadi" text="Bir xil nomli xarajat kamida 3 marta, turli kunlarda yozilganda aniqlanadi." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase">
                    <th className="py-2 font-semibold">Nomi</th>
                    <th className="py-2 font-semibold">Necha marta</th>
                    <th className="py-2 font-semibold">Qanchalik tez-tez</th>
                    <th className="py-2 text-right font-semibold">Oyiga</th>
                    <th className="py-2 text-right font-semibold">Yiliga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {habits.map((h) => (
                    <tr key={h.key}>
                      <td className="py-2 font-semibold text-slate-900">{h.title}</td>
                      <td className="py-2 tabular-nums">{h.count}</td>
                      <td className="py-2 text-slate-600">{frequencyLabel(h.interval)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{money(h.monthly)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-500">{money(h.yearly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Hisob: o'rtacha summa × (yozuvlar soni − 1) ÷ birinchi va oxirgi yozuv orasidagi kunlar × 30. Hozirgi odat davom etsa shunday bo'ladi; sizning yozuvlaringizga asoslangan.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
