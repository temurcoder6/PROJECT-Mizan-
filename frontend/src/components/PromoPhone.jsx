import { useEffect, useState } from 'react';
import { ArrowRight, Check, HandCoins, ListChecks, Mic, Repeat, ShieldCheck, Trophy, Wallet } from 'lucide-react';
import { money } from '../lib/format';
import { useStore } from '../store';
import Phone3D from './Phone3D';

const TURQ = '#7FD3CE'; // firuza: har sahnada faqat bitta jonli/harakatlanuvchi element
const CHALK = '#F4F1EA';
const DURATIONS = [5200, 5800, 6400, 5400, 5400, 4600];
const CAPTIONS = [
  "Oy oxirida «pulim qayerga ketdi?» deb o'ylab qolasiz.",
  "Mizan bugun qancha sarflash mumkinligini hisobi bilan ko'rsatadi.",
  'Xarajat: summa yozing, toifani bosing. Reja darhol yangilanadi.',
  "Telefon uchun yig'ayapsizmi? Haftasiga qancha kerakligi aniq.",
  "Qarz, davriy to'lov, hisobot va yordamchi bir joyda.",
  "Mizan. Sinab ko'ring.",
];

function useCount(target, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    let t0;
    const step = (t) => {
      if (t0 === undefined) t0 = t;
      const p = Math.min((t - t0) / ms, 1);
      setV(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const Delay = ({ ms, className = '', children }) => (
  <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${ms}ms` }}>
    {children}
  </div>
);

function Problem() {
  return (
    <div className="p-5 text-white">
      <h3 className="font-display tracking-[-0.02em] text-[1.9rem] leading-[1.1] font-bold">«Pulim qayerga ketdi?»</h3>
      <div className="mt-6 space-y-2.5">
        <Delay ms={500} className="rounded-2xl bg-white/10 p-3.5">
          <p className="text-[11px] text-white/60">Kartada qoldi</p>
          <p className="text-xl font-bold tabular-nums">38 000 so'm</p>
        </Delay>
        <Delay ms={1500} className="rounded-2xl bg-white/10 p-3.5">
          <p className="text-[11px] text-white/60">Maosh tushishiga</p>
          <p className="text-xl font-bold">9 kun bor</p>
        </Delay>
        <Delay ms={2500} className="rounded-2xl bg-white/10 p-3.5">
          <p className="text-[11px] text-white/60">Nimaga ketgani</p>
          <p className="text-xl font-bold">Bilmayman...</p>
        </Delay>
      </div>
      <Delay ms={3500}>
        <p className="mt-6 text-[13px] text-white/60">Daftar yuritish charchatadi. Naqd pul esa hech qayerda ko'rinmaydi.</p>
      </Delay>
    </div>
  );
}

function Plan() {
  const n = useCount(94444);
  return (
    <div className="p-5 text-white">
      <h3 className="font-display tracking-[-0.02em] text-2xl leading-tight font-bold">Bugun qancha sarflasam bo'ladi?</h3>
      <div className="mt-5 rounded-3xl border border-[#C9962B]/45 bg-[#0A1F45] p-5">
        <p className="text-[11px] text-[#F4F1EA]/70">Bugungi reja</p>
        <p className="text-[2.4rem] leading-none font-extrabold tabular-nums" style={{ color: TURQ }}>{money(n)}</p>
        <span className="mt-3 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold">Hisobi ochiq</span>
      </div>
      <div className="mt-3 space-y-1.5 rounded-2xl bg-white/10 p-3.5 text-[13px]">
        <Delay ms={1200} className="flex justify-between"><span className="text-white/70">Hozirgi pul</span><b className="tabular-nums">850 000</b></Delay>
        <Delay ms={1900} className="flex justify-between"><span className="text-white/70">Daromadgacha</span><b>9 kun</b></Delay>
        <Delay ms={2600} className="flex justify-between border-t border-white/15 pt-1.5"><span className="text-white/70">850 000 ÷ 9</span><b className="tabular-nums">94 444</b></Delay>
      </div>
      <Delay ms={3400}><p className="mt-3 text-[11px] text-white/50">Natija siz kiritgan pul va sanaga bog'liq.</p></Delay>
    </div>
  );
}

function Quick() {
  const [typed, setTyped] = useState(0);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [];
    for (let i = 1; i <= 6; i++) ts.push(setTimeout(() => setTyped(i), 500 + i * 170));
    ts.push(setTimeout(() => setStage(1), 2300));
    ts.push(setTimeout(() => setStage(2), 3000));
    return () => ts.forEach(clearTimeout);
  }, []);
  const chips = ['Oziq-ovqat', 'Transport', 'Bozor', 'Kommunal'];
  return (
    <div className="p-5 text-white">
      <h3 className="font-display tracking-[-0.02em] text-2xl leading-tight font-bold">Ikki bosish, tayyor.</h3>
      <div className="mt-5 rounded-2xl border border-ochre/35 bg-[#071633] p-4 text-plaster">
        <p className="text-[11px] font-semibold text-plaster/60">Summa</p>
        <p className="mt-1 h-8 rounded-lg border border-plaster/12 bg-[#050C1B] px-3 py-1 text-lg font-bold text-plaster tabular-nums">
          {'12 000'.slice(0, typed)}
          <span className="animate-pulse">|</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const hit = stage >= 1 && c === 'Transport';
            return (
              <span key={c} className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 ${hit ? 'scale-110 bg-[#1FA6A0] text-cobalt-night' : 'border border-plaster/15 bg-[#0A1F45] text-plaster/80'}`}>
                {c}
              </span>
            );
          })}
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-2 rounded-2xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-500 ${stage >= 2 ? 'translate-y-0 border border-[#C9962B]/40 bg-white/5 opacity-100' : 'translate-y-3 opacity-0'}`} style={{ color: CHALK }}>
        <Check className="size-4" /> Saqlandi: Transport 12 000
      </div>
      <div className={`mt-3 rounded-2xl bg-white/10 p-3.5 text-[13px] transition-opacity duration-500 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-white/60">Bugun uchun qoldi</p>
        <p className="text-xl font-bold tabular-nums">82 444 so'm</p>
      </div>
    </div>
  );
}

function Goal() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setP(0.2), 200);
    return () => clearTimeout(t);
  }, []);
  const c = 2 * Math.PI * 38;
  return (
    <div className="p-5 text-white">
      <h3 className="font-display tracking-[-0.02em] text-2xl leading-tight font-bold">Telefon uchun yig'ish</h3>
      <div className="mt-5 flex items-center gap-4 rounded-3xl bg-white/10 p-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 96 96" className="size-24 -rotate-90" aria-hidden>
            <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="10" />
            <circle cx="48" cy="48" r="38" fill="none" stroke={TURQ} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${p * c} ${c}`} style={{ transition: 'stroke-dasharray 1.6s ease-out' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">20%</span>
        </div>
        <div>
          <p className="text-[11px] text-white/60">Kerak</p>
          <p className="font-bold tabular-nums">3 000 000 so'm</p>
          <p className="mt-1.5 text-[11px] text-white/60">Haftasiga</p>
          <p className="font-bold tabular-nums" style={{ color: CHALK }}>186 667 so'm</p>
        </div>
      </div>
      <Delay ms={1600} className="mt-3 flex items-center gap-1.5">
        {[25, 50, 75, 100].map((m) => (
          <span key={m} className="flex size-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">{m}</span>
        ))}
        <Trophy className="ml-auto size-5 text-white/40" />
      </Delay>
      <Delay ms={2300}><p className="mt-3 text-[13px] text-white/70">Keyingi kichik qadam: shu hafta 186 667 qo'shing. Yozmagan kunlar maqsadga zarar qilmaydi.</p></Delay>
    </div>
  );
}

function All() {
  const cards = [
    [HandCoins, 'Qarz daftari', "Muddat eslatmasi"],
    [Repeat, "Davriy to'lovlar", 'Keyingi 30 kun'],
    [ListChecks, 'Hisobot', 'Hafta va oy'],
    [Mic, 'Yordamchi', 'Yozing yoki gapiring'],
  ];
  return (
    <div className="p-5 text-white">
      <h3 className="font-display tracking-[-0.02em] text-2xl leading-tight font-bold">Beshta bo'lim, bitta ilova.</h3>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {cards.map(([Icon, t, d], i) => (
          <Delay key={t} ms={400 + i * 450} className="rounded-2xl bg-white/10 p-3.5">
            <Icon className="size-5 text-[#F4F1EA]/80" strokeWidth={1.75} />
            <p className="mt-2 text-[13px] font-bold">{t}</p>
            <p className="text-[11px] text-white/60">{d}</p>
          </Delay>
        ))}
      </div>
      <Delay ms={2500} className="mt-4 flex items-start gap-2 rounded-2xl border border-[#C9962B]/40 bg-white/5 p-3.5 text-[13px]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#F4F1EA]/80" /> Bankka ulanmagan: hamma narsani o'zingiz kiritasiz.
      </Delay>
    </div>
  );
}

function Cta() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
      <Delay ms={100}>
        <span className="mx-auto flex size-16 items-center justify-center rounded-full text-[#0A1F45]" style={{ background: CHALK, boxShadow: 'inset 0 0 0 1px rgba(201,150,43,.6)' }}>
          <Wallet className="size-8" />
        </span>
      </Delay>
      <Delay ms={500}><h3 className="mt-5 font-display tracking-[-0.02em] text-4xl font-bold">Mizan</h3></Delay>
      <Delay ms={900}><p className="mt-2 font-display tracking-[-0.02em] text-xl text-[#F4F1EA]/80">Bugunni rejalang.</p></Delay>
      <Delay ms={1500}>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-[#071633]" style={{ background: TURQ }}>
          Sinab ko'ring <ArrowRight className="size-4" />
        </span>
      </Delay>
    </div>
  );
}

const SCENES = [Problem, Plan, Quick, Goal, All, Cta];

export default function PromoPhone() {
  const { settings } = useStore();
  const animate = settings.animations;
  const [scene, setScene] = useState(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return undefined;
    const t = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), DURATIONS[scene]);
    return () => clearTimeout(t);
  }, [scene, animate]);

  const Scene = SCENES[scene];
  return (
    <div>
      <Phone3D
        dark
        showCaption={false}
        screen={
          <div className="h-full bg-gradient-to-b from-[#0E2A5C] to-[#071633]">
            <Scene key={scene} />
          </div>
        }
      />
      <div className="mt-12 text-center">
        <p key={scene} className="animate-fade-up mx-auto min-h-10 max-w-[18rem] text-sm font-semibold text-white/90">{CAPTIONS[scene]}</p>
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Reklama bosqichlari">
          {SCENES.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={scene === i} aria-label={`${i + 1}-bosqich`} onClick={() => setScene(i)} className={`h-1.5 rounded-full transition-all ${scene === i ? 'w-6 bg-[#F4F1EA]' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">Reklama roligi (namuna raqamlar bilan). Haqiqiy ilovani yonidagi tablardan sinang.</p>
      </div>
    </div>
  );
}
