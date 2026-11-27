import { useState } from 'react';
import { Check, Crown, Sparkles, X, Zap, Shield, Store, Users, FileText } from 'lucide-react';
import { useStore } from '../store';

export default function ProModal({ open, onClose }) {
  const { profile, actions } = useStore();
  const isPro = !!profile?.isPro;
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const togglePro = () => {
    actions.updateProfile({ isPro: !isPro });
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  const features = [
    {
      title: "Mizan AI — Aqlli Moliyaviy Maslahatchi",
      desc: "O'zbekistondagi barcha bozorlar (Malika, Abu Saxiy) va muddatli to'lovlar (Uzum Nasiya, Alif Nasiya, Iman Pay) bo'yicha cheksiz hisob-kitob va solishtirish.",
      free: "3 ta sinov",
      pro: "Cheksiz, 24/7",
      icon: Sparkles,
    },
    {
      title: "Katta xaridlar simulyatori (iPhone, Mashina, Uy)",
      desc: "Aniq kunlik va oylik jamg'arma grafigi, xarid vaqtini belgilash va byudjetga yukini hisoblash.",
      free: "Yo'q",
      pro: "To'liq mavjud",
      icon: Zap,
    },
    {
      title: "Chek va kvitansiyalarni AI orqali skanerlash",
      desc: "Do'kon va bozor cheklarini rasmga olib, xarajatlarni 1 soniyada avtomatik toifalashtirish.",
      free: "Yo'q",
      pro: "Mavjud",
      icon: FileText,
    },
    {
      title: "Oilaviy umumiy byudjet (Multi-Device)",
      desc: "Er-xotin yoki oila a'zolari bitta hamyonni birgalikda o'z telefonlaridan boshqarishi.",
      free: "Faqat 1 kishi",
      pro: "5 tagacha a'zo",
      icon: Users,
    },
    {
      title: "Shaxsiy moliyaviy audit va PDF hisobot",
      desc: "Oylik teshiklarni aniqlash, qayerda ortiqcha xarajat bo'lganini chuqur tahlil qiluvchi audit.",
      free: "Oddiy ko'rinish",
      pro: "To'liq eksport",
      icon: Shield,
    },
    {
      title: "Hamkor do'konlardan chegirma va vaucherlar",
      desc: "Texnomart, Mediapark, Olcha, Asaxiy va bank hamkorlarda Mizan foydalanuvchilari uchun maxsus keshbek va 0% aksiyalar.",
      free: "Yo'q",
      pro: "10% gacha keshbek",
      icon: Store,
    },
    {
      title: "Mizan Biznes & B2B Moliyaviy Tahlil",
      desc: "Kichik biznes, do'kon va frilanserlar uchun kassa oqimi, soliq eslatmalari va xodimlar byudjeti.",
      free: "Shaxsiy",
      pro: "Biznes moduli",
      icon: Crown,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-ochre/40 bg-[#061126] p-6 sm:p-8 text-plaster shadow-2xl">
        {/* Orqa fon nur bezaklari */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-ochre/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-turq/20 blur-3xl" />

        {/* Yopish tugmasi */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-plaster/60 hover:bg-plaster/10 hover:text-plaster transition"
          aria-label="Yopish"
        >
          <X className="size-5" />
        </button>

        {/* Sarlavha */}
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ochre to-amber-600 shadow-lg shadow-ochre/30">
            <Crown className="size-6 text-cobalt-night" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-plaster">Mizan Pro</h2>
              <span className="rounded-full bg-ochre/20 border border-ochre/40 px-2.5 py-0.5 text-xs font-semibold text-ochre uppercase">
                Max Daraja
              </span>
            </div>
            <p className="text-xs text-plaster/70">
              Oddiy hisob-kitobdan — shaxsiy aqlli moliyaviy imperiyaga o'ting
            </p>
          </div>
        </div>

        {/* Taqqoslash ro'yxati */}
        <div className="mt-6 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="flex items-start justify-between gap-4 rounded-2xl border border-plaster/10 bg-[#091b3a]/70 p-3.5 transition hover:border-ochre/30"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-plaster/5 p-2 text-ochre">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-plaster">{f.title}</h3>
                    <p className="mt-0.5 text-xs text-plaster/65 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block rounded-lg bg-ochre/15 border border-ochre/35 px-2 py-1 text-xs font-bold text-ochre">
                    {f.pro}
                  </span>
                  <div className="mt-1 text-[10px] text-plaster/40">Bepulda: {f.free}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Narx va faollashtirish */}
        <div className="mt-6 border-t border-plaster/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-plaster">19 000</span>
              <span className="text-xs text-plaster/65">so'm / oyiga</span>
              <span className="text-xs text-turq font-medium">(yoki yiliga 149 000)</span>
            </div>
            <p className="text-[11px] text-plaster/50">
              Hakamlar va test ishtirokchilari uchun faollashtirish 100% bepul
            </p>
          </div>

          <button
            type="button"
            onClick={togglePro}
            className={`flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold text-sm transition shadow-lg ${
              isPro
                ? 'bg-plaster/15 text-plaster hover:bg-plaster/25'
                : 'bg-gradient-to-r from-ochre via-amber-500 to-ochre text-cobalt-night hover:opacity-95 shadow-ochre/30'
            }`}
          >
            {success ? (
              <>
                <Check className="size-4" /> Bajarildi!
              </>
            ) : isPro ? (
              'Pro faollashgan (O\'chirish)'
            ) : (
              <>
                <Crown className="size-4" /> Mizan Pro ni faollashtirish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
