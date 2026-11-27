import { useEffect, useRef, useState } from 'react';
import { Check, Crown, Loader2, Mic, MicOff, Send, ShieldCheck, Sparkles, Trash2, Volume2, X, Zap } from 'lucide-react';
import { Badge, Button, Card, Modal, MoneyInput, inputCls } from '../components/ui';
import ProModal from '../components/ProModal';
import { api } from '../lib/api';
import { respond } from '../lib/assistant/assistant';
import { categoryLabel, methodLabel } from '../lib/categories';
import { addDays, dateLabel, formatDigitsInput, money, parseDigits, todayISO, uid } from '../lib/format';
import { findVoice, listen, speak, stopSpeaking, voiceInputSupported, voiceOutputSupported, VOICE_LANGS } from '../lib/voice';
import { useStore } from '../store';

const SUGGESTIONS = [
  "iPhone 17 olmoqchiman: qancha yig'sam bo'ladi va Malika yaxshimi yoki Uzum Nasiyami?",
  "Qayerdan pul tejashim mumkin? Tahlil qilib ber",
  "Nasiyaga (muddatli to'lov) olgan ma'qulmi yoki naqd yig'ganmi?",
  "Bugun yo'lga 12 ming sarfladim",
  "Pulim nimaga ko'p ketdi?",
  "50 ming sarflasam, maqsadim nima bo'ladi?",
];

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

function JarvisActionCard({ action, msgId }) {
  const { actions } = useStore();
  const [added, setAdded] = useState(false);

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
          <Sparkles className="size-4" /> Mizan Jarvis Taklifi
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
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="font-bold text-ochre text-sm mt-2">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-ochre text-base mt-2.5">{trimmed.slice(3)}</h3>;
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

function Bubble({ msg, onChoice, onSpeak, lastId }) {
  const mine = msg.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${mine ? 'rounded-br-md border border-ochre/35 bg-cobalt text-plaster' : 'rounded-bl-md border border-plaster/12 bg-[#0A1F45]/90 text-plaster/90'}`}>
        <FormattedText text={msg.text} />
        {msg.drafts?.map((d) => (
          <DraftCard key={d.id} draft={d} msgId={msg.id} />
        ))}
        {msg.action && <JarvisActionCard action={msg.action} msgId={msg.id} />}
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
          <button type="button" onClick={() => onSpeak(msg)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-plaster/55 hover:text-plaster">
            <Volume2 className="size-3.5" /> O'qib berish
          </button>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const store = useStore();
  const { chat, pending, settings, actions } = store;
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showPro, setShowPro] = useState(false);
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

  const isAdviceOrComplex = (str) => {
    const s = str.toLowerCase();
    return (
      s.includes('iphone') ||
      s.includes('olmoqchiman') ||
      s.includes('nasiya') ||
      s.includes('malika') ||
      s.includes('abu saxiy') ||
      s.includes('qayerdan') ||
      s.includes('tavsiya') ||
      s.includes('maslahat') ||
      s.includes('jarvis') ||
      s.includes('qancha yig') ||
      s.includes('solishtir') ||
      s.includes('qachon olaman') ||
      s.includes('tejash') ||
      s.includes('qimmat') ||
      s.includes('arzon') ||
      s.includes('uzum') ||
      s.includes('alif') ||
      s.includes('iman') ||
      s.includes('mashina') ||
      s.includes('telefon')
    );
  };

  const send = async (raw) => {
    const input = (raw ?? text).trim();
    if (!input || thinking) return;

    actions.pushMessage({ id: uid(), role: 'user', text: input });
    setText('');
    setNotice('');

    // Agar savol maslahat, bozor yoki katta xarid (iPhone, nasiya, tejash) bo'lsa — Gemini Jarvis AI ga yuboramiz
    if (isAdviceOrComplex(input)) {
      setThinking(true);
      try {
        const totalCards = (store.cards || []).reduce((s, c) => s + (Number(c.balance) || 0), 0);
        const monthExp = (store.transactions || [])
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const context = {
          balance: totalCards,
          dailyLimit: 85000,
          todaySpent: 0,
          monthExpense: monthExp,
          goals: (store.goals || []).map((g) => ({ name: g.name, target: g.target, saved: g.saved })),
          debts: (store.debts || []).map((d) => ({ person: d.person, amount: d.amount, direction: d.direction })),
          profile: store.profile,
        };

        const res = await api.askJarvis(input, context);
        if (res?.ok && res.text) {
          const jarvisReply = {
            id: uid(),
            role: 'assistant',
            lang: 'uz',
            text: res.text,
            action: res.action,
          };
          actions.pushMessage(jarvisReply);
          if (settings.autoSpeak && voiceOutputSupported) {
            speak(res.text, 'uz');
          }
          setThinking(false);
          return;
        }
      } catch (err) {
        console.warn('Jarvis AI ulanmadi, lokal tizimga o\'tildi:', err.message);
      }
      setThinking(false);
    }

    // Lokal qoidalar asosidagi tezkor yordamchi (xarajat/daromad kiritish va sodda hisobotlar)
    const data = { transactions: store.transactions, debts: store.debts, goals: store.goals, profile: store.profile };
    const { reply, pending: next } = respond(input, { data, today: todayISO(), pending });
    actions.pushMessage(reply);
    if (settings.autoSpeak && voiceOutputSupported) {
      if (!speak(reply.text, reply.lang)) setNotice("Qurilmangizda bu til uchun ovoz o'rnatilmagan, shuning uchun o'qib bera olmayman.");
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

  const speakMsg = (msg) => {
    const ok = speak(msg.text, msg.lang);
    if (!ok) setNotice(findVoice(msg.lang) ? '' : "Qurilmangizda bu til uchun ovoz o'rnatilmagan, shuning uchun o'qib bera olmayman.");
  };

  const lastId = chat[chat.length - 1]?.id;
  const pendingCount = chat.reduce((n, m) => n + (m.drafts?.filter((d) => d.status === 'pending').length || 0), 0);

  return (
    <div className="mx-auto flex h-[calc(100dvh-10.5rem)] max-w-3xl flex-col md:h-[calc(100dvh-11.5rem)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-[-0.02em] text-plaster">
            <Sparkles className="size-6 text-ochre" aria-hidden /> Mizan Jarvis AI
          </h1>
          <p className="text-xs text-plaster/65">
            O'zbekiston bozorlari (Malika, Abu Saxiy), muddatli to'lovlar (Uzum, Alif) va xarid strategiyasi bo'yicha shaxsiy maslahatchingiz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPro(true)} className="gap-1.5 border-ochre/40 text-ochre hover:bg-ochre/15">
            <Crown className="size-4" /> Pro Rejim
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
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-ochre/30 bg-gradient-to-br from-[#0c234f] to-[#071633] p-4 text-plaster">
                <div className="flex items-center gap-2 text-sm font-bold text-ochre">
                  <Sparkles className="size-4" /> Salom! Men Mizan Jarvis — sizning shaxsiy moliyaviy agentingizman.
                </div>
                <p className="mt-1.5 text-xs text-plaster/80 leading-relaxed">
                  Menga har qanday moliyaviy maqsadingizni ayting: masalan, <strong>iPhone 17</strong> yoki mashina olmoqchi bo'lsangiz, kunlik qancha yig'ishingizni, 
                  <strong> Malika bozoridan naqd</strong> olish arzonmi yoki <strong>Uzum Nasiya / Alif</strong> orqali olish ma'qulmi — hammasini aniq hisoblab beraman!
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-plaster/14 bg-[#071633] px-3.5 py-1.5 text-xs font-medium text-plaster/85 transition hover:border-ochre/45 hover:bg-cobalt/60 hover:text-plaster text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <p className="flex items-start gap-2 rounded-xl border border-plaster/10 bg-[#071633]/80 px-3 py-2.5 text-[11px] text-plaster/60">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-turq-soft" aria-hidden />
                Xavfsizlik: Xarajatlar siz tasdiqlamaguningizcha bazaga yozilmaydi. Bank parollari yoki SMS kodlar hech qachon so'ralmaydi.
              </p>
            </div>
          )}

          {chat.map((m) => (
            <Bubble key={m.id} msg={m} lastId={lastId} onChoice={send} onSpeak={speakMsg} />
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-ochre/30 bg-[#0A1F45]/90 px-4 py-3 text-xs text-ochre font-medium shadow-md">
                <Loader2 className="size-4 animate-spin text-ochre" />
                <span>Mizan Jarvis moliyaviy ma'lumotlaringizni tahlil qilmoqda...</span>
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
            className={`${inputCls} max-h-32 min-h-11 flex-1 resize-none`}
            placeholder={listening ? 'Eshityapman...' : 'Xarajat yozing yoki savol bering'}
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
    </div>
  );
}
