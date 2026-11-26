import { useEffect, useRef, useState } from 'react';
import { Check, Mic, MicOff, Send, ShieldCheck, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import { Badge, Button, Card, Modal, inputCls } from '../components/ui';
import { respond } from '../lib/assistant/assistant';
import { categoryLabel, methodLabel } from '../lib/categories';
import { dateLabel, money, todayISO, uid } from '../lib/format';
import { findVoice, listen, speak, stopSpeaking, voiceInputSupported, voiceOutputSupported, VOICE_LANGS } from '../lib/voice';
import { useStore } from '../store';

const SUGGESTIONS = [
  "Bugun yo'lga 12 ming sarfladim",
  'Pulim nimaga ko\'p ketdi?',
  'Qarzimdan qancha qoldi?',
  "Telefon olishga qancha yig'ishim kerak?",
  'Daromadim kamaydi',
  'Qayerda kamaytirsam bo\'ladi? Maslahat bering',
  "50 ming sarflasam, maqsadim rejasi nima bo'ladi?",
  'Сегодня потратил 20 тысяч на такси',
  'Spent 15k on lunch yesterday',
];

function DraftCard({ draft, msgId }) {
  const { actions } = useStore();
  const { data } = draft;
  const [edit, setEdit] = useState(false);
  const [local, setLocal] = useState(data);

  if (draft.status === 'saved') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <Check className="size-4" /> Saqlandi
      </div>
    );
  }
  if (draft.status === 'rejected') {
    return <div className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">Bekor qilindi, hech narsa saqlanmadi.</div>;
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
    <div className="mt-2 rounded-2xl bg-white p-3 text-slate-800 ring-1 ring-slate-200">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-emerald-700 uppercase">{title}</span>
        <Badge tone="amber">Tasdiq kutilmoqda</Badge>
      </div>
      {edit && canEditTx ? (
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} />
          <input
            className={inputCls}
            inputMode="numeric"
            value={local.amount}
            onChange={(e) => setLocal({ ...local, amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          />
        </div>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          {lines.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-semibold">{v}</dd>
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

function Bubble({ msg, onChoice, onSpeak, lastId }) {
  const mine = msg.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${mine ? 'rounded-br-md bg-emerald-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800'}`}>
        <p className="whitespace-pre-line">{msg.text}</p>
        {msg.drafts?.map((d) => (
          <DraftCard key={d.id} draft={d} msgId={msg.id} />
        ))}
        {msg.choices && msg.id === lastId && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.choices.map((c) => (
              <button key={c} type="button" onClick={() => onChoice(c)} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50">
                {c}
              </button>
            ))}
          </div>
        )}
        {!mine && voiceOutputSupported && (
          <button type="button" onClick={() => onSpeak(msg)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
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
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const stopRef = useRef(null);
  const bottomRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: settings.animations ? 'smooth' : 'auto', block: 'end' });
  }, [chat.length, settings.animations]);

  useEffect(() => () => {
    stopRef.current?.();
    stopSpeaking();
  }, []);

  const send = (raw) => {
    const input = (raw ?? text).trim();
    if (!input) return;
    const data = { transactions: store.transactions, debts: store.debts, goals: store.goals, profile: store.profile };
    actions.pushMessage({ id: uid(), role: 'user', text: input });
    const { reply, pending: next } = respond(input, { data, today: todayISO(), pending });
    actions.pushMessage(reply);
    if (settings.autoSpeak && voiceOutputSupported) {
      if (!speak(reply.text, reply.lang)) setNotice("Qurilmangizda bu til uchun ovoz o'rnatilmagan, shuning uchun o'qib bera olmayman.");
    }
    actions.setPending(next);
    setText('');
    setNotice('');
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
        // Gap tugagach o'zi yuboradi. Yozuv baribir tasdiq kartasi bilan chiqadi, tasdiqsiz hech narsa saqlanmaydi.
        if (final && t.trim()) sendRef.current?.(t);
      },
      onEnd: () => setListening(false),
      onError: (code) => {
        setListening(false);
        if (code === 'not-allowed' || code === 'service-not-allowed') setNotice("Mikrofonga ruxsat berilmadi. Matn yozib kiritishingiz mumkin.");
        else if (code === 'no-speech') setNotice("Ovoz eshitilmadi. Qayta urinib ko'ring yoki yozib kiriting.");
        else if (code === 'audio-capture') setNotice("Mikrofon topilmadi yoki band. Ulanganini tekshiring yoki yozib kiriting.");
        else if (code === 'network') setNotice("Brauzer ovozni tanish xizmatiga ulana olmadi (internet yoki brauzer cheklovi). Chrome yoki Edge'da urinib ko'ring, yoki yozib kiriting.");
        else if (code === 'language-not-supported') setNotice("Bu brauzer tanlangan tilda ovozni tanimaydi. Boshqa tilni tanlang yoki yozib kiriting.");
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
    <div className="mx-auto flex h-[calc(100dvh-9.5rem)] max-w-3xl flex-col lg:h-[calc(100dvh-6rem)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Sparkles className="size-6 text-emerald-600" aria-hidden /> Yordamchi
          </h1>
          <p className="text-xs text-slate-500">Yozuvni tayyorlaydi, siz tasdiqlamaguncha saqlamaydi. Hisob-kitobni dastur qiladi.</p>
        </div>
        {chat.length > 0 && (
          <Button variant="subtle" size="sm" onClick={actions.clearChat}>
            <Trash2 className="size-4" /> Tozalash
          </Button>
        )}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col !p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {chat.length === 0 && (
            <div className="space-y-4 py-2">
              <p className="text-slate-600">
                Salom! O'zbek (lotin va kirill), rus yoki ingliz tilida yozing yoki gapiring. Masalan:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800">
                    {s}
                  </button>
                ))}
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                Yordamchi shu qurilmada ishlaydi va yozuvlaringizni hech qayerga yubormaydi. Tushunmagan summani o'ylab topmaydi — so'raydi. Bu hali oddiy qoidalarga asoslangan yordamchi, katta
                til modeli emas, shuning uchun murakkab jumlalarni tushunmasligi mumkin.
              </p>
            </div>
          )}
          {chat.map((m) => (
            <Bubble key={m.id} msg={m} lastId={lastId} onChoice={send} onSpeak={speakMsg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {(notice || pendingCount > 0) && (
          <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
            {notice || `${pendingCount} ta yozuv tasdiq kutmoqda. Saqlash tugmasini bosmaguningizcha hech narsa saqlanmaydi.`}
          </div>
        )}

        <form
          className="flex items-end gap-2 border-t border-slate-100 p-3"
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
              className={`relative flex size-11 shrink-0 items-center justify-center rounded-full transition ${listening ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {listening && settings.animations && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />}
              {listening ? <MicOff className="relative size-5" /> : <Mic className="size-5" />}
            </button>
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-300" title="Bu brauzer ovozli kiritishni qo'llamaydi. Chrome yoki Edge'dan foydalaning.">
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
          <button type="submit" aria-label="Yuborish" disabled={!text.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40">
            <Send className="size-5" />
          </button>
        </form>
      </Card>

      {consent && (
        <Modal title="Mikrofondan foydalanish" onClose={() => setConsent(false)}>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Ovoz bilan kiritish uchun brauzer mikrofonga ruxsat so'raydi. Ovoz brauzerning nutqni tanish xizmati orqali matnga aylantiriladi (Chrome'da bu xizmat Google serverlari orqali
              ishlashi mumkin).
            </p>
            <p>
              <b>Mizan ovozni yozib olmaydi va saqlamaydi.</b> Faqat matn qoladi va siz uni tasdiqlamaguningizcha yozuv saqlanmaydi. Xohlasangiz, hamma narsani yozib ham kiritishingiz mumkin.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Gapirish tili</span>
              <select className={inputCls} value={settings.voiceLang} onChange={(e) => actions.setSetting('voiceLang', e.target.value)}>
                {VOICE_LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
    </div>
  );
}
