import { useEffect, useRef, useState } from 'react';
import { Check, Compass, Crown, Loader2, MessageSquareWarning, Mic, MicOff, Send, ShieldAlert, ShieldCheck, Sparkles, Square, Trash2, Volume2, X } from 'lucide-react';
import { Badge, Button, Card, Modal, MoneyInput, inputCls } from '../components/ui';
import ComplaintModal from '../components/ComplaintModal';
import PartnerSticker from '../components/PartnerSticker';
import ProModal from '../components/ProModal';
import { api } from '../lib/api';
import { respond } from '../lib/assistant/assistant';
import { categoryLabel, methodLabel } from '../lib/categories';
import { debtRemaining, inRange, periodRange, summarize } from '../lib/finance';
import { addDays, dateLabel, formatDigitsInput, money, parseDigits, todayISO, uid } from '../lib/format';
import { dailyPlan } from '../lib/plan';
import { findVoice, listen, speak, stopSpeaking, voiceInputSupported, voiceOutputSupported, VOICE_LANGS } from '../lib/voice';
import { useStore } from '../store';

function DraftCard({ draft, msgId }) {
  const { actions } = useStore();
  const { data } = draft;
  const [edit, setEdit] = useState(false);
  const [local, setLocal] = useState(data);

  if (draft.status === 'saved') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-turq/30 bg-turq/15 px-3 py-2 text-sm text-turq-soft">
        <Check className="size-4" /> Saqlandi
      </div>
    );
  }
  if (draft.status === 'rejected') {
    return <div className="mt-2 rounded-xl border border-plaster/12 bg-[#061228] px-3 py-2 text-sm text-plaster/55">Bekor qilindi, hech narsa saqlanmadi.</div>;
  }

  const confirm = () => {
    if (draft.kind === 'tx') actions.addTx(local);
    if (draft.kind === 'debt') actions.addDebt(local);
    if (draft.kind === 'payment') actions.addPayment(local.debtId, { amount: local.amount, date: local.date });
    if (draft.kind === 'goalAdd') actions.addToGoal(local.goalId, local.amount);
    actions.setDraftStatus(msgId, draft.id, 'saved');
  };

  let title = '';
  let lines = [];
  if (draft.kind === 'tx') {
    title = local.type === 'income' ? 'Daromad' : 'Xarajat';
    lines = [
      ['Nomi', local.title],
      ['Summa', money(local.amount)],
      ['Toifa', categoryLabel(local.category)],
      ['Sana', dateLabel(local.date)],
      ["To'lov usuli", methodLabel(local.method)],
    ];
  } else if (draft.kind === 'debt') {
    title = local.direction === 'lent' ? 'Qarz berdim' : 'Qarz oldim';
    lines = [
      ['Odam', local.person],
      ['Summa', money(local.amount)],
      ['Sana', dateLabel(local.date)],
      ['Muddat', local.dueDate ? dateLabel(local.dueDate) : 'belgilanmagan'],
    ];
  } else if (draft.kind === 'payment') {
    title = 'Qarz qaytarildi';
    lines = [['Odam', local.person], ['Summa', money(local.amount)], ['Sana', dateLabel(local.date)]];
  } else {
    title = "Maqsadga qo'shish";
    lines = [['Maqsad', local.goalName], ['Summa', money(local.amount)]];
  }

  const canEditTx = draft.kind === 'tx';

  return (
    <div className="mt-2 rounded-2xl border border-plaster/14 bg-[#071633] p-3 text-plaster">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-turq-soft uppercase">{title}</span>
        <Badge tone="amber">Tasdiq kutilmoqda</Badge>
      </div>
      {edit && canEditTx ? (
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} />
          <MoneyInput
            value={formatDigitsInput(local.amount)}
            onChange={(v) => setLocal({ ...local, amount: parseDigits(v) })}
          />
        </div>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          {lines.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-plaster/55">{k}</dt>
              <dd className="font-semibold text-plaster">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={!local.amount} onClick={confirm}>
          <Check className="size-3.5" /> Saqlash
        </Button>
        {canEditTx && (
          <Button size="sm" variant="outline" onClick={() => setEdit((v) => !v)}>
            {edit ? 'Tayyor' : 'Tuzatish'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => actions.setDraftStatus(msgId, draft.id, 'rejected')}>
          <X className="size-3.5" /> Bekor qilish
        </Button>
      </div>
    </div>
  );
}

function JarvisActionCard({ action, go }) {
  const { actions } = useStore();
  const [added, setAdded] = useState(false);

  if (action?.action === 'navigate' && action?.page) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-turq/35 bg-[#071633] px-3.5 py-2.5 text-xs text-plaster">
        <span className="flex items-center gap-2 font-semibold text-turq-soft">
          <Compass className="size-4" /> Bo'limga yo'naltirildi: {action.label || action.page}
        </span>
        {go && (
          <Button size="sm" variant="outline" onClick={() => go(action.page)}>
            Ochish
          </Button>
        )}
      </div>
    );
  }

  if (action?.action !== 'create_goal') return null;

  const handleAdd = () => {
    const today = todayISO();
    const months = Number(action.months) || 6;
    const deadline = addDays(today, months * 30);
    actions.addGoal({
      name: action.name || 'Yangi maqsad',
      target: Number(action.target) || 10000000,
      deadline,
      saved: 0,
    });
    setAdded(true);
  };

  if (added) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-turq/40 bg-turq/20 px-4 py-3 text-sm text-turq font-medium">
        <Check className="size-4.5" /> «{action.name}» muvaffaqiyatli Maqsadlar daftaringizga qo'shildi!
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-ochre/45 bg-gradient-to-br from-[#0c234f] to-[#071530] p-4 text-plaster shadow-xl">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-ochre uppercase tracking-wider">
          <Sparkles className="size-4" /> Mizan AI Taklifi
        </span>
        <span className="rounded-full bg-ochre/15 border border-ochre/30 px-2 py-0.5 text-[10px] text-ochre font-bold">
          1 bosishda bajarish
        </span>
      </div>
      <div className="mt-2 text-base font-bold text-plaster">{action.name}</div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-plaster/75">
        <div>Kerakli summa: <strong className="text-ochre">{money(action.target)}</strong></div>
        {action.daily && <div>Kunlik jamg'arma: <strong className="text-turq">{money(action.daily)}</strong></div>}
        {action.months && <div>Muddat: <strong className="text-plaster">{action.months} oy</strong></div>}
      </div>
      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ochre to-amber-600 px-4 py-2 text-xs font-bold text-cobalt-night shadow-md transition hover:opacity-95"
        >
          <Sparkles className="size-3.5" /> Maqsadlarimga qo'shish
        </button>
      </div>
    </div>
  );
}

function FormattedText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="select-text space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="font-bold text-turq-soft text-sm mt-2">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-turq-soft text-base mt-2.5">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('---')) {
          return <hr key={idx} className="border-plaster/15 my-2" />;
        }
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className={trimmed.startsWith('* ') || trimmed.startsWith('- ') ? 'pl-2 text-plaster/90' : ''}>
            {parts.map((p, i) => {
              if (p.startsWith('**') && p.endsWith('**')) {
                return <strong key={i} className="font-bold text-plaster">{p.slice(2, -2)}</strong>;
              }
              return p;
            })}
          </p>
        );
      })}
    </div>
  );
}

function Bubble({ msg, onChoice, onSpeak, onStopSpeak, speakingId, lastId, go, animations, onOpenComplaint }) {
  const mine = msg.role === 'user';
  const isSpeaking = speakingId === msg.id;
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${mine ? 'rounded-br-md border border-turq/35 bg-cobalt/90 text-plaster' : 'rounded-bl-md border border-plaster/12 bg-[#0A1F45]/85 text-plaster/90'}`}>
        <FormattedText text={msg.text} />
        {msg.drafts?.map((d) => (
          <DraftCard key={d.id} draft={d} msgId={msg.id} />
        ))}
        {msg.action && <JarvisActionCard action={msg.action} go={go} />}
        {msg.partners?.length > 0 && <PartnerSticker partners={msg.partners} animated={animations} />}
        {msg.moderation?.status && msg.moderation.status !== 'ok' && (
          <div className="mt-2.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2.5 text-xs text-rose-200">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="size-4 shrink-0" />
              {msg.moderation.status === 'ban' ? 'Kirish cheklandi (Ban)' : 'Ogohlantirish'}
            </div>
            {msg.moderation.reason && <p className="mt-1 opacity-90">{msg.moderation.reason}</p>}
            <button
              type="button"
              onClick={() => onOpenComplaint(msg.moderation.reason || '')}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-500/25 px-2.5 py-1 font-semibold text-white hover:bg-rose-500/40"
            >
              <MessageSquareWarning className="size-3.5" /> Shikoyat / Murojaat oynasi
            </button>
          </div>
        )}
        {msg.choices && msg.id === lastId && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.choices.map((c) => (
              <button key={c} type="button" onClick={() => onChoice(c)} className="rounded-full border border-turq/35 bg-[#071633] px-3 py-1.5 text-sm font-semibold text-turq-soft transition hover:bg-turq/15">
                {c}
              </button>
            ))}
          </div>
        )}
        {!mine && voiceOutputSupported && (
          <button
            type="button"
            onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(msg))}
            className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold transition ${isSpeaking ? 'text-ochre' : 'text-plaster/55 hover:text-plaster'}`}
          >
            {isSpeaking ? <><Square className="size-3 fill-current" /> To'xtatish</> : <><Volume2 className="size-3.5" /> O'qib berish</>}
          </button>
        )}
      </div>
    </div>
  );
}

const LOCAL_NAV_ROUTES = [
  { rx: /\b(bosh\s*sahifa|asosiy|home|pulingiz\s*holati)\b/i, page: 'bosh', label: 'Bosh sahifa' },
  { rx: /\b(xarajat|yozuvlar|daromad|kirim|chiqim)\b.*\b(och|kir|o't|ot|ko'rsat|korsat)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(xarajat|yozuvlar|daromad)\b/i, page: 'yozuvlar', label: 'Yozuvlar' },
  { rx: /\b(karta|kartalar)\b.*\b(och|kir|o't|ot|ko'rsat|korsat)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(karta|kartalar)\b/i, page: 'kartalar', label: 'Kartalar' },
  { rx: /\b(qarz|qarzlar)\b.*\b(och|kir|o't|ot|ko'rsat|korsat)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(qarz|qarzlar)\b/i, page: 'qarzlar', label: 'Qarzlar' },
  { rx: /\b(maqsad|maqsadlar)\b.*\b(och|kir|o't|ot|ko'rsat|korsat)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(maqsad|maqsadlar)\b/i, page: 'maqsadlar', label: 'Maqsadlar' },
  { rx: /\b(hisobot|statistika|grafik)\b.*\b(och|kir|o't|ot|ko'rsat|korsat)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(hisobot|statistika)\b/i, page: 'hisobot', label: 'Hisobot' },
  { rx: /\b(xavfsizlik|firibgar|shubhali)\b.*\b(och|kir|o't|ot|ko'rsat|korsat|tekshir)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(xavfsizlik)\b/i, page: 'xavfsizlik', label: 'Xavfsizlik' },
  { rx: /\b(sozlama|sozlamalar|nastroyka)\b.*\b(och|kir|o't|ot|ko'rsat|korsat)\b|\b(och|kir|o't|ot|ko'rsat|korsat)\b.*\b(sozlama|sozlamalar)\b/i, page: 'sozlamalar', label: 'Sozlamalar' },
  { rx: /\b(yordam|shikoyat|murojaat)\b.*\b(och|kir|o't|ot)\b/i, page: 'yordam', label: 'Yordam va shikoyat' },
];

export default function Assistant({ go }) {
  const store = useStore();
  const { chat, pending, settings, actions } = store;
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [showPro, setShowPro] = useState(false);
  const [complaint, setComplaint] = useState({ open: false, reason: '' });
  const [strikes, setStrikes] = useState(() => Number(localStorage.getItem('mizan_mod_strikes') || 0));
  const [banned, setBanned] = useState(() => Number(localStorage.getItem('mizan_mod_ban_until') || 0) > Date.now());
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const stopRef = useRef(null);
  const bottomRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: settings.animations ? 'smooth' : 'auto', block: 'end' });
  }, [chat.length, thinking, settings.animations]);

  useEffect(() => () => {
    stopRef.current?.();
    stopSpeaking();
  }, []);

  const isQuickLocalEntry = (str, hasPending) => {
    if (hasPending) return true;
    const s = str.toLowerCase().trim();
    if (s.includes('?') || s.split(/\s+/).length > 7) return false;
    if (/(qanday|qaysi|necha|nima|qancha|nega|kim|qayer|qachon|bo'ladimi|buladimi|yaxshi|arzon|qimmat|bank|karta|foiz|omonat|kredit|mikroqarz|nasiya|rassrochka|uzum|tbc|anor|avo|kapital|ipak|hamkor|agro|xalq|sqb|nbu|infin|alif|iman|payme|click|olcha|asaxiy|texnomart|mediapark|malika|abu saxiy|iphone|samsung|macbook|noutbuk|mashina|telefon|uy|kurs|dollar|yevro|tejash|teja|maslahat|tavsiya|solishtir|tahlil|reja|olmoqchiman|yig'moqchiman|yigmoqchiman|yig'sam|yigsam|salom|assalom|rahmat|jarvis|mizan|kasal|og'ri|dori|yo'qot|yuqot|o'qish|uqish|imtihon|och|kir|o't)/i.test(s)) {
      return false;
    }
    return /\d/.test(s) && /(sarfla|xarajat|tushdi|oldim|berdim|qarz|bozor|taksi|non|kofe|ovqat|kommunal|ijara|internet|maosh|oylik|\d+\s*(ming|mln|k|m)?$)/i.test(s);
  };

  const speakMsg = (msg) => {
    setSpeakingId(msg.id);
    speak(msg.text, msg.lang || 'uz', {
      onStart: () => setSpeakingId(msg.id),
      onEnd: () => setSpeakingId((cur) => (cur === msg.id ? null : cur)),
      onError: () => {
        setSpeakingId((cur) => (cur === msg.id ? null : cur));
        if (!findVoice(msg.lang || 'uz')) {
          setNotice("Ovozni o'qishda muammo bo'ldi. Internetni tekshiring.");
        }
      },
    });
  };

  const stopSpeak = () => {
    stopSpeaking();
    setSpeakingId(null);
  };

  const send = async (raw) => {
    const input = (raw ?? text).trim();
    if (!input || thinking) return;

    if (banned) {
      setComplaint({ open: true, reason: 'Qoidalarni buzganlik uchun AI chat cheklangan.' });
      return;
    }

    const priorHistory = chat.slice(-10).map((m) => ({ role: m.role, text: m.text }));
    actions.pushMessage({ id: uid(), role: 'user', text: input });
    setText('');
    setNotice('');

    // Tezkor sayt navigatsiyasi buyruqlari
    if (go) {
      const nav = LOCAL_NAV_ROUTES.find((r) => r.rx.test(input));
      if (nav) {
        const navReply = {
          id: uid(),
          role: 'assistant',
          lang: 'uz',
          text: `Xo'p, hozir **${nav.label}** bo'limiga o'tamiz!`,
          action: { action: 'navigate', page: nav.page, label: nav.label },
        };
        actions.pushMessage(navReply);
        setTimeout(() => go(nav.page), 650);
        return;
      }
    }

    // Sodda xarajat/daromad kiritishdan tashqari BARCHA savol va suhbatlar Mizan AI ga yuboriladi
    if (!isQuickLocalEntry(input, pending)) {
      setThinking(true);
      try {
        const today = todayISO();
        const plan = dailyPlan({ profile: store.profile, transactions: store.transactions, debts: store.debts, goals: store.goals, today });
        const month = periodRange('month', today);
        const ms = summarize(inRange(store.transactions, month.from, month.to));
        const totalCards = (store.cards || []).reduce((s, c) => s + (Number(c.balance) || 0), 0);
        const todaySpent = (store.transactions || [])
          .filter((t) => t.type === 'expense' && t.date === today)
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const context = {
          balance: plan.status === 'ok' || plan.status === 'deficit' ? plan.cash : totalCards,
          dailyLimit: plan.status === 'ok' ? Math.round(plan.leftToday) : 0,
          todaySpent,
          monthIncome: ms.income,
          monthExpense: ms.expense,
          cards: (store.cards || []).map((c) => ({ label: c.label, network: c.network, balance: c.balance })),
          goals: (store.goals || []).map((g) => ({ name: g.name, target: g.target, saved: g.saved, deadline: g.deadline })),
          debts: (store.debts || []).map((d) => ({ person: d.person, remaining: debtRemaining(d), direction: d.direction, dueDate: d.dueDate })),
          recentTx: (store.transactions || []).slice(0, 8).map((t) => ({ type: t.type, title: t.title, amount: t.amount, category: t.category, date: t.date })),
        };

        const res = await api.askJarvis(input, context, priorHistory);
        if (res?.ok && res.text) {
          // Moderatsiya natijasini tekshirish
          let modInfo = res.moderation;
          if (modInfo?.status === 'warn') {
            const nextStrikes = strikes + 1;
            setStrikes(nextStrikes);
            localStorage.setItem('mizan_mod_strikes', String(nextStrikes));
            if (nextStrikes >= 3) {
              modInfo = { status: 'ban', reason: "3 marta ogohlantirishdan so'ng AI suhbati 5 daqiqaga cheklandi." };
              setBanned(true);
              localStorage.setItem('mizan_mod_ban_until', String(Date.now() + 5 * 60 * 1000));
            }
          } else if (modInfo?.status === 'ban') {
            setBanned(true);
            localStorage.setItem('mizan_mod_ban_until', String(Date.now() + 5 * 60 * 1000));
          }

          // Reklamani ketma-ket har javobda chiqarmaslik (qulay fursat nazorati)
          const lastAssistant = [...chat].reverse().find((m) => m.role === 'assistant');
          const hadRecentAd = Boolean(lastAssistant?.partners?.length);
          const safePartners = hadRecentAd ? [] : (res.partners || []);

          const drafts =
            res.draft && Number(res.draft.amount) > 0
              ? [
                  {
                    id: uid(),
                    kind: 'tx',
                    status: 'pending',
                    data: {
                      type: res.draft.type === 'income' ? 'income' : 'expense',
                      title: String(res.draft.title || 'Xarajat'),
                      amount: Number(res.draft.amount),
                      category: String(res.draft.category || 'boshqa'),
                      date: today,
                      method: 'karta',
                      planned: true,
                      note: '',
                    },
                  },
                ]
              : undefined;
          const jarvisMsgId = uid();
          const jarvisReply = {
            id: jarvisMsgId,
            role: 'assistant',
            lang: 'uz',
            text: res.text,
            action: res.action,
            partners: safePartners,
            moderation: modInfo,
            drafts,
          };
          actions.pushMessage(jarvisReply);

          if (res.action?.action === 'navigate' && res.action.page && go) {
            setTimeout(() => go(res.action.page), 700);
          } else if (res.action?.action === 'open_pro') {
            setShowPro(true);
          } else if (res.action?.action === 'open_complaint') {
            setComplaint({ open: true, reason: '' });
          }

          if (settings.autoSpeak && voiceOutputSupported) {
            speakMsg(jarvisReply);
          }
          setThinking(false);
          return;
        }
      } catch (err) {
        console.warn("Mizan AI ulanmadi, lokal tizimga o'tildi:", err.message);
      }
      setThinking(false);
    }

    // Lokal qoidalar asosidagi tezkor yordamchi (xarajat/daromad kiritish va oflayn rejim)
    const data = { transactions: store.transactions, debts: store.debts, goals: store.goals, profile: store.profile };
    const { reply, pending: next } = respond(input, { data, today: todayISO(), pending });
    actions.pushMessage(reply);
    if (settings.autoSpeak && voiceOutputSupported) {
      speakMsg(reply);
    }
    actions.setPending(next);
  };

  const sendRef = useRef(null);
  useEffect(() => { sendRef.current = send; });

  const startListening = () => {
    setNotice('');
    setListening(true);
    stopRef.current = listen({
      lang: settings.voiceLang,
      onResult: (t, final) => {
        setText(t);
        if (final && t.trim()) sendRef.current?.(t);
      },
      onEnd: () => setListening(false),
      onError: (code) => {
        setListening(false);
        if (code === 'not-allowed' || code === 'service-not-allowed') setNotice("Mikrofonga ruxsat berilmadi. Matn yozib kiritishingiz mumkin.");
        else if (code === 'no-speech') setNotice("Ovoz eshitilmadi. Qayta urinib ko'ring yoki yozib kiriting.");
        else if (code === 'audio-capture') setNotice("Mikrofon topilmadi yoki band. Ulanganini tekshiring yoki yozib kiriting.");
        else if (code === 'network') setNotice("Brauzer ovozni tanish xizmatiga ulana olmadi. Yozib kiriting.");
        else setNotice("Ovozni tanib bo'lmadi. Yozib kiriting.");
      },
    });
  };

  const onMic = () => {
    if (listening) return stopRef.current?.();
    if (!settings.voiceConsent) return setConsent(true);
    startListening();
  };

  const lastId = chat[chat.length - 1]?.id;
  const pendingCount = chat.reduce((n, m) => n + (m.drafts?.filter((d) => d.status === 'pending').length || 0), 0);

  return (
    <div className="mx-auto flex h-[calc(100dvh-13rem)] max-w-3xl flex-col md:h-[calc(100dvh-12rem)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-[-0.02em] text-plaster">
            <Sparkles className="size-6 shrink-0 text-ochre" aria-hidden /> Mizan AI
          </h1>
          <p className="text-xs text-plaster/65 line-clamp-2">
            Jonli MB kurslari, O'zbekiston banklari, omonat/kredit foizlari va har qanday savol bo'yicha aqlli maslahatchi.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setComplaint({ open: true, reason: '' })} title="Shikoyat yoki murojaat yuborish" className="text-plaster/70 hover:text-plaster">
            <MessageSquareWarning className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPro(true)} className="shrink-0 whitespace-nowrap gap-1.5 border-ochre/40 text-ochre hover:bg-ochre/15">
            <Crown className="size-4 shrink-0" /> Pro Rejim
          </Button>
          {chat.length > 0 && (
            <Button variant="subtle" size="sm" onClick={actions.clearChat}>
              <Trash2 className="size-4" /> Tozalash
            </Button>
          )}
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col !p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {chat.length === 0 && (
            <div className="space-y-4 py-3">
              <div className="rounded-2xl border border-ochre/30 bg-gradient-to-br from-[#0c234f] to-[#071633] p-4 text-plaster">
                <div className="flex items-center gap-2 text-sm font-bold text-ochre">
                  <Sparkles className="size-4" /> Salom! Men Mizan AI — shaxsiy moliyaviy maslahatchiman.
                </div>
                <p className="mt-1.5 text-xs text-plaster/80 leading-relaxed">
                  Ovoz bilan gapiring yoki matn yozing. Men jonli internet ma'lumotlariga ulanib, O'zbekistondagi barcha banklar (Uzum Bank, TBC, Anorbank, Kapitalbank, Ipak Yo'li, AVO va boshqalar), karta ochish shartlari, omonat/kredit foizlari, muddatli to'lovlar hamda do'kon narxlarini solishtirib eng foydali yo'lni ko'rsataman.
                </p>
              </div>

              <p className="flex items-start gap-2 rounded-xl border border-plaster/10 bg-[#071633]/80 px-3 py-2.5 text-[11px] text-plaster/60">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-turq-soft" aria-hidden />
                Xavfsizlik: Xarajatlar siz tasdiqlamaguningizcha bazaga yozilmaydi. Bank parollari yoki SMS kodlar hech qachon so'ralmaydi.
              </p>
            </div>
          )}

          {chat.map((m) => (
            <Bubble
              key={m.id}
              msg={m}
              lastId={lastId}
              onChoice={send}
              onSpeak={speakMsg}
              onStopSpeak={stopSpeak}
              speakingId={speakingId}
              go={go}
              animations={settings.animations}
              onOpenComplaint={(reason) => setComplaint({ open: true, reason })}
            />
          ))}

          {banned && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 p-3.5 text-xs text-rose-200">
              <div className="font-bold">AI suhbati qoidalarni buzganlik sababli vaqtincha cheklandi.</div>
              <p className="mt-1 opacity-85">Agar bu xatolik deb hisoblasangiz, shikoyat oynasi orqali murojaat yuboring.</p>
              <Button size="sm" variant="outline" className="mt-2 border-rose-400/40 text-rose-100" onClick={() => setComplaint({ open: true, reason: 'AI cheklovi yuzasidan apellyatsiya' })}>
                <MessageSquareWarning className="size-3.5" /> Shikoyat oynasini ochish
              </Button>
            </div>
          )}

          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-ochre/30 bg-[#0A1F45]/90 px-4 py-3 text-xs text-ochre font-medium shadow-md">
                <Loader2 className="size-4 animate-spin text-ochre" />
                <span>Mizan AI ma'lumotlaringizni tahlil qilmoqda...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {(notice || pendingCount > 0) && (
          <div className="border-t border-plaster/12 px-4 py-2 text-xs text-plaster/70">
            {notice || `${pendingCount} ta yozuv tasdiq kutmoqda. Saqlash tugmasini bosmaguningizcha hech narsa saqlanmaydi.`}
          </div>
        )}

        <form
          className="flex items-end gap-2 border-t border-plaster/12 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {voiceInputSupported ? (
            <button
              type="button"
              onClick={onMic}
              aria-label={listening ? "Yozishni to'xtatish" : 'Ovoz bilan kiritish'}
              className={`relative flex size-11 shrink-0 items-center justify-center rounded-full transition ${listening ? 'bg-rose-600 text-white' : 'border border-plaster/14 bg-[#071633] text-plaster/80 hover:border-ochre/45 hover:text-plaster'}`}
            >
              {listening && settings.animations && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />}
              {listening ? <MicOff className="relative size-5" /> : <Mic className="size-5" />}
            </button>
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-plaster/10 bg-[#071633] text-plaster/30" title="Bu brauzer ovozli kiritishni qo'llamaydi. Chrome yoki Edge'dan foydalaning.">
              <MicOff className="size-5" />
            </span>
          )}
          <textarea
            ref={textRef}
            rows={1}
            className={`${inputCls} max-h-32 min-h-11 flex-1 resize-none overflow-hidden py-2.5 leading-snug`}
            placeholder={listening ? 'Eshityapman...' : 'Savol yoki xarajat yozing...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type="submit" aria-label="Yuborish" disabled={!text.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-turq text-cobalt-night transition hover:bg-[#32BDB6] disabled:opacity-40">
            <Send className="size-5" />
          </button>
        </form>
      </Card>

      {consent && (
        <Modal title="Mikrofondan foydalanish" onClose={() => setConsent(false)}>
          <div className="space-y-3 text-sm text-plaster/80">
            <p>
              Ovoz bilan kiritish uchun brauzer mikrofonga ruxsat so'raydi. Ovoz brauzerning nutqni tanish xizmati orqali matnga aylantiriladi (Chrome'da bu xizmat Google serverlari orqali
              ishlashi mumkin).
            </p>
            <p>
              <b>Mizan ovozni yozib olmaydi va saqlamaydi.</b> Faqat matn qoladi va siz uni tasdiqlamaguningizcha yozuv saqlanmaydi. Xohlasangiz, hamma narsani yozib ham kiritishingiz mumkin.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-plaster/55 uppercase">Gapirish tili</span>
              <select className={inputCls} value={settings.voiceLang} onChange={(e) => actions.setSetting('voiceLang', e.target.value)}>
                {VOICE_LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-lg border border-ochre/30 bg-ochre/12 px-3 py-2 text-xs text-[#F2C46B]">
              O'zbek tilini tanish sifati qurilma va brauzerga bog'liq va ba'zan xato qiladi. Shuning uchun har doim tasdiqlash oynasida summani tekshiring.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setConsent(false)}>
                Yozib kiritaman
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  actions.setSetting('voiceConsent', true);
                  setConsent(false);
                  startListening();
                }}
              >
                Roziman, yoqish
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ProModal open={showPro} onClose={() => setShowPro(false)} />
      <ComplaintModal open={complaint.open} initialReason={complaint.reason} onClose={() => setComplaint({ open: false, reason: '' })} />
    </div>
  );
}
