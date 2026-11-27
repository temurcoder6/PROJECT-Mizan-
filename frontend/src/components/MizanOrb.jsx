import { useEffect, useRef, useState } from 'react';
import { Compass, Loader2, Mic, MicOff, Send, Sparkles, Volume2, X } from 'lucide-react';
import { api } from '../lib/api';
import { debtRemaining, inRange, periodRange, summarize } from '../lib/finance';
import { todayISO } from '../lib/format';
import { dailyPlan } from '../lib/plan';
import { speak, stopSpeaking, voiceInputSupported } from '../lib/voice';
import { useStore } from '../store';

const TOUR_STEPS = [
  { page: 'bosh', title: '1. Pulingiz holati', text: "Bu asosiy ekran: bugungi erkin sarflash rejangiz, Tez kiritish va Moliyaviy salomatlik indeksingiz shu yerda." },
  { page: 'yozuvlar', title: '2. Yozuvlar', text: "Barcha kirim-chiqimlaringiz ro'yxati, filtrlash va tahrirlash shu bo'limda." },
  { page: 'kartalar', title: '3. Kartalar', text: "Uzcard, Humo, Visa va naqd hamyonlaringiz qoldig'ini shu yerdan boshqarasiz." },
  { page: 'maqsadlar', title: '4. Maqsadlar', text: "Telefon, noutbuk yoki uy uchun jamg'arma maqsadi qo'ying — Mizan kunlik va haftalik rejani hisoblaydi." },
  { page: 'xavfsizlik', title: '5. Xavfsizlik (AI)', text: "Shubhali SMS yoki skrinshotni yuklab, AI orqali firibgarlikka tekshiring." },
  { page: 'yordamchi', title: '6. To‘liq Mizan AI', text: "Katta suhbat oynasi: banklar, nasiya, sog'liq, o'qish va har qanday savolga jonli javob olasiz." },
];

const QUICK_COMMANDS = [
  { label: 'Sayt bo‘ylab ko‘rsat', action: 'tour' },
  { label: 'Xarajatlarga o‘t', page: 'yozuvlar' },
  { label: 'Maqsadlar', page: 'maqsadlar' },
  { label: 'Xavfsizlik AI', page: 'xavfsizlik' },
];

const NAV_MAP = [
  { rx: /\b(bosh\s*sahifa|asosiy|home|pulingiz\s*holati)\b/i, page: 'bosh', label: 'Bosh sahifa' },
  { rx: /\b(xarajat|yozuvlar|daromad|kirim|chiqim)\b/i, page: 'yozuvlar', label: 'Yozuvlar' },
  { rx: /\b(karta|kartalar)\b/i, page: 'kartalar', label: 'Kartalar' },
  { rx: /\b(qarz|qarzlar)\b/i, page: 'qarzlar', label: 'Qarzlar' },
  { rx: /\b(maqsad|maqsadlar)\b/i, page: 'maqsadlar', label: 'Maqsadlar' },
  { rx: /\b(bozor|keshbek|vaucher|hamkor|chegirma)\b/i, page: 'bozor', label: 'Mizan Bozor' },
  { rx: /\b(hisobot|statistika|grafik)\b/i, page: 'hisobot', label: 'Hisobot' },
  { rx: /\b(xavfsizlik|firibgar|shubhali)\b/i, page: 'xavfsizlik', label: 'Xavfsizlik' },
  { rx: /\b(sozlama|sozlamalar|telegram)\b/i, page: 'sozlamalar', label: 'Sozlamalar' },
  { rx: /\b(yordam|shikoyat|murojaat)\b/i, page: 'yordam', label: 'Yordam va shikoyat' },
  { rx: /\b(katta\s*ai|to'liq\s*ai|yordamchi)\b/i, page: 'yordamchi', label: 'Mizan AI' },
];

const WAKE_RE = /\b(mizan\s*ai|mizan|ey\s*mizan|salom\s*mizan|мизан)\b/i;

export default function MizanOrb({ go, currentRoute }) {
  const store = useStore();
  const { settings } = store;
  const [open, setOpen] = useState(false);
  const [wakeMode, setWakeMode] = useState(false);
  const [listeningCmd, setListeningCmd] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState('');
  const [tourIdx, setTourIdx] = useState(null);
  const [reply, setReply] = useState("Salom! Men Mizan AI. Menga «Mizan AI» deb murojaat qiling yoki yozing — saytning istalgan joyini ko'rsatib, ishlaringizni bajarib beraman.");

  const wakeRecRef = useRef(null);
  const cmdRecRef = useRef(null);
  const sendCmdRef = useRef(null);

  // "Mizan AI" ovozli chaqirish (Wake-word) rejimi
  useEffect(() => {
    if (!wakeMode || !voiceInputSupported) {
      try { wakeRecRef.current?.stop(); } catch {}
      wakeRecRef.current = null;
      return undefined;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;

    let stopped = false;
    const startWake = () => {
      if (stopped || listeningCmd) return;
      try {
        const rec = new Recognition();
        rec.lang = settings.voiceLang || 'uz-UZ';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const transcript = e.results[i][0]?.transcript || '';
            if (WAKE_RE.test(transcript)) {
              const afterWake = transcript.replace(WAKE_RE, '').trim();
              setOpen(true);
              if (afterWake.length > 3 && e.results[i].isFinal) {
                sendCmdRef.current?.(afterWake);
              } else {
                setReply("Labbay! Eshitaman — nima qilib beray?");
                if (settings.autoSpeak) speak("Labbay, eshitaman!", 'uz');
              }
              break;
            }
          }
        };
        rec.onend = () => {
          if (!stopped && wakeMode && !listeningCmd) {
            setTimeout(startWake, 400);
          }
        };
        rec.onerror = () => {};
        rec.start();
        wakeRecRef.current = rec;
      } catch {
        // ignore mic start errors
      }
    };
    startWake();
    return () => {
      stopped = true;
      try { wakeRecRef.current?.stop(); } catch {}
      wakeRecRef.current = null;
    };
  }, [wakeMode, listeningCmd, settings.voiceLang, settings.autoSpeak]);

  const startTour = () => {
    setTourIdx(0);
    const step = TOUR_STEPS[0];
    go(step.page);
    setReply(`${step.title}: ${step.text}`);
    if (settings.autoSpeak) speak(step.text, 'uz');
  };

  const nextTourStep = () => {
    const next = tourIdx === null ? 0 : tourIdx + 1;
    if (next >= TOUR_STEPS.length) {
      setTourIdx(null);
      setReply("Sayt bo'ylab sayohat tugadi! Yana nimada yordam beray?");
      return;
    }
    setTourIdx(next);
    const step = TOUR_STEPS[next];
    go(step.page);
    setReply(`${step.title}: ${step.text}`);
    if (settings.autoSpeak) speak(step.text, 'uz');
  };

  const handleCommand = async (raw) => {
    const q = (raw ?? input).trim();
    if (!q || thinking) return;
    setInput('');
    setTourIdx(null);

    if (/(sayt.*ko'rsat|saytni\s*tushuntir|qanday\s*ishlaydi|ekskursiya|nimalar\s*qilsam)/i.test(q)) {
      startTour();
      return;
    }

    // Tezkor sahifa navigatsiyasi
    if (/(och|kir|o't|ot|ko'rsat|korsat)/i.test(q)) {
      const nav = NAV_MAP.find((n) => n.rx.test(q));
      if (nav) {
        go(nav.page);
        const msg = `Xo'p, «${nav.label}» bo'limini ochdim!`;
        setReply(msg);
        if (settings.autoSpeak) speak(msg, 'uz');
        return;
      }
    }

    setThinking(true);
    try {
      const today = todayISO();
      const plan = dailyPlan({ profile: store.profile, transactions: store.transactions, debts: store.debts, goals: store.goals, today });
      const month = periodRange('month', today);
      const ms = summarize(inRange(store.transactions, month.from, month.to));
      const totalCards = (store.cards || []).reduce((s, c) => s + (Number(c.balance) || 0), 0);
      const context = {
        balance: plan.status === 'ok' || plan.status === 'deficit' ? plan.cash : totalCards,
        dailyLimit: plan.status === 'ok' ? Math.round(plan.leftToday) : 0,
        monthIncome: ms.income,
        monthExpense: ms.expense,
        goals: (store.goals || []).map((g) => ({ name: g.name, target: g.target, saved: g.saved })),
        debts: (store.debts || []).map((d) => ({ person: d.person, remaining: debtRemaining(d), direction: d.direction })),
      };
      const res = await api.askJarvis(q, context, []);
      if (res?.ok && res.text) {
        setReply(res.text);
        if (res.action?.action === 'navigate' && res.action.page) {
          go(res.action.page);
        }
        if (settings.autoSpeak) speak(res.text, 'uz');
      }
    } catch {
      setReply("Hozir serverga ulanib bo'lmadi, lekin yuqoridagi tugmalar orqali sahifalarga o'tishingiz mumkin.");
    }
    setThinking(false);
  };

  useEffect(() => { sendCmdRef.current = handleCommand; });

  const listenOnce = () => {
    if (!voiceInputSupported) return;
    if (listeningCmd) {
      try { cmdRecRef.current?.stop(); } catch {}
      setListeningCmd(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    setListeningCmd(true);
    const rec = new Recognition();
    rec.lang = settings.voiceLang || 'uz-UZ';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript || '';
      if (t.trim()) handleCommand(t);
    };
    rec.onerror = () => setListeningCmd(false);
    rec.onend = () => setListeningCmd(false);
    rec.start();
    cmdRecRef.current = rec;
  };

  // Katta Yordamchi sahifasida Orb xalaqit bermasligi uchun yashiramiz
  if (currentRoute === 'yordamchi') return null;

  return (
    <div className="fixed right-4 bottom-20 z-40 flex flex-col items-end gap-2.5 md:right-6 md:bottom-6">
      {open && (
        <div
          data-testid="mizan-mini-orb"
          className="w-[min(340px,calc(100vw-2rem))] rounded-3xl border border-turq/45 bg-[#071633]/95 p-3.5 text-plaster shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-plaster/12 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-turq to-ochre text-cobalt-night shadow">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-plaster">Mizan AI · Tezkor yordamchi</p>
                <p className="text-[10px] text-turq-soft">{wakeMode ? '«Mizan AI» chaqiruvini tinglamoqda' : 'Buyruq bering yoki savol so‘rang'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {voiceInputSupported && (
                <button
                  type="button"
                  onClick={() => setWakeMode((v) => !v)}
                  title="«Mizan AI» ovozli chaqirishni yoqish/o'chirish"
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${wakeMode ? 'bg-turq text-cobalt-night' : 'border border-plaster/15 text-plaster/65 hover:text-plaster'}`}
                >
                  {wakeMode ? 'Tinglash: ON' : 'Hey Mizan'}
                </button>
              )}
              <button
                type="button"
                aria-label="Mini oynani yopish"
                onClick={() => { stopSpeaking(); setOpen(false); }}
                className="rounded-full p-1 text-plaster/55 hover:bg-plaster/10 hover:text-plaster"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto rounded-2xl border border-plaster/10 bg-[#050C1B]/80 p-2.5 text-xs leading-relaxed text-plaster/90">
            {thinking ? (
              <span className="flex items-center gap-2 text-ochre">
                <Loader2 className="size-3.5 animate-spin" /> O'ylanmoqda...
              </span>
            ) : (
              reply
            )}
          </div>

          {tourIdx !== null && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-ochre/35 bg-ochre/10 px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold text-ochre">Qadam {tourIdx + 1}/{TOUR_STEPS.length}</span>
              <button type="button" onClick={nextTourStep} className="font-bold text-turq-soft underline">
                Keyingi bo'lim →
              </button>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  if (c.action === 'tour') startTour();
                  else {
                    go(c.page);
                    setReply(`«${c.label}» bo'limi ochildi!`);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full border border-plaster/15 bg-[#0A1F45] px-2.5 py-1 text-[11px] font-semibold text-plaster/85 transition hover:border-turq/50 hover:text-turq-soft"
              >
                <Compass className="size-3 text-ochre" /> {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => speak(reply, 'uz')}
              className="inline-flex items-center gap-1 rounded-full border border-plaster/15 bg-[#0A1F45] px-2.5 py-1 text-[11px] font-semibold text-plaster/75 hover:text-plaster"
            >
              <Volume2 className="size-3 text-turq-soft" /> O'qib ber
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCommand();
            }}
            className="mt-2.5 flex items-center gap-1.5"
          >
            {voiceInputSupported && (
              <button
                type="button"
                onClick={listenOnce}
                aria-label="Ovozli buyruq"
                className={`flex size-9 shrink-0 items-center justify-center rounded-full transition ${listeningCmd ? 'bg-rose-600 text-white' : 'border border-plaster/15 bg-[#050C1B] text-plaster/80 hover:border-ochre'}`}
              >
                {listeningCmd ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Buyruq bering (masalan: Qarzlar)"
              className="h-9 flex-1 rounded-full border border-plaster/15 bg-[#050C1B] px-3 text-xs text-plaster outline-none focus:border-turq"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Yuborish"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-turq text-cobalt-night transition hover:bg-[#32BDB6] disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      {/* Dumaloq suzuvchi Mizan AI sharchasi (Orb) */}
      <button
        type="button"
        data-testid="mizan-orb-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mizan AI tezkor yordamchi"
        className={`group relative flex size-13 items-center justify-center rounded-full border border-turq/60 bg-gradient-to-br from-[#0E2A5C] via-[#071633] to-cobalt-night text-ochre shadow-[0_8px_28px_rgba(31,166,160,0.38)] transition hover:scale-105 ${wakeMode ? 'ring-2 ring-turq ring-offset-2 ring-offset-[#060E1F]' : ''}`}
      >
        {settings.animations && (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-turq/20 [animation-duration:3s]" />
        )}
        <Sparkles className="relative size-6 transition group-hover:rotate-12" />
      </button>
    </div>
  );
}
