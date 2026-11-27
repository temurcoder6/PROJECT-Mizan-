import { useEffect, useRef, useState } from 'react';

// Samarqand koshinidagi sakkiz qirrali girih yulduzi, faqat CSS 3D bilan (WebGL/canvas yo'q).
// Qatlamlar: qalinlik bo'laklari -> sirlangan kobalt yuz -> oxra chiziqlar -> 8 ta oq kite -> oldingi halqa.
// children markazda tekis turadi (jonli telefon iframe uchun), aylanmaydi va bosiladi.
// Arzon: faqat transform animatsiya, aylanuvchi qatlamlarda blur yo'q, ekrandan chiqsa yoki tab yashirilsa to'xtaydi.
// html.lite yoki "kamroq harakat": aylanish va kursorga egilish yo'q, sokin statik burchak.

const R = 96; // tashqi uchlar radiusi (viewBox -100..100)
const r = R * (Math.SQRT1_2 / Math.cos(Math.PI / 8)); // ikki kvadrat kesishgan ichki burchaklar
const BASE_X = 14; // doimiy yengil X egilish
const STATIC = { x: 14, y: -22 };
const MAX_TILT = 10;

const pt = (rad, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [rad * Math.cos(a), rad * Math.sin(a)];
};
const starPts = (outer, inner) => Array.from({ length: 16 }, (_, i) => pt(i % 2 ? inner : outer, i * 22.5));
const toSvg = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const toClip = (pts) => `polygon(${pts.map(([x, y]) => `${(50 + x / 2).toFixed(2)}% ${(50 + y / 2).toFixed(2)}%`).join(',')})`;

const STAR = starPts(R, r);
const STAR_CLIP = toClip(STAR);
const IR = 58; // ichki yulduz: telefon yon tomonlarida ko'rinib turishi uchun kattaroq
const INNER = starPts(IR, IR * (r / R));
const SQUARE_A = toSvg([0, 90, 180, 270].map((d) => pt(R, d)));
const SQUARE_B = toSvg([45, 135, 225, 315].map((d) => pt(R, d)));
// rozetka: ichki yulduz uchidan tashqi yulduzning ichki burchagiga boruvchi chiziqlar
const PETALS = Array.from({ length: 8 }, (_, k) => {
  const a = pt(IR, k * 45);
  const b = pt(r, k * 45 + 22.5);
  const c = pt(r, k * 45 - 22.5);
  return `M${c[0].toFixed(2)},${c[1].toFixed(2)} L${a[0].toFixed(2)},${a[1].toFixed(2)} L${b[0].toFixed(2)},${b[1].toFixed(2)}`;
}).join(' ');
// 8 ta kite tashqi uchlarda (radius 72..93): markazdagi telefon yopsa ham 8 ta uch ko'rinadi
const KITES = Array.from({ length: 8 }, (_, k) => toSvg([pt(72, k * 45), pt(84, k * 45 - 7), pt(93, k * 45), pt(84, k * 45 + 7)]));

const SLICES = 1; // 1 qatlam yetarli: 3D chuqurlik saqlanadi va GPU ga ortiqcha yuk tushmaydi
const z = (n) => `translateZ(calc(${n} * 1cqi))`;

function prefersStill() {
  if (typeof window === 'undefined') return true;
  return document.documentElement.classList.contains('lite') || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export default function Girih3D({ className = '', children, size = 520 }) {
  const root = useRef(null);
  const tiltEl = useRef(null);
  const [still, setStill] = useState(prefersStill);
  const [running, setRunning] = useState(false);

  // "kamroq harakat" sozlamasi o'zgarsa kuzatamiz
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setStill(prefersStill());
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // ekranda ko'rinsa va tab ochiq bo'lsagina aylanadi
  useEffect(() => {
    if (still) return undefined;
    let inView = false;
    const update = () => setRunning(inView && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    }, { rootMargin: '80px' });
    if (root.current) io.observe(root.current);
    document.addEventListener('visibilitychange', update);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [still]);

  // kursorga egilish: rAF bilan, yumshoq (lerp), React qayta render qilmaydi
  useEffect(() => {
    if (still || !running) return undefined;
    const isTouchOnly = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse) and (hover: none)').matches;
    if (isTouchOnly) return undefined;

    const el = tiltEl.current;
    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let rect = null;

    const onScrollOrResize = () => {
      rect = null;
    };
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    window.addEventListener('scroll', onScrollOrResize, { passive: true });

    const tick = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      if (el) el.style.transform = `rotateX(${(BASE_X + cur.x).toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.02 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      if (!rect && root.current) rect = root.current.getBoundingClientRect();
      if (!rect) return;
      const dx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)));
      target.x = -dy * MAX_TILT;
      target.y = dx * MAX_TILT;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [still, running]);

  const tiltStyle = still
    ? { transform: `rotateX(${STATIC.x}deg) rotateY(${STATIC.y}deg)` }
    : { transform: `rotateX(${BASE_X}deg) rotateY(0deg)` };

  return (
    <div
      ref={root}
      className={`relative mx-auto flex w-full items-center justify-center ${children == null ? 'min-h-[var(--g-size)]' : ''} ${className}`}
      style={{ '--g-size': `min(${size}px, 100vw)` }}
    >
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[var(--g-size)] max-w-none -translate-x-1/2 -translate-y-1/2"
        style={{ containerType: 'inline-size', perspective: '1600px', contain: 'layout' }}
        aria-hidden
      >
      <style>{`@keyframes girih-spin{from{transform:rotateY(0deg)}to{transform:rotateY(360deg)}}`}</style>

      <div ref={tiltEl} className="pointer-events-none absolute inset-0" style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden', willChange: 'transform', ...tiltStyle }} aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            willChange: still ? undefined : 'transform',
            animation: still ? 'none' : 'girih-spin 40s linear infinite',
            animationPlayState: running ? 'running' : 'paused',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* qalinlik: orqaga ketuvchi to'q kobalt bo'laklar */}
          {Array.from({ length: SLICES }, (_, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{ clipPath: STAR_CLIP, background: i % 2 ? '#0A1F45' : '#0c2552', transform: z(-(i + 1) * 1) }}
            />
          ))}

          {/* sirlangan kobalt yuz (aylanuvchi qatlamda blur o'chirilgan, faqat yaltiroq qoladi) */}
          <div className="glaze absolute inset-0" style={{ clipPath: STAR_CLIP, backgroundColor: '#0E2A5C', backdropFilter: 'none', WebkitBackdropFilter: 'none', boxShadow: 'none' }} />

          {/* oxra girih chiziqlari */}
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-100 -100 200 200" style={{ transform: z(0.6) }}>
            <g fill="none" stroke="#C9962B" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round">
              <polygon points={toSvg(STAR)} vectorEffect="non-scaling-stroke" />
              <polygon points={SQUARE_A} strokeOpacity=".45" vectorEffect="non-scaling-stroke" />
              <polygon points={SQUARE_B} strokeOpacity=".45" vectorEffect="non-scaling-stroke" />
              <polygon points={toSvg(INNER)} vectorEffect="non-scaling-stroke" />
              <path d={PETALS} strokeOpacity=".8" vectorEffect="non-scaling-stroke" />
              <circle r="36" strokeOpacity=".55" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>

          {/* ichki halqa: 8 ta kichik oq-ganch kite */}
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-100 -100 200 200" style={{ transform: z(2.6) }}>
            {KITES.map((p, i) => (
              <polygon key={i} points={p} fill="#F4F1EA" fillOpacity={i % 2 ? 0.86 : 0.94} stroke="#C9962B" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {/* oldinda suzuvchi ingichka halqa */}
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-100 -100 200 200" style={{ transform: z(5.5) }}>
            <circle r="94" fill="none" stroke="#C9962B" strokeOpacity=".5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle r="98" fill="none" stroke="#C9962B" strokeOpacity=".22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      </div>

      {children != null && <div className="relative z-10">{children}</div>}
    </div>
  );
}
