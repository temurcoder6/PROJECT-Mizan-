import { useCallback, useEffect, useRef, useState } from 'react';

// Birinchi yuklanishdagi logo intro (brauzer sessiyasida bir marta, jami 1.6 s).
// 1) 0-0.7 s: 8 ta koshin bo'lagi uchib kelib StarMark bilan bir xil yulduzni yig'adi (kobalt, oxra chiziq)
// 2) 0.7-1.1 s: markaz feruza bo'lib chaqnaydi va ganch rangiga qaytadi, yonida "Mizan" yozuvi o'rnashadi
// 3) 1.1-1.6 s: belgi FLIP bilan navigatsiyadagi logotip o'rniga uchib boradi, parda so'nadi
//    (logotip topilmasa: shunchaki so'nadi)
// Bosish yoki istalgan tugma bilan o'tkazib yuboriladi. html.lite yoki "kamroq harakat"da darhol onDone.
// Faqat transform/opacity animatsiya qilinadi.

const KEY = 'mizan.intro';
const TOTAL = 1600;
const LIFT_AT = 1100;
const SKIP_MS = 220;
const EASE = 'cubic-bezier(.16,1,.3,1)';
const FLY = 'cubic-bezier(.65,0,.35,1)';

// StarMark (Girih.jsx) bilan aynan bir xil geometriya: viewBox 0 0 32 32, R=15, ichki nisbat 0.765
const C = 16;
const RATIO = 0.765;
const p = (k, R) => {
  const a = (Math.PI / 8) * k - Math.PI / 2;
  const rr = k % 2 === 0 ? R : R * RATIO;
  return [C + rr * Math.cos(a), C + rr * Math.sin(a)];
};
const f = ([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`;
const star = (R) => Array.from({ length: 16 }, (_, k) => f(p(k, R))).join(' ');
const STAR = star(15);
const CORE = star(8.2);
// yulduzni aniq qoplaydigan 8 ta kite: markaz -> ichki burchak -> uch -> ichki burchak.
// Oxra chiziq faqat tashqi ikki qirrada (ichki choklar ko'rinmaydi).
const PIECES = Array.from({ length: 8 }, (_, k) => {
  const i = 2 * k;
  const a = p((i + 15) % 16, 15);
  const tip = p(i, 15);
  const b = p(i + 1, 15);
  const ang = (Math.PI / 4) * k - Math.PI / 2;
  return {
    fill: [f([C, C]), f(a), f(tip), f(b)].join(' '),
    edge: `M${f(a)} L${f(tip)} L${f(b)}`,
    from: `translate(${(Math.cos(ang) * 140).toFixed(1)}%, ${(Math.sin(ang) * 140).toFixed(1)}%) rotate(${k % 2 ? 50 : -50}deg) scale(.6)`,
    delay: k * 40,
  };
});

function shouldSkip() {
  if (typeof window === 'undefined') return true;
  try {
    if (sessionStorage.getItem(KEY)) return true;
  } catch {
    /* sessionStorage yopiq bo'lsa ham intro ko'rsatilaveradi */
  }
  return document.documentElement.classList.contains('lite') || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

const CSS = `
@keyframes mz-piece{from{opacity:0;transform:var(--from)}60%{opacity:1}to{opacity:1;transform:none}}
@keyframes mz-in{from{opacity:0}to{opacity:1}}
@keyframes mz-out{from{opacity:1}to{opacity:0}}
@keyframes mz-core{from{opacity:0;transform:scale(.2) rotate(-45deg)}to{opacity:1;transform:none}}
@keyframes mz-word{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@keyframes mz-skip{to{opacity:0}}
.mz-piece{opacity:0;transform-origin:50% 50%;animation:mz-piece .4s ${EASE} both,mz-out 1ms linear 700ms forwards}
.mz-star{opacity:0;animation:mz-in 1ms linear 680ms forwards}
.mz-core{opacity:0;transform-origin:50% 50%;animation:mz-core .34s ${EASE} .62s both}
.mz-flash{opacity:0;transform-origin:50% 50%;animation:mz-core .34s ${EASE} .62s both,mz-out .2s ease-out .86s forwards}
.mz-word{opacity:0;animation:mz-word .34s ${EASE} .76s both}
.mz-root.mz-skip{animation:mz-skip ${SKIP_MS}ms ease-in both}
`;

// navigatsiyadagi logotip (Site.jsx dagi Logo): ko'rinib turgan bo'lsagina
function findLogo() {
  const svg = document.querySelector('header a[href="#/"] svg');
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
  return { svg: r, link: svg.closest('a') };
}

export default function Intro({ onDone }) {
  const [show] = useState(() => !shouldSkip());
  const [flip, setFlip] = useState(null); // null | { mark, word } | { fade: true }
  const [skipping, setSkipping] = useState(false);
  const [gone, setGone] = useState(false);
  const done = useRef(false);
  const doneCb = useRef(onDone);
  const markEl = useRef(null);
  const wordEl = useRef(null);
  useEffect(() => {
    doneCb.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setGone(true);
    doneCb.current?.();
  }, []);

  // ko'rsatilmaydigan holat: darhol onDone
  useEffect(() => {
    if (!show) finish();
  }, [show, finish]);

  // 3-bosqich boshida logotip o'rnini o'qib, FLIP transformini hisoblaymiz
  const startFlip = useCallback(() => {
    const logo = findLogo();
    const m = markEl.current?.getBoundingClientRect();
    if (!logo || !m?.width) {
      setFlip({ fade: true });
      return;
    }
    const t = logo.svg;
    const mark = {
      x: t.left + t.width / 2 - (m.left + m.width / 2),
      y: t.top + t.height / 2 - (m.top + m.height / 2),
      s: t.width / m.width,
    };
    let word = null;
    const w = wordEl.current?.getBoundingClientRect();
    if (w?.width && logo.link) {
      const a = logo.link.getBoundingClientRect();
      const s = parseFloat(getComputedStyle(logo.link).fontSize) / parseFloat(getComputedStyle(wordEl.current).fontSize);
      const gap = parseFloat(getComputedStyle(logo.link).columnGap) || 10;
      const textLeft = t.right + gap;
      word = { x: (textLeft + a.right) / 2 - (w.left + w.width / 2), y: a.top + a.height / 2 - (w.top + w.height / 2), s };
    }
    setFlip({ mark, word });
  }, []);

  // asosiy taymer
  useEffect(() => {
    if (!show || skipping) return undefined;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* e'tiborsiz */
    }
    const t1 = setTimeout(startFlip, LIFT_AT);
    const t2 = setTimeout(finish, TOTAL);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show, skipping, finish, startFlip]);

  // o'tkazib yuborish: bosish yoki istalgan tugma
  useEffect(() => {
    if (!show || gone) return undefined;
    const onKey = () => setSkipping(true);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, gone]);

  useEffect(() => {
    if (!skipping) return undefined;
    const t = setTimeout(finish, SKIP_MS);
    return () => clearTimeout(t);
  }, [skipping, finish]);

  if (!show || gone) return null;

  const leaving = Boolean(flip) || skipping;
  const fly = (v) => (v ? { transform: `translate(${v.x.toFixed(1)}px, ${v.y.toFixed(1)}px) scale(${v.s.toFixed(4)})`, transition: `transform 340ms ${FLY}` } : undefined);
  const markStyle = flip?.fade ? { opacity: 0, transition: 'opacity 300ms ease-out 100ms' } : fly(flip?.mark);
  const wordStyle = flip?.fade
    ? { opacity: 0, transition: 'opacity 300ms ease-out' }
    : flip
      ? { ...(fly(flip.word) || {}), opacity: 0, transition: `${flip.word ? `transform 340ms ${FLY}, ` : ''}opacity 160ms ease-out 180ms` }
      : undefined;
  // parda: belgi deyarli joyiga yetganda so'na boshlaydi (1.3-1.56 s)
  const bgStyle = flip ? { opacity: 0, transition: 'opacity 260ms ease-out 200ms' } : undefined;

  return (
    <div
      className={`mz-root fixed inset-0 z-[100] flex items-center justify-center ${skipping ? 'mz-skip' : ''} ${leaving ? 'pointer-events-none' : 'cursor-pointer'}`}
      onClick={() => setSkipping(true)}
    >
      <style>{CSS}</style>
      <div className="absolute inset-0 bg-[#0A1F45]" style={bgStyle} aria-hidden />
      <span className="sr-only">Mizan</span>

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-8" aria-hidden>
        <div ref={markEl} className="relative size-28 origin-center sm:size-32" style={markStyle}>
          {PIECES.map((pc, i) => (
            <svg key={i} className="mz-piece absolute inset-0 size-full overflow-visible" viewBox="0 0 32 32" style={{ '--from': pc.from, animationDelay: `${pc.delay}ms, 700ms` }}>
              <polygon points={pc.fill} fill="#0E2A5C" />
              <path d={pc.edge} fill="none" stroke="#C9962B" strokeWidth="1" />
            </svg>
          ))}
          {/* yig'ilgandan keyin: StarMark bilan aynan bir xil butun yulduz */}
          <svg className="mz-star absolute inset-0 size-full overflow-visible" viewBox="0 0 32 32">
            <polygon points={STAR} fill="#0E2A5C" stroke="#C9962B" strokeWidth="1" />
          </svg>
          <svg className="mz-core absolute inset-0 size-full overflow-visible" viewBox="0 0 32 32">
            <polygon points={CORE} fill="#F4F1EA" />
          </svg>
          <svg className="mz-flash absolute inset-0 size-full overflow-visible" viewBox="0 0 32 32">
            <polygon points={CORE} fill="#1FA6A0" />
          </svg>
        </div>
        <div ref={wordEl} className="origin-center text-5xl sm:text-6xl" style={wordStyle}>
          <span className="mz-word block font-display font-semibold tracking-tight text-[#F4F1EA]">Mizan</span>
        </div>
      </div>
    </div>
  );
}
