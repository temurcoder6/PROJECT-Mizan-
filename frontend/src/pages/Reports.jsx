import { useState } from 'react';
import { ChartColumn, ChevronLeft, ChevronRight, CreditCard, Download, Repeat, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button, Card, CardTitle, Empty, Estimate, IconButton, Segmented, Stat } from '../components/ui';
import { categoryOf, methodLabel } from '../lib/categories';
import { addDays, dateLabel, monthLabel, money, percent, shiftMonth, todayISO } from '../lib/format';
import { detectRecurring, frequencyLabel, inRange, periodRange, summarize, computePriceMemory } from '../lib/finance';
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
  const priceMem = computePriceMemory(transactions);
  const label = kind === 'week' ? `${dateLabel(from)} – ${dateLabel(to)}` : monthLabel(from);
  const shift = (n) => setRef(kind === 'week' ? addDays(ref, 7 * n) : shiftMonth(ref, n));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster">Hisobot</h1>
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
          <span className="min-w-40 text-center font-semibold text-plaster">{label}</span>
          <IconButton label="Keyingi" icon={ChevronRight} onClick={() => shift(1)} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Daromad" value={money(s.income)} tone="green" icon={TrendingUp} />
        <Stat label="Xarajat" value={money(s.expense)} icon={TrendingDown} />
        <Stat label="Qoldiq" value={money(s.balance)} tone={s.balance < 0 ? 'red' : 'slate'} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:items-start">
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
                      <span className="flex items-center gap-2 font-medium text-plaster/85">
                        <span className="size-2.5 rounded-full" style={{ background: cat.color }} />
                        {cat.uz}
                      </span>
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
        </Card>

        <div className="space-y-4 xl:contents xl:space-y-0">
          <Card>
            <CardTitle icon={Wallet}>Rejalangan va kutilmagan</CardTitle>
            {s.expense === 0 ? (
              <Empty title="Ma'lumot yo'q" />
            ) : (
              <>
                <div className="flex h-4 overflow-hidden rounded-full bg-[#061228] ring-1 ring-plaster/10">
                  <div className="bg-turq" style={{ width: `${(s.planned / s.expense) * 100}%` }} />
                  <div className="bg-ochre" style={{ width: `${(s.unplanned / s.expense) * 100}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5 text-plaster/60">
                      <span className="size-2.5 rounded-full bg-turq" /> Rejalangan
                    </div>
                    <div className="font-bold text-plaster tabular-nums">{money(s.planned)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-plaster/60">
                      <span className="size-2.5 rounded-full bg-ochre" /> Kutilmagan
                    </div>
                    <div className="font-bold text-plaster tabular-nums">{money(s.unplanned)}</div>
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
                    <span className="text-plaster/70">{methodLabel(m.id)}</span>
                    <span className="font-semibold text-plaster tabular-nums">
                      {money(m.sum)} · {percent(m.pct)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2 2xl:items-start">
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
                  <tr className="text-left text-xs text-plaster/45 uppercase">
                    <th className="py-2 font-semibold">Nomi</th>
                    <th className="py-2 font-semibold">Necha marta</th>
                    <th className="py-2 font-semibold">Qanchalik tez-tez</th>
                    <th className="py-2 text-right font-semibold">Oyiga</th>
                    <th className="py-2 text-right font-semibold">Yiliga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-plaster/10">
                  {habits.map((h) => (
                    <tr key={h.key}>
                      <td className="py-2 font-semibold text-plaster">{h.title}</td>
                      <td className="py-2 text-plaster/85 tabular-nums">{h.count}</td>
                      <td className="py-2 text-plaster/65">{frequencyLabel(h.interval)}</td>
                      <td className="py-2 text-right font-semibold text-plaster tabular-nums">{money(h.monthly)}</td>
                      <td className="py-2 text-right tabular-nums text-plaster/60">{money(h.yearly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="measure mt-3 text-xs text-plaster/50">
              Hisob: o'rtacha summa × (yozuvlar soni − 1) ÷ birinchi va oxirgi yozuv orasidagi kunlar × 30. Hozirgi odat davom etsa shunday bo'ladi; sizning yozuvlaringizga asoslangan.
            </p>
          </>
        )}
      </Card>

      <Card>
        <CardTitle icon={TrendingUp} action={priceMem.items.length > 0 ? <span className={`text-xs font-bold ${priceMem.avgInflation > 0 ? 'text-rose-300' : 'text-turq-soft'}`}>O'rtacha: {priceMem.avgInflation > 0 ? '+' : ''}{priceMem.avgInflation.toFixed(1)}%</span> : undefined}>
          Shaxsiy inflyatsiya va narxlar xotirasi
        </CardTitle>
        {priceMem.items.length === 0 ? (
          <Empty title="Narxlar tarixi yetarli emas" text="Bir xil nomdagi xarid (masalan: Non, Kofe, Benzin) kamida 2 marta yozilganda, Mizan narx o'zgarishini avtomatik eslab qoladi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-plaster/45 uppercase">
                  <th className="py-2 font-semibold">Mahsulot / Xizmat</th>
                  <th className="py-2 text-right font-semibold">Avvalgi narx</th>
                  <th className="py-2 text-right font-semibold">Oxirgi narx</th>
                  <th className="py-2 text-right font-semibold">O'zgarish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plaster/10">
                {priceMem.items.map((it) => (
                  <tr key={it.key}>
                    <td className="py-2 font-semibold text-plaster">
                      {it.title} <span className="text-xs font-normal text-plaster/45">({it.count}x)</span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-plaster/65">{money(it.firstPrice)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-plaster">{money(it.lastPrice)}</td>
                    <td className={`py-2 text-right font-bold tabular-nums ${it.diff > 0 ? 'text-rose-300' : it.diff < 0 ? 'text-turq-soft' : 'text-plaster/60'}`}>
                      {it.diff > 0 ? '+' : ''}{it.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
