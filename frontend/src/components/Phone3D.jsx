import { useEffect, useRef, useState } from 'react';
import { Wifi } from 'lucide-react';
import { useStore } from '../store';
import { LITE } from '../lib/perf';

const R = '3.4rem';
const DEPTH = 6;
const REST = { x: 5, y: -14, gx: 28, gy: 22 };
const FLAT = { x: 0, y: 0, gx: 50, gy: 25 };
const STILL = { x: 0, y: 0, gx: 50, gy: 30 };

const COBALT = '#0A1F45';
const OCHRE = '#C9962B';
const TURQUOISE = '#1FA6A0';

// Koshin medalyoni kabi telefon: quyuq kobalt korpus, ingichka oxra hoshiya, yengil sir yaltirog'i.
// Qalinlik — bir nechta qatlam (translateZ). Ekran — haqiqiy ilova (?demo=1 rejimidagi iframe).
// Arzon: faqat transform animatsiya qilinadi, harakatlanuvchi qatlamlarda blur yo'q, sichqoncha
// harakati React'ni qayta chizdirmaydi (ref orqali). html.lite va "kamroq harakat"da tebranish/og'ish o'chadi.
const rotation = (t) => `rotateX(${t.x}deg) rotateY(${t.y}deg)`;
const shadowShift = (t) => `translateX(calc(-50% + ${-t.y * 2.2}px))`;
// Yaltiroq qatlam konteynerdan 2 marta katta; uni siljitamiz (fonni qayta chizish o'rniga).
const glareShift = (t) => `translate(${(t.gx - 50) / 2}%, ${(t.gy - 50) / 2}%)`;

export default function Phone3D({ route, className = '', iframeRef, runKey = 0, fresh = false, showCaption = true, still = false, screen = null, dark = true }) {
  const { settings } = useStore();
  const animate = settings.animations && !still;
  const motion = animate && !LITE;
  const src = `${window.location.pathname}?demo=1${fresh ? `&fresh=1&t=${runKey}` : ''}#${route}`;
  const wrap = useRef(null);
  const rotor = useRef(null);
  const shadow = useRef(null);
  const glare = useRef(null);
  const inside = useRef(false);
  const [reload, setReload] = useState(0);
  const start = still ? STILL : REST;

  const apply = (t) => {
    if (rotor.current) rotor.current.style.transform = rotation(t);
    if (shadow.current) shadow.current.style.transform = shadowShift(t);
    if (glare.current) glare.current.style.transform = glareShift(t);
  };

  useEffect(() => {
    apply(start);
    if (!motion) return undefined;
    let raf = 0;
    const onMove = (e) => {
      if (inside.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = wrap.current?.getBoundingClientRect();
        if (!r) return;
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 600));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 500));
        apply({ x: 5 - dy * 8, y: -10 + dx * 14, gx: 50 + dx * 45, gy: 35 + dy * 45 });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, still]);

  const enter = () => {
    inside.current = true;
    if (motion) apply(FLAT);
  };
  const leave = () => {
    inside.current = false;
  };

  // Yon qirra: kobalt qatlamlar, o'rtasida oltin choki — burilganda medalyon qirrasi ko'rinadi.
  const edge = (i) => (i === 2 ? '#7a5c1f' : i % 2 ? '#071731' : '#0c2550');

  return (
    <div className={`relative mx-auto w-[300px] shrink-0 ${className}`}>
      <div
        ref={wrap}
        onMouseEnter={enter}
        onMouseLeave={leave}
        className="relative"
        style={{ perspective: '1500px' }}
      >
        {/* bitta yumshoq kontakt soyasi: blur filtri emas, radial gradient */}
        <div
          ref={shadow}
          className="pointer-events-none absolute -bottom-10 left-1/2 h-10 w-60"
          style={{
            transform: shadowShift(start),
            transition: motion ? 'transform .2s ease-out' : undefined,
            background: 'radial-gradient(closest-side, rgba(3,10,26,.55), rgba(3,10,26,.22) 55%, rgba(3,10,26,0))',
          }}
          aria-hidden
        />
        <div
          ref={rotor}
          style={{ transformStyle: 'preserve-3d', transform: rotation(start), transition: motion ? 'transform .2s ease-out' : undefined }}
        >
          <div className={motion ? 'animate-float lite-static' : ''} style={{ transformStyle: 'preserve-3d' }}>
            {Array.from({ length: DEPTH }).map((_, i) => (
              <span
                key={i}
                className="pointer-events-none absolute inset-0"
                style={{ borderRadius: R, background: edge(i), transform: `translateZ(${-(i + 1) * 1.8}px)` }}
                aria-hidden
              />
            ))}

            {/* side buttons */}
            {['top-24 h-7', 'top-40 h-12', 'top-56 h-12'].map((pos) => (
              <span
                key={pos}
                className={`pointer-events-none absolute -left-[4px] w-[4px] rounded-l-sm ${pos}`}
                style={{ transform: 'translateZ(-6px)', background: `linear-gradient(to right, #6b5017, ${OCHRE})` }}
                aria-hidden
              />
            ))}
            <span
              className="pointer-events-none absolute top-44 -right-[4px] h-20 w-[4px] rounded-r-sm"
              style={{ transform: 'translateZ(-6px)', background: `linear-gradient(to left, #6b5017, ${OCHRE})` }}
              aria-hidden
            />

            {/* kobalt korpus: .glaze yaltirog'i, oxra hoshiya; harakatlanuvchi qatlam bo'lgani uchun backdrop blur o'chiq */}
            <div
              className="glaze relative p-[4px]"
              style={{
                borderRadius: R,
                backgroundColor: COBALT,
                borderColor: 'rgba(201,150,43,.75)',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(0,0,0,.35)',
              }}
            >
              <div
                className="p-[6px]"
                style={{ borderRadius: `calc(${R} - 5px)`, background: '#040b1a', boxShadow: '0 0 0 1px rgba(201,150,43,.32)' }}
              >
                <div className="relative overflow-hidden bg-[#060E1F]" style={{ borderRadius: `calc(${R} - 11px)` }}>
                  <div className={`relative flex h-9 items-center justify-between px-7 pt-1.5 text-[11px] font-bold ${dark ? 'bg-[#071633] text-plaster' : 'bg-[#0E2A5C] text-plaster'}`} aria-hidden>
                    <span>9:41</span>
                    <span className="flex items-center gap-1">
                      <span className="flex items-end gap-[1.5px]">
                        {[4, 6, 8, 10].map((h) => (
                          <span key={h} className="w-[2.5px] rounded-sm bg-current" style={{ height: h }} />
                        ))}
                      </span>
                      <Wifi className="size-3.5" strokeWidth={2.5} />
                      <span className="relative ml-0.5 h-[11px] w-[22px] rounded-[4px] border border-current/60 p-[1.5px]">
                        <span className="block h-full w-[85%] rounded-[2px] bg-current" />
                      </span>
                    </span>
                  </div>
                  <span className="pointer-events-none absolute top-2 left-1/2 z-10 h-[25px] w-[88px] -translate-x-1/2 rounded-full bg-black" aria-hidden>
                    {/* jonli ko'rsatkich: firuza faqat shu yerda */}
                    <span
                      className="absolute top-1/2 left-3.5 size-[5px] -translate-y-1/2 rounded-full"
                      style={{ background: TURQUOISE, boxShadow: '0 0 0 2px rgba(31,166,160,.22)' }}
                    />
                    <span className="absolute top-1/2 right-3 size-[9px] -translate-y-1/2 rounded-full bg-gradient-to-br from-[#123066] via-[#0a1630] to-black ring-1 ring-zinc-700" />
                  </span>
                  {screen ? (
                    <div className="h-[556px] w-full overflow-hidden">{screen}</div>
                  ) : (
                    <iframe
                      key={`${runKey}-${reload}`}
                      ref={iframeRef}
                      title="Mizan ilovasi (namuna ma'lumot bilan)"
                      src={src}
                      className="block h-[556px] w-full border-0 bg-[#060E1F]"
                      style={{ transform: 'translateZ(0)' }}
                    />
                  )}
                  <div className="flex h-[16px] items-center justify-center bg-[#060E1F]" aria-hidden>
                    <span className="h-1 w-24 rounded-full bg-plaster/70" />
                  </div>
                  {/* oyna yaltirog'i: statik chiziq + siljiydigan dog' */}
                  <span
                    className="pointer-events-none absolute inset-0 z-20"
                    style={{ background: 'linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 32%)' }}
                    aria-hidden
                  />
                  <span
                    ref={glare}
                    className="pointer-events-none absolute -inset-1/2 z-20"
                    style={{
                      transform: glareShift(start),
                      transition: motion ? 'transform .2s ease-out' : undefined,
                      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.18), rgba(255,255,255,0) 26%)',
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCaption && (
        <div className="mt-12 text-center text-xs text-[#F4F1EA]/65">
          <p>Bu haqiqiy ilova, namuna ma'lumot bilan. Telefon ichida bosib ko'ring.</p>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="mt-2 rounded-full border border-[#C9962B]/45 bg-white/5 px-3 py-1 font-semibold text-[#F4F1EA]/85 transition-colors hover:border-[#C9962B]/80 hover:bg-white/10"
          >
            Ichi ko'rinmasa, yangilash
          </button>
        </div>
      )}
    </div>
  );
}
