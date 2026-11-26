import { Check, Flame, Trophy } from 'lucide-react';
import { savingStreak } from '../lib/insights';
import { money, percent, todayISO } from '../lib/format';
import { useStore } from '../store';

const MILESTONES = [0.25, 0.5, 0.75, 1];
const LEVELS = [
  [0, 'Boshlandi'],
  [0.25, "Yo'lga chiqdingiz"],
  [0.5, 'Yarmiga keldingiz'],
  [0.75, 'Oz qoldi'],
  [1, 'Maqsadga yetdingiz!'],
];

// Visual only: it shows progress and rewards weeks that met the plan; days without entries never count against the goal.
export default function GoalGame({ goal, progress }) {
  const { settings } = useStore();
  const streak = savingStreak(goal, todayISO());
  const level = [...LEVELS].reverse().find(([from]) => progress >= from)[1];
  const r = 30;
  const c = 2 * Math.PI * r;
  const next = MILESTONES.find((m) => progress < m);
  const toNext = next ? Math.max(goal.target * next - goal.saved, 0) : 0;
  const done = progress >= 1;

  return (
    <div className={`mt-3 flex items-center gap-4 rounded-2xl border p-3 ${done ? 'border-ochre/40 bg-ochre/12' : 'border-turq/25 bg-[#071633]/85'}`}>
      <div className="relative size-20 shrink-0">
        <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(244,241,234,0.12)" strokeWidth="9" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={done ? '#C9962B' : '#1FA6A0'}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(progress, 1) * c} ${c}`}
            className={settings.animations ? 'transition-[stroke-dasharray] duration-700' : ''}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-plaster tabular-nums">
          {done ? <Trophy className="size-6 text-ochre" /> : percent(progress)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-plaster">{level}</p>
        <div className="mt-1.5 flex items-center gap-1.5" role="list" aria-label="Bosqichlar">
          {MILESTONES.map((m) => {
            const reached = progress >= m;
            return (
              <span
                key={m}
                role="listitem"
                title={`${Math.round(m * 100)}%`}
                className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${reached ? 'bg-turq text-cobalt-night' : 'bg-[#060E1F] text-plaster/50 ring-1 ring-plaster/15'}`}
              >
                {reached ? <Check className="size-3.5" /> : Math.round(m * 100)}
              </span>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-plaster/65">
          {next ? `${Math.round(next * 100)}% gacha yana ${money(toNext)}.` : 'Hamma bosqich ochildi.'}
        </p>
        {streak > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#F2C46B]">
            <Flame className="size-3.5" /> {streak} hafta ketma-ket haftalik reja bajarildi
          </p>
        )}
      </div>
    </div>
  );
}
