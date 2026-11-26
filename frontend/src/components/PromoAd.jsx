import { useEffect, useState } from 'react';
import { ArrowRight, Check, Mic, Wallet } from 'lucide-react';
import { money } from '../lib/format';
import { useStore } from '../store';
import Phone3D from './Phone3D';

const ACCENT = '#1FA6A0';
const DURATIONS = [5200, 5600, 6200, 4200];
const CAPTIONS = [
  "Oy oxirida pul qayerga ketganini bilmay qolasiz.",
  'Savol bering: Mizan bugungi rejani hisobi bilan aytadi.',
  'Gapiring: Mizan yozuvni tayyorlaydi, siz tasdiqlaysiz.',
  "Mizan. Sinab ko'ring.",
];

function useCount(target, ms = 1300, startAfter = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    let t0;
    const timer = setTimeout(() => {
      const step = (t) => {
        if (t0 === undefined) t0 = t;
        const p = Math.min((t - t0) / ms, 1);
        setV(Math.round(target * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, startAfter);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, ms, startAfter]);
  return v;
}

function Typed({ text, start = 300, speed = 38 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let iv;
    const t0 = Date.now() + start;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        const i = Math.min(Math.floor((Date.now() - t0) / speed) + 1, text.length);
        setN(i);
        if (i >= text.length) clearInterval(iv);
      }, speed);
    }, start);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [text, start, speed]);
  return <>{text.slice(0, n)}</>;
}

const Delay = ({ ms, className = '', children }) => (
  <div className={`animate-fade-up ${className}`} style={{ animationDelay: `${ms}ms` }}>
    {children}
  </div>
);

function Person({ mood = 'worried', speaking = false }) {
  const mouth =
    mood === 'worried' ? (
      <path d="M44 80 Q60 72 76 80" stroke="#7a3b25" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M44 74 Q60 90 76 74" stroke="#7a3b25" strokeWidth="3" fill="none" strokeLinecap="round" />
    );
  return (
    <svg viewBox="0 0 120 120" className="size-24 shrink-0" aria-hidden>
      <circle cx="60" cy="60" r="58" fill="#0E2A5C" stroke="rgba(201,150,43,.35)" strokeWidth="2" />
      <path d="M14 112 Q18 92 40 90 L80 90 Q102 92 106 112 Z" fill={ACCENT} />
      <rect x="52" y="82" width="16" height="12" rx="5" fill="#d9a07a" />
      <circle cx="60" cy="58" r="27" fill="#e8b48a" />
      <path d="M33 54 Q34 28 60 28 Q86 28 87 54 Q80 40 60 40 Q40 40 33 54 Z" fill="#2b1a12" />
      <circle cx="50" cy="58" r="3" fill="#2b1a12" />
      <circle cx="70" cy="58" r="3" fill="#2b1a12" />
      {mood === 'worried' ? (
        <>
          <path d="M43 49 L56 53" stroke="#2b1a12" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M77 49 L64 53" stroke="#2b1a12" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M90 44 q4 7 0 11 q-4 -4 0 -11 Z" fill="#7dd3fc" />
        </>
      ) : (
        <>
          <path d="M44 50 Q50 46 56 50" stroke="#2b1a12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M64 50 Q70 46 76 50" stroke="#2b1a12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {speaking ? (
        <ellipse cx="60" cy="77" rx="9" ry="6" fill="#7a3b25" className="animate-wave" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      ) : (
        mouth
      )}
    </svg>
  );
}

function Bubble({ children, speaking }) {
  return (
    <div className="relative min-h-[4.5rem] flex-1 rounded-2xl rounded-tl-sm border border-plaster/15 bg-[#0A1F45] px-3.5 py-3 text-[13px] leading-snug font-semibold text-plaster shadow-lg">
      {children}
      {speaking && (
        <span className="mt-2 flex items-end gap-[3px]" aria-hidden>
          <Mic className="mr-1 size-3.5 text-turq-soft" />
          {[10, 16, 8, 18, 12, 6, 15].map((h, i) => (
            <span key={i} className="w-[3px] origin-bottom animate-wave rounded-full bg-turq" style={{ height: h, animationDelay: `${i * 90}ms` }} />
          ))}
        </span>
      )}
    </div>
  );
}

function Problem() {
  return (
    <div className="p-4 text-plaster">
      <p className="mb-3 text-[11px] font-bold tracking-widest text-ochre">OY OXIRI</p>
      <div className="flex items-start gap-2.5">
        <Person mood="worried" />
        <Bubble>
          <Typed text="Maosh tushishiga 9 kun bor, kartada 38 000 qoldi... Pulim qayerga ketdi?" />
        </Bubble>
      </div>
      <Delay ms={3000} className="mt-6 rounded-2xl border border-plaster/12 bg-[#071633] p-4">
        <p className="text-[11px] text-plaster/60">Hisobda qoldi</p>
        <p className="font-display text-2xl font-semibold tabular-nums">38 000 so'm</p>
        <p className="mt-2 text-[12px] text-plaster/60">Daftar yuritish charchatadi, naqd pul esa hech qayerda ko'rinmaydi.</p>
      </Delay>
    </div>
  );
}

function Ask() {
  const n = useCount(94444, 1300, 2600);
  return (
    <div className="p-4 text-plaster">
      <div className="flex items-start gap-2.5">
        <Person mood="happy" speaking />
        <Bubble speaking>
          <Typed text="Mizan, bugun qancha sarflasam bo'ladi?" start={200} />
        </Bubble>
      </div>
      <Delay ms={2400} className="mt-5 rounded-3xl border border-ochre/40 bg-cobalt p-4 shadow-lg">
        <p className="text-[11px] text-turq-soft">Bugungi reja</p>
        <p className="font-display text-[2.2rem] leading-none font-semibold tabular-nums">{money(n)}</p>
        <span className="mt-2 inline-block rounded-full bg-turq/20 px-2.5 py-0.5 text-[10px] font-bold text-turq-soft">Hisobi ochiq</span>
      </Delay>
      <Delay ms={3800} className="mt-3 flex justify-between rounded-2xl border border-plaster/12 bg-[#071633] px-3.5 py-2.5 text-[13px]">
        <span className="text-plaster/70">850 000 ÷ 9 kun</span>
        <b className="tabular-nums">94 444</b>
      </Delay>
    </div>
  );
}

function Say() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setStage(1), 3300), setTimeout(() => setStage(2), 4300)];
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="p-4 text-plaster">
      <div className="flex items-start gap-2.5">
        <Person mood="happy" speaking={stage < 1} />
        <Bubble speaking={stage < 1}>
          <Typed text="Bugun yo'lga 12 ming sarfladim" start={200} />
        </Bubble>
      </div>
      <Delay ms={1800} className="mt-5 rounded-2xl border border-plaster/15 bg-[#071633] p-4 text-plaster shadow-lg">
        <p className="text-[10px] font-bold tracking-wider text-turq-soft uppercase">Xarajat · tasdiq kutilmoqda</p>
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 text-[13px]">
          <dt className="text-plaster/55">Nomi</dt><dd className="font-semibold">yo'l</dd>
          <dt className="text-plaster/55">Summa</dt><dd className="font-semibold tabular-nums">12 000 so'm</dd>
          <dt className="text-plaster/55">Toifa</dt><dd className="font-semibold">Transport</dd>
        </dl>
        <span className={`mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-300 ${stage >= 1 ? 'scale-105 bg-turq text-cobalt-night' : 'bg-cobalt text-plaster ring-1 ring-ochre/45'}`}>
          <Check className="size-3.5" /> {stage >= 1 ? 'Saqlandi' : 'Saqlash'}
        </span>
      </Delay>
      <div className={`mt-3 rounded-2xl border border-plaster/12 bg-[#071633] p-3.5 text-[13px] transition-all duration-500 ${stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
        <p className="text-plaster/60">Bugun uchun qoldi</p>
        <p className="font-display text-xl font-semibold text-turq-soft tabular-nums">82 444 so'm</p>
      </div>
    </div>
  );
}

function Cta() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-plaster">
      <Delay ms={100}><Person mood="happy" /></Delay>
      <Delay ms={500}>
        <h3 className="font-display mt-4 text-3xl font-semibold">Pul ko'rinmaydi?</h3>
        <p className="font-display mt-1 text-2xl font-semibold text-turq-soft">Mizan ko'rsatadi.</p>
      </Delay>
      <Delay ms={1300}>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-turq px-5 py-2.5 text-sm font-bold text-cobalt-night">
          <Wallet className="size-4" /> Sinab ko'ring <ArrowRight className="size-4" />
        </span>
      </Delay>
    </div>
  );
}

const SCENES = [Problem, Ask, Say, Cta];

export default function PromoAd() {
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
          <div className="h-full bg-gradient-to-b from-[#071633] to-[#0E2A5C]">
            <Scene key={scene} />
          </div>
        }
      />
      <div className="mt-12 text-center">
        <p key={scene} className="animate-fade-up mx-auto min-h-10 max-w-[18rem] text-sm font-semibold text-plaster/90">{CAPTIONS[scene]}</p>
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Reklama bosqichlari">
          {SCENES.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={scene === i} aria-label={`${i + 1}-bosqich`} onClick={() => setScene(i)} className={`h-1.5 rounded-full transition-all ${scene === i ? 'w-6 bg-turq' : 'w-1.5 bg-plaster/30 hover:bg-plaster/50'}`} />
          ))}
        </div>
        <p className="mt-3 text-xs text-plaster/45">Reklama roligi, namuna raqamlar bilan. Ovozli kiritish brauzerga bog'liq. Haqiqiy ilovani yonidagi tablardan sinang.</p>
      </div>
    </div>
  );
}
