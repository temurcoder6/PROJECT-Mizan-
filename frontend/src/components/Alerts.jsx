import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Sparkles, X } from 'lucide-react';
import { queueAsk } from '../lib/askQueue';
import { todayISO } from '../lib/format';
import { computeAlerts, pendingPushes, pushKey, visibleAlerts } from '../lib/watch';
import { useStore } from '../store';
import { Button } from './ui';

const DISMISS_KEY = 'mizan.alerts.dismissed';
const NOTIFY_KEY = 'mizan.alerts.notified';

// Brauzer xotirasi ixtiyoriy: yo'q bo'lsa ham ilova ishlayveradi.
function readMap(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// Faqat bugungi yozuvlar saqlanadi, eskilari o'chadi.
function writeMap(key, map, today) {
  const kept = Object.fromEntries(Object.entries(map).filter(([, day]) => day === today));
  try {
    localStorage.setItem(key, JSON.stringify(kept));
  } catch {
    // storage unavailable
  }
}

const TONE = {
  danger: { dot: 'bg-rose-400', ring: 'border-rose-400/35 bg-rose-500/10' },
  warn: { dot: 'bg-ochre', ring: 'border-ochre/35 bg-ochre/10' },
  info: { dot: 'bg-turq', ring: 'border-turq/30 bg-turq/10' },
};

const BADGE = { danger: 'bg-rose-400', warn: 'bg-ochre', info: 'bg-turq' };

export function AlertBell({ go }) {
  const { profile, transactions, debts, goals } = useStore();
  const [, setTick] = useState(0);
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => readMap(DISMISS_KEY));

  // Sana o'zgarishini ushlash uchun minutiga bir marta qayta hisoblash.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = todayISO();
  const alerts = useMemo(
    () => computeAlerts({ store: { profile, transactions, debts, goals }, today }),
    [profile, transactions, debts, goals, today],
  );
  const shown = useMemo(() => visibleAlerts(alerts, dismissed, today), [alerts, dismissed, today]);

  // Brauzer bildirishnomasi: ruxsat Sozlamalardagi tugma bilan berilgan bo'lsa. Matnda ism yoki summa yo'q.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    const notified = readMap(NOTIFY_KEY);
    const todo = pendingPushes(shown, notified, today);
    if (!todo.length) return;
    for (const a of todo) {
      notified[pushKey(a)] = today;
      try {
        new Notification('Mizan', { body: a.push, icon: '/icon-192.png', tag: `mizan-${pushKey(a)}` });
      } catch {
        // some browsers only allow notifications through a service worker
      }
    }
    writeMap(NOTIFY_KEY, notified, today);
  }, [shown, today]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dismiss = (id) => {
    const next = { ...dismissed, [id]: today };
    setDismissed(next);
    writeMap(DISMISS_KEY, next, today);
  };
  const view = (page) => {
    setOpen(false);
    go?.(page);
  };
  const askAi = (a) => {
    setOpen(false);
    queueAsk(a.ask);
    go?.('yordamchi');
  };

  // Ro'yxat jiddiylik bo'yicha tartiblangan, shuning uchun birinchisi eng jiddiysi.
  const top = shown[0]?.severity;

  return (
    <div ref={wrapRef}>
      <button
        type="button"
        aria-label={shown.length ? `Ogohlantirishlar: ${shown.length} ta` : 'Ogohlantirishlar'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-9 items-center justify-center rounded-xl border border-plaster/14 bg-plaster/5 text-plaster/80 transition hover:border-ochre/45 hover:text-plaster"
      >
        <Bell className="size-4.5" aria-hidden />
        {shown.length > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-cobalt-night ${BADGE[top]}`}>
            {shown.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ogohlantirishlar"
          className="absolute top-full right-4 left-4 z-50 mt-2 max-h-[70dvh] overflow-y-auto rounded-2xl border border-plaster/14 bg-[#0A1F45] p-3.5 text-plaster shadow-2xl sm:left-auto sm:right-6 sm:w-[24rem] lg:right-8"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-sm font-bold text-plaster">Nima bo'layapti?</p>
            <button
              type="button"
              aria-label="Panelni yopish"
              onClick={() => setOpen(false)}
              className="inline-flex size-7 items-center justify-center rounded-lg text-plaster/65 hover:bg-plaster/10 hover:text-plaster"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {shown.length === 0 ? (
            <p className="py-3 text-sm text-plaster/70">Hozircha e'tibor talab qiladigan narsa yo'q.</p>
          ) : (
            <ul className="space-y-2.5">
              {shown.map((a) => (
                <li key={a.id} className={`rounded-xl border p-3 ${TONE[a.severity].ring}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE[a.severity].dot}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-plaster">{a.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-plaster/75">{a.text}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {a.page && (
                      <Button size="sm" variant="outline" onClick={() => view(a.page)}>
                        Ko'rish
                      </Button>
                    )}
                    <Button size="sm" onClick={() => askAi(a)}>
                      <Sparkles className="size-3.5" /> Mizan AI tushuntirsin
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dismiss(a.id)}>
                      Yopish
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-plaster/50">Faqat siz kiritgan ma'lumotdan hisoblanadi. Moliyaviy maslahat emas.</p>
        </div>
      )}
    </div>
  );
}
