import { useEffect, useState } from 'react';
import { Check, Clock, Crown, Lock, X } from 'lucide-react';
import { api } from '../lib/api';
import { DEMO, useStore } from '../store';
import ReferralBlock from './ReferralBlock';

// HALOL RO'YXAT. Har qator kod bilan solishtirilgan:
//  'bor'    — ilovada hozir ishlaydi (qaerda: izohda),
//  'tez'    — kod hali yo'q, ustida ishlanadi,
//  'rejada' — hamkor shartnomasi yoki alohida ish kerak, muddat va'da qilinmaydi.
// Yangi imkoniyat qo'shilganda faqat u kodda haqiqatan ishlasa 'bor' deb belgilang.
const PRO_FEATURES = [
  {
    id: 'ai',
    status: 'bor',
    title: 'Mizan AI maslahatchi',
    desc: "Moliyaviy savollarga javob, xarid va muddatli to'lov variantlarini solishtirish. Javoblar taxminiy: narxni sotuvchida tekshiring.",
    where: 'Yordamchi bo‘limi',
  },
  {
    id: 'plan',
    status: 'bor',
    title: "Maqsad bo'yicha jamg'arma rejasi",
    desc: "Summa va sanani kiriting: kuniga, haftasiga va oyiga qancha yig'ish kerakligi hisoblanadi.",
    where: 'Maqsadlar sahifasi',
  },
  {
    id: 'scan',
    status: 'bor',
    title: 'Chekni rasmdan o‘qish (AI)',
    desc: "Chek rasmidan summa va nomni taklif qiladi. Saqlashdan oldin tekshiring: aniqlik cheklangan.",
    where: 'Tez kiritish',
  },
  {
    id: 'health',
    status: 'bor',
    title: 'Moliyaviy salomatlik bahosi',
    desc: "Daromad, xarajat va qarzlar asosida umumiy baho va maslahatlar.",
    where: 'Bosh sahifa',
  },
  {
    id: 'export',
    status: 'bor',
    title: "Ma'lumotni CSV va JSON ga yuklab olish",
    desc: "Yozuvlar va to'liq nusxa fayl sifatida yuklanadi, keyin qayta tiklash mumkin.",
    where: 'Sozlamalar va Hisobot',
  },
  {
    id: 'pdf',
    status: 'tez',
    title: 'PDF hisobot',
    desc: "Oylik hisobotni PDF qilib yuklab olish. Hozircha faqat CSV va JSON bor.",
  },
  {
    id: 'family',
    status: 'tez',
    title: 'Oilaviy umumiy byudjet',
    desc: "Bir nechta kishi bitta hamyonni birga yuritishi. Hozircha har hisob alohida.",
  },
  {
    id: 'partners',
    status: 'rejada',
    title: "Hamkor do'kon va banklardan chegirma, keshbek",
    desc: "Hamkorlar bilan shartnoma tuzilgach. Hozir bunday chegirma yoki keshbek yo'q va va'da qilinmaydi.",
  },
  {
    id: 'biz',
    status: 'rejada',
    title: 'Kichik biznes uchun modul',
    desc: "Kassa oqimi va soliq eslatmalari. Hozir ilova faqat shaxsiy moliya uchun.",
  },
];

const STATUS = {
  bor: { label: 'Mavjud', cls: 'border-turq/40 bg-turq/15 text-turq-soft', Icon: Check },
  tez: { label: 'Tez orada', cls: 'border-ochre/40 bg-ochre/15 text-ochre', Icon: Clock },
  rejada: { label: 'Rejada', cls: 'border-plaster/20 bg-plaster/10 text-plaster/70', Icon: Clock },
};

const PROVIDERS = [
  { id: 'payme', name: 'Payme' },
  { id: 'click', name: 'Click' },
  { id: 'uzum', name: 'Uzum Pay' },
];

const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

export default function ProModal({ open, onClose }) {
  const { auth, pro, actions } = useStore();
  const signedIn = auth.status === 'in';
  const [plan, setPlan] = useState('monthly');
  const [opts, setOpts] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || DEMO) return undefined;
    let off = false;
    setMsg('');
    setErr('');
    api
      .proOptions()
      .then((r) => !off && setOpts(r))
      .catch(() => !off && setOpts({ plans: null, providers: {}, demo: false, demoDays: 7 }));
    return () => {
      off = true;
    };
  }, [open]);

  if (!open) return null;

  const plans = {
    monthly: { amount: opts?.plans?.monthly?.amount ?? 19000, label: 'Oylik', per: "so'm / oy" },
    yearly: { amount: opts?.plans?.yearly?.amount ?? 149000, label: 'Yillik', per: "so'm / yil" },
  };

  const startCheckout = async (provider) => {
    setBusy(provider);
    setErr('');
    try {
      const r = await api.proCheckout(plan, provider);
      window.location.assign(r.url); // to'lov provayderning o'z sahifasida bo'ladi
    } catch (e) {
      setErr(e.message || "To'lovni boshlab bo'lmadi.");
      setBusy('');
    }
  };

  const startDemo = async () => {
    setBusy('demo');
    setErr('');
    setMsg('');
    try {
      const r = await api.proDemo();
      await actions.refreshUser();
      setMsg(`Sinov rejimi yoqildi: ${r.days} kunlik Pro (haqiqiy pul yechilmadi).`);
    } catch (e) {
      setErr(e.message || 'Sinov rejimini yoqib bo‘lmadi.');
    } finally {
      setBusy('');
    }
  };

  const goSignIn = () => {
    onClose();
    window.location.hash = 'sozlamalar';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Mizan Pro">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-ochre/40 bg-[#061126] p-6 sm:p-8 text-plaster shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-ochre/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-turq/20 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-10 rounded-full p-2 text-plaster/60 hover:bg-plaster/10 hover:text-plaster transition"
          aria-label="Yopish"
        >
          <X className="size-5" />
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ochre to-amber-600 shadow-lg shadow-ochre/30">
            <Crown className="size-6 text-cobalt-night" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-plaster">Mizan Pro</h2>
            <p className="text-xs text-plaster/70">Nimalar bor va nimalar hali yo'qligini ochiq aytamiz</p>
          </div>
        </div>

        {pro.isPro && (
          <p className="relative mt-4 rounded-xl border border-turq/35 bg-turq/12 px-3 py-2 text-sm text-turq-soft">
            {pro.sample
              ? "Namuna oynasi: bu yerda Pro faqat ko'rsatish uchun yoqilgan."
              : `Pro faol${pro.proUntil ? `: ${fmtDate(pro.proUntil)} gacha` : ''}. Yangi to'lov yoki bonus mavjud muddat ustiga qo'shiladi.`}
          </p>
        )}

        {/* Halol ro'yxat */}
        <p className="relative mt-5 rounded-xl border border-plaster/12 bg-plaster/5 px-3 py-2 text-xs leading-relaxed text-plaster/75">
          Hozircha «Mavjud» deb belgilangan imkoniyatlar hamma uchun ochiq. Pro obunasi loyihani qo'llab-quvvatlaydi; «Tez orada» va «Rejada» imkoniyatlari tayyor
          bo'lganda Pro foydalanuvchilariga kiritish rejalashtirilgan, aniq muddat va'da qilinmaydi.
        </p>
        <div className="relative mt-4 space-y-2.5">
          {PRO_FEATURES.map((f) => {
            const st = STATUS[f.status];
            const Icon = st.Icon;
            return (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-2xl border border-plaster/10 bg-[#091b3a]/70 p-3.5">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-plaster">{f.title}</h3>
                  <p className="mt-0.5 text-xs text-plaster/65 leading-relaxed">{f.desc}</p>
                  {f.where && <p className="mt-1 text-[10px] text-plaster/40">{f.where}</p>}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${st.cls}`}>
                  <Icon className="size-3" aria-hidden /> {st.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tarif va to'lov */}
        <div className="relative mt-6 border-t border-plaster/10 pt-5">
          <h3 className="text-sm font-bold text-plaster">1. Tarifni tanlang</h3>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tarif">
            {Object.entries(plans).map(([id, p]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={plan === id}
                onClick={() => setPlan(id)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  plan === id ? 'border-ochre bg-ochre/15 ring-2 ring-ochre/30' : 'border-plaster/15 bg-plaster/5 hover:border-ochre/40'
                }`}
              >
                <div className="text-xs text-plaster/70">{p.label}</div>
                <div className="font-display text-xl font-bold text-plaster">{money(p.amount)}</div>
                <div className="text-[11px] text-plaster/55">{p.per}</div>
              </button>
            ))}
          </div>

          <h3 className="mt-5 text-sm font-bold text-plaster">2. To'lov usuli</h3>
          {DEMO ? (
            <p className="mt-2 text-xs text-plaster/65">Namuna oynasida to'lov qilib bo'lmaydi. Haqiqiy ilovada hisob ochib, shu yerdan to'lang.</p>
          ) : !signedIn ? (
            <div className="mt-2 rounded-2xl border border-plaster/12 bg-plaster/5 p-3">
              <p className="text-xs text-plaster/75">Pro muddati hisobingizga bog'lanadi, shuning uchun avval hisob oching yoki kiring.</p>
              <button
                type="button"
                onClick={goSignIn}
                className="mt-2 rounded-xl bg-gradient-to-r from-ochre via-amber-500 to-ochre px-4 py-2 text-sm font-semibold text-cobalt-night"
              >
                Hisob ochish yoki kirish
              </button>
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {PROVIDERS.map((p) => {
                const on = Boolean(opts?.providers?.[p.id]);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!on || Boolean(busy)}
                    onClick={() => startCheckout(p.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      on ? 'border-turq/45 bg-turq/12 hover:bg-turq/20' : 'cursor-not-allowed border-plaster/10 bg-plaster/[0.03] opacity-70'
                    }`}
                  >
                    <div className="text-sm font-bold text-plaster">{busy === p.id ? 'Yo‘naltirilmoqda…' : p.name}</div>
                    <div className="mt-0.5 text-[11px] text-plaster/60">{on ? "To'lov sahifasiga o'tasiz" : "Tez orada (shartnoma jarayonida)"}</div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-plaster/55">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            To'lov tanlangan xizmatning o'z sahifasida bajariladi. Mizan karta raqami, amal qilish muddati yoki CVV so'ramaydi va saqlamaydi.
          </p>

          {opts?.demo && signedIn && !DEMO && (
            <div className="mt-4 rounded-2xl border border-dashed border-ochre/50 bg-ochre/10 p-3">
              <p className="text-xs font-bold text-ochre">Sinov rejimi</p>
              <p className="mt-1 text-xs text-plaster/75">
                Haqiqiy pul yechilmaydi. Tugma {opts.demoDays} kunlik Pro muddatini serverda qo'yadi (har hisob uchun bir marta).
              </p>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={startDemo}
                className="mt-2 rounded-xl border border-ochre/60 px-4 py-2 text-sm font-semibold text-ochre transition hover:bg-ochre/15 disabled:opacity-60"
              >
                {busy === 'demo' ? 'Yoqilmoqda…' : `Sinov rejimi: to'lovsiz ${opts.demoDays} kunlik Pro`}
              </button>
            </div>
          )}

          {msg && <p className="mt-3 rounded-lg border border-turq/30 bg-turq/15 px-3 py-2 text-sm text-turq-soft">{msg}</p>}
          {err && <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-200" role="alert">{err}</p>}
        </div>

        {/* Referal */}
        <div className="relative mt-6 border-t border-plaster/10 pt-5">
          <ReferralBlock />
        </div>
      </div>
    </div>
  );
}
