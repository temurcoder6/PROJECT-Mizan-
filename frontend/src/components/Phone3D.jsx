import { useEffect, useRef, useState } from 'react';
import { Wifi } from 'lucide-react';
import { useStore } from '../store';
import { LITE } from '../lib/perf';

const R = '3.4rem';
const EDGES = [
  [-2.8, '#0c2550'],
  [-5.8, '#7a5c1f'],
  [-9.0, '#071731'],
];
const REST = { x: 5, y: -14, gx: 28, gy: 22 };
const FLAT = { x: 0, y: 0, gx: 50, gy: 25 };
const STILL = { x: 0, y: 0, gx: 50, gy: 30 };

const COBALT = '#0A1F45';
const OCHRE = '#C9962B';
const TURQUOISE = '#1FA6A0';

const SCREEN_W = 375;
const SCREEN_H = 745;
const SCREEN_SCALE = 280 / SCREEN_W; // ~0.746667 (280px ichki eniga to'liq sig'adi)

// Koshin medalyoni kabi telefon: quyuq kobalt korpus, ingichka oxra hoshiya, yengil sir yaltirog'i.
// Qalinlik — 3 ta GPU qatlam (translateZ). Ekran — haqiqiy ilova (?demo=1 rejimidagi iframe).
// Arzon: faqat transform animatsiya qilinadi, harakatlanuvchi qatlamlarda blur yo'q, sichqoncha
// harakati React'ni qayta chizdirmaydi (ref orqali). html.lite va "kamroq harakat"da tebranish/og'ish o'chadi.
const rotation = (t) => `rotateX(${t.x}deg) rotateY(${t.y}deg)`;
const shadowShift = (t) => `translate3d(calc(-50% + ${-t.y * 2.2}px), 0, 0)`;
// Yaltiroq qatlam konteynerdan 2 marta katta; uni siljitamiz (fonni qayta chizish o'rniga).
const glareShift = (t) => `translate3d(${(t.gx - 50) / 2}%, ${(t.gy - 50) / 2}%, 0)`;

export default function Phone3D({ route, className = '', iframeRef, runKey = 0, fresh = false, showCaption = true, still = false, screen = null, dark = true }) {
  const { settings } = useStore();
  const animate = settings.animations && !still;
  const motion = animate && !LITE;
  const src = `${window.location.pathname}?demo=1${fresh ? `&fresh=1&t=${runKey}` : ''}#${route}`;
  const wrap = useRef(null);
  const rotor = useRef(null);
  const floatEl = useRef(null);
  const shadow = useRef(null);
  const glare = useRef(null);
  const inside = useRef(false);
  const smoothMode = useRef(true);
  const [reload, setReload] = useState(0);
  const [inView, setInView] = useState(true);
  const start = still ? STILL : REST;

  const setTransition = (smooth) => {
    if (smoothMode.current === smooth) return;
    smoothMode.current = smooth;
    const tr = smooth ? 'transform .25s ease-out' : 'none';
    if (rotor.current) rotor.current.style.transition = tr;
    if (shadow.current) shadow.current.style.transition = tr;
    if (glare.current) glare.current.style.transition = tr;
  };

  const apply = (t, smooth = false) => {
    setTransition(smooth);
    if (rotor.current) rotor.current.style.transform = rotation(t);
    if (shadow.current) shadow.current.style.transform = shadowShift(t);
    if (glare.current) glare.current.style.transform = glareShift(t);
  };

  // Faqat ko'rinib turganda ishlash (viewportdan chiqsa resurs sarflamaslik)
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, { rootMargin: '60px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Skroll paytida float animatsiyasini va iframe g'ildirak tutishini qisqa pauza qilish (silliq 60fps skroll)
  useEffect(() => {
    if (!inView) return undefined;
    const floatNode = floatEl.current;
    const wrapNode = wrap.current;
    let scrollTimer = 0;
    let scrolling = false;
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        floatNode?.classList.add('is-scrolling');
        wrapNode?.classList.add('is-scrolling');
      }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrolling = false;
        floatNode?.classList.remove('is-scrolling');
        wrapNode?.classList.remove('is-scrolling');
      }, 180);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimer);
      floatNode?.classList.remove('is-scrolling');
      wrapNode?.classList.remove('is-scrolling');
    };
  }, [inView]);

  useEffect(() => {
    apply(start, true);
    if (!motion || !inView) return undefined;

    // Sensorli (telefon/planshet) qurilmalarda kursor og'ishi shart emas (qotishni oldini oladi)
    const isTouchOnly = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse) and (hover: none)').matches;
    if (isTouchOnly) return undefined;

    let raf = 0;
    let rect = null;
    let lastScrollAt = 0;

    const onInvalidate = () => {
      rect = null;
      lastScrollAt = performance.now();
    };
    window.addEventListener('resize', onInvalidate, { passive: true });
    window.addEventListener('scroll', onInvalidate, { passive: true });

    const onMove = (e) => {
      if (inside.current || performance.now() - lastScrollAt < 180) return;
      if (!rect && wrap.current) rect = wrap.current.getBoundingClientRect();
      if (!rect) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / 600));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / 500));
        apply({ x: 5 - dy * 8, y: -10 + dx * 14, gx: 50 + dx * 45, gy: 35 + dy * 45 }, false);
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onInvalidate);
      window.removeEventListener('scroll', onInvalidate);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, still, inView]);

  const enter = () => {
    inside.current = true;
    if (motion) apply(FLAT, true);
  };
  const leave = () => {
    inside.current = false;
    if (motion) apply(start, true);
  };

  return (
    <div className={`relative mx-auto w-[300px] shrink-0 ${className}`}>
      <div
        ref={wrap}
        onMouseEnter={enter}
        onMouseLeave={leave}
        className="relative"
        style={{ perspective: '1500px', contain: 'layout' }}
      >
        {/* bitta yumshoq kontakt soyasi: blur filtri emas, radial gradient */}
        <div
          ref={shadow}
          className="pointer-events-none absolute -bottom-10 left-1/2 h-10 w-60"
          style={{
            transform: shadowShift(start),
            background: 'radial-gradient(closest-side, rgba(3,10,26,.55), rgba(3,10,26,.22) 55%, rgba(3,10,26,0))',
            willChange: 'transform',
          }}
          aria-hidden
        />
        <div
          ref={rotor}
          style={{
            transformStyle: 'preserve-3d',
            transform: rotation(start),
            willChange: motion ? 'transform' : undefined,
            backfaceVisibility: 'hidden',
          }}
        >
          <div ref={floatEl} className={motion && inView ? 'animate-float lite-static' : ''} style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}>
            {EDGES.map(([tz, bg], i) => (
              <span
                key={i}
                className="pointer-events-none absolute inset-0"
                style={{ borderRadius: R, background: bg, transform: `translateZ(${tz}px)` }}
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
                    <div className="relative h-[556px] w-full overflow-hidden bg-[#060E1F]">
                      <iframe
                        key={`${runKey}-${reload}`}
                        ref={iframeRef}
                        title="Mizan ilovasi (namuna ma'lumot bilan)"
                        src={src}
                        loading="lazy"
                        className="absolute top-0 left-0 border-0 bg-[#060E1F]"
                        style={{
                          width: `${SCREEN_W}px`,
                          height: `${SCREEN_H}px`,
                          transform: `scale(${SCREEN_SCALE})`,
                          transformOrigin: 'top left',
                          contain: 'paint',
                        }}
                      />
                    </div>
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
                      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.18), rgba(255,255,255,0) 26%)',
                      willChange: 'transform',
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
        <div className="relative z-20 mt-12 text-center text-xs text-[#F4F1EA]/65">
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
