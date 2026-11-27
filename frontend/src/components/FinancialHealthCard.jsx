import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Flame, Sparkles, Zap } from 'lucide-react';
import { Badge, Card } from './ui';
import { api } from '../lib/api';
import { money, todayISO } from '../lib/format';
import { useStore } from '../store';

export default function FinancialHealthCard({ onOpenAssistant }) {
  const { transactions = [], cards = [], goals = [], debts = [], actions } = useStore();
  const [data, setData] = useState({
    score: 82,
    grade: "A'lo daraja",
    gradeColor: "text-turq",
    tips: [
      {
        title: "Rejali xarajat intizomi",
        text: "Xarajatlaringizning 80% qismi oldindan rejalashtirilgan. Intizomni shunday saqlang!",
        tone: "emerald",
      },
      {
        title: "Mayda odatlar nazorati",
        text: "Kofe va taksi xarajatlarini kunlik me'yorda ushlab turibsiz. Bu oyiga ~240 000 so'm tejaydi.",
        tone: "emerald",
      },
      {
        title: "Katta maqsad strategiyasi",
        text: "Orzuingizdagi xarid (iPhone, mashina) uchun Mizan AI orqali Malika vs Nasiya hisob-kitobini oling.",
        tone: "cyan",
      },
    ],
  });
  const [lazySuccess, setLazySuccess] = useState('');

  useEffect(() => {
    const totalBalance = cards.reduce((s, c) => s + (Number(c.balance) || 0), 0);
    api
      .aiHealthScore({
        transactions,
        balance: totalBalance,
        dailyLimit: 85000,
        goals,
        debts,
      })
      .then((res) => {
        if (res?.score) setData(res);
      })
      .catch(() => {});
  }, [transactions.length, cards.length, goals.length]);

  const handleLazyAdd = (amount) => {
    actions.addTx({
      type: 'expense',
      title: 'Kunlik xarajat (tezkor)',
      amount,
      category: 'boshqa',
      date: todayISO(),
      method: 'naqd',
      planned: true,
      note: "Dangasa rejimi orqali 1 bosishda kiritildi",
    });
    setLazySuccess(`${money(amount)} qo'shildi!`);
    setTimeout(() => setLazySuccess(''), 2500);
  };

  return (
    <Card className="border-ochre/35 bg-gradient-to-br from-[#0a1e42] via-[#071633] to-[#040e22] text-plaster p-5 shadow-2xl space-y-5">
      {/* 1. Yuqori sarlavha va 100 ballik shkala */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-plaster/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-turq/20 text-turq">
              <Activity className="size-4" />
            </span>
            <h2 className="font-display text-lg font-bold text-plaster">Moliyaviy Salomatlik Indeksi</h2>
            <Badge tone="cyan">Duolingo Effekti</Badge>
          </div>
          <p className="mt-1 text-xs text-plaster/65">
            Sizning moliyaviy intizomingiz, rejalilik va jamg'arma me'yoringiz tahlili
          </p>
        </div>

        {/* 100 ballik ko'rsatkich */}
        <div className="flex items-center gap-3 self-end sm:self-auto rounded-2xl border border-turq/35 bg-[#06142e] px-4 py-2 shadow-inner">
          <div className="text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="font-display text-2xl font-black text-turq">{data.score}</span>
              <span className="text-xs text-plaster/50 font-bold">/ 100</span>
            </div>
            <div className={`text-[11px] font-semibold ${data.gradeColor}`}>{data.grade}</div>
          </div>
          <div className="size-10 rounded-full border-2 border-turq flex items-center justify-center font-black text-xs text-turq shadow-[0_0_12px_rgba(31,166,160,0.4)]">
            <Flame className="size-5 text-ochre" />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-plaster/70 mb-1.5 font-medium">
          <span>Intizom darajasi</span>
          <span className="text-turq">O'zbekistondagi foydalanuvchilarning {data.score}% dan yaxshiroq</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-plaster/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ochre via-turq to-emerald-400 transition-all duration-700"
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>

      {/* 2. AI Moliyaviy Tahlilchi — 3 ta amaliy maslahat */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-ochre uppercase tracking-wider">
            <Sparkles className="size-3.5" /> Mizan AI — 3 ta amaliy maslahat (CFO)
          </span>
          {onOpenAssistant && (
            <button
              type="button"
              onClick={onOpenAssistant}
              className="text-xs text-turq hover:underline font-semibold flex items-center gap-1"
            >
              Mizan AI bilan muloqot <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {data.tips.map((t, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-plaster/10 bg-[#06142e]/80 p-3 flex flex-col justify-between transition hover:border-ochre/30"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-plaster">
                  {t.tone === 'emerald' ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  ) : t.tone === 'cyan' ? (
                    <Sparkles className="size-3.5 text-turq shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-ochre shrink-0" />
                  )}
                  <span className="truncate">{t.title}</span>
                </div>
                <p className="mt-1 text-[11px] text-plaster/75 leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Dangasa rejimi (Lazy mode — 1 bosishda kiritish) */}
      <div className="rounded-2xl border border-plaster/12 bg-[#061126] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-ochre/15 p-2 text-ochre">
            <Zap className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-plaster">Dangasa rejimi (Lazy Mode)</div>
            <div className="text-[11px] text-plaster/60">
              Xarajatlarni yozishga erindingizmi? Bugungi taxminiy summani 1 bosishda belgilang:
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[30000, 50000, 100000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleLazyAdd(amt)}
              className="flex-1 sm:flex-none rounded-xl border border-plaster/15 bg-plaster/5 px-2.5 py-1.5 text-xs font-bold text-plaster hover:border-turq hover:bg-turq/15 transition"
            >
              +{amt / 1000}k
            </button>
          ))}
          {lazySuccess && (
            <span className="text-xs font-bold text-emerald-400 animate-in fade-in ml-1">
              ✓ {lazySuccess}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
