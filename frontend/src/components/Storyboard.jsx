import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { LITE } from '../lib/perf';
import { GirihField, starPoints } from './Girih';

const SCENES = [
  {
    n: '1',
    title: 'Pulingizni bildiring',
    text: "Hozirgi pul va keyingi daromad sanasini bir marta kiriting. Bankka ulanish kerak emas.",
    tag: 'Boshlang‘ich maʼlumot',
  },
  {
    n: '2',
    title: "To'lov va qarzni ajrating",
    text: "Daromadgacha to'lanadigan ijara, internet, qarz muddati va jamg'arma chetga olinadi.",
    tag: 'Majburiyatlar',
  },
  {
    n: '3',
    title: "Kunlik rejani ko'ring",
    text: "Qolgan erkin pul daromadgacha kunlarga bo'linadi — bugun qancha sarflash mumkinligi chiqadi.",
    tag: 'Ochiq formula',
  },
  {
    n: '4',
    title: 'Tez yozing, reja moslashadi',
    text: "Xarajatni summa va toifa bilan yozing. Reja darhol yangilanadi; unutilgan kunni keyin to'ldirasiz.",
    tag: 'Ikki bosish',
  },
];

function SceneBalance() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-plaster/15 pb-3">
        <span className="text-sm font-semibold text-plaster/75">Qo'lda va kartada jami</span>
        <span className="text-xs text-plaster/55">O'zingiz kiritasiz</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-plaster/15 bg-cobalt-night/70 p-4">
          <div className="flex items-center gap-2 text-xs text-plaster/65">
            <b className="flex size-5 items-center justify-center rounded-[3px] bg-plaster text-[11px] font-semibold text-cobalt">1</b>
            Hozirgi pul
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] tabular-nums sm:text-3xl">850 000 so'm</p>
        </div>
        <div className="rounded-lg border border-plaster/15 bg-cobalt-night/70 p-4">
          <div className="flex items-center gap-2 text-xs text-plaster/65">
            <b className="flex size-5 items-center justify-center rounded-[3px] bg-plaster text-[11px] font-semibold text-cobalt">2</b>
            Keyingi daromad
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] tabular-nums sm:text-3xl">9 kun</p>
        </div>
      </div>
      <p className="border-t border-ochre/45 pt-4 text-xs leading-relaxed text-plaster/65">
        Bank SMS'lari o'qilmaydi va karta ma'lumoti so'ralmaydi. Raqamni o'zingiz bildirasiz.
      </p>
    </div>
  );
}

function SceneAllocate() {
  const rows = [
    ['Hozirgi pul', "850 000 so'm", 'w-full bg-plaster/85'],
    ["Zarur to'lovlar (ijara, internet)", "−150 000 so'm", 'w-[18%] bg-ochre'],
    ['Daromadgacha qarz muddati', "−100 000 so'm", 'w-[12%] bg-ochre'],
    ["Jamg'arma ajratmasi", "−60 000 so'm", 'w-[7%] bg-ochre'],
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map(([label, val, bar], idx) => (
          <div key={label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={idx === 0 ? 'font-semibold text-plaster' : 'text-plaster/75'}>{label}</span>
              <span className={`font-semibold tabular-nums ${idx === 0 ? 'text-plaster' : 'text-[#F2C46B]'}`}>{val}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cobalt-night">
              <div className={`h-full rounded-full ${bar}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between border-t border-ochre/65 pt-4">
        <span className="text-sm font-semibold text-plaster/80">Qolgan erkin pul</span>
        <span className="font-display text-3xl font-semibold tracking-[-0.02em] text-plaster tabular-nums">540 000 so'm</span>
      </div>
    </div>
  );
}

function SceneFormula() {
  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-turq-soft">
        <span className="size-2 rounded-full bg-turq" /> Bugun sarflash mumkin
      </p>
      <p className="font-display text-5xl font-semibold tracking-[-0.02em] text-plaster tabular-nums sm:text-6xl">60 000 so'm</p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 border-t border-plaster/15 pt-4 text-sm text-plaster/85 tabular-nums">
        {['Hisob:', "540 000 so'm", '÷', '9 kun', '=', "60 000 so'm / kun"].map((term, k) => (
          <span key={term} className="formula-term" style={{ animationDelay: `${k * 70}ms` }}>
            {term}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-plaster/65">
        Har bir so'm qayerdan kelgani ochiq ko'rinadi. Kafolatlangan mablag' emas — siz kiritgan ma'lumotga bog'liq.
      </p>
    </div>
  );
}

function SceneQuickEntry() {
  const chips = ['Oziq-ovqat', 'Transport', 'Bozor', 'Kommunal'];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-plaster/15 bg-cobalt-night/90 p-4 text-plaster">
        <div className="flex items-center justify-between text-xs font-semibold text-plaster/65">
          <span>Summa va toifa</span>
          <span className="tabular-nums text-plaster">12 000 so'm</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = c === 'Transport';
            return (
              <span
                key={c}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  active ? 'bg-turq text-cobalt-night' : 'border border-plaster/15 bg-[#0A1F45] text-plaster/80'
                }`}
              >
                {c}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-ochre/65 bg-cobalt-night/75 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-plaster">
          <Check className="size-4 text-turq-soft" /> Saqlandi: Transport · 12 000 so'm
        </span>
        <span className="text-xs text-plaster/60">Bekor qilish bor</span>
      </div>
      <div className="space-y-2 border-t border-plaster/15 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-plaster/75">Bugun uchun qoldi</span>
          <span className="font-display text-3xl font-semibold tracking-[-0.02em] text-plaster tabular-nums">48 000 so'm</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-cobalt-night">
          <div className="h-full w-4/5 rounded-full bg-turq" />
        </div>
      </div>
    </div>
  );
}

const SCENE_VIEWS = [SceneBalance, SceneAllocate, SceneFormula, SceneQuickEntry];

export default function Storyboard() {
  const sectionRef = useRef(null);
  const stageShellRef = useRef(null);
  const stepRefs = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (LITE || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const section = sectionRef.current;
    if (!section) return undefined;

    let raf = 0;
    let inView = false;

    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const total = Math.max(rect.height - window.innerHeight * 0.55, 1);
      const progress = Math.max(0, Math.min(1, (-rect.top + window.innerHeight * 0.25) / total));
      if (stageShellRef.current) stageShellRef.current.style.setProperty('--sb-p', progress.toFixed(4));

      const focusY = window.innerHeight * 0.44;
      let best = 0;
      let bestDist = Infinity;
      stepRefs.current.forEach((el, idx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const d = Math.abs(mid - focusY);
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      });
      setActive((prev) => (prev === best ? prev : best));
    };

    const schedule = () => {
      if (!inView || raf) return;
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) schedule();
      },
      { rootMargin: '120px 0px' },
    );
    io.observe(section);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  const jumpTo = (i) => {
    setActive(i);
    const el = stepRefs.current[i];
    if (el && window.innerWidth >= 1024) {
      el.scrollIntoView({ behavior: LITE ? 'auto' : 'smooth', block: 'center' });
    }
  };

  const ActiveScene = SCENE_VIEWS[active];
  const cur = SCENES[active];

  return (
    <section ref={sectionRef} className="relative overflow-x-clip bg-cobalt text-plaster">
      <GirihField id="g-steps" opacity={0.1} />
      <div className="relative mx-auto w-full max-w-[76rem] px-5 py-24 sm:px-8 sm:py-32">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-[2.6rem]">
            Uch qadamda kunlik reja.
          </h2>
          <p className="mt-4 max-w-xl text-plaster/75">
            Pastga aylantiring: pulingizdan bugungi chegaragacha har bir bosqich qanday yig'ilishini ko'ring.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-12">
          {/* Chap ustun: scroll bilan o'tadigan hikoya sahnalari */}
          <ol className="space-y-4 lg:space-y-6">
            {SCENES.map((s, i) => {
              const isAct = active === i;
              const SceneMobile = SCENE_VIEWS[i];
              return (
                <li
                  key={s.n}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  className={`rounded-xl transition duration-300 ${
                    isAct ? 'glaze opacity-100' : 'border border-plaster/12 bg-cobalt-deep/45 opacity-85 lg:opacity-55 lg:hover:opacity-85'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    className="flex w-full gap-5 p-6 text-left sm:p-7"
                    aria-current={isAct ? 'step' : undefined}
                  >
                    <span className="relative flex size-13 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 56 56" className="absolute inset-0" aria-hidden>
                        <polygon
                          points={starPoints(28, 28, 27)}
                          fill="none"
                          stroke={isAct ? '#C9962B' : 'rgba(201,150,43,0.45)'}
                          strokeWidth="1.2"
                        />
                      </svg>
                      <span className="font-display relative text-lg font-semibold tracking-[-0.02em]">{s.n}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] sm:text-xl">{s.title}</h3>
                        <span className={`hidden size-2 shrink-0 rounded-full lg:block ${isAct ? 'bg-turq' : 'bg-plaster/20'}`} />
                      </div>
                      <p className="mt-2 leading-relaxed text-plaster/78">{s.text}</p>
                    </div>
                  </button>
                  {/* Telefon ekranlarida har qadam tagida o'z kichik ko'rinishi */}
                  <div className="border-t border-plaster/12 p-5 lg:hidden">
                    <SceneMobile />
                  </div>
                </li>
              );
            })}
          </ol>

          {/* O'ng ustun: desktopda scroll paytida qotib turuvchi Storyboard sahnasi */}
          <div ref={stageShellRef} className="hidden lg:sticky lg:top-24 lg:block" style={{ '--sb-p': 0 }}>
            <div className="glaze relative overflow-hidden rounded-xl p-8 sm:p-9">
              {/* Scroll progressiga mos aylanadigan girih bezagi (faqat transform, blur'siz) */}
              <svg
                viewBox="0 0 200 200"
                className="pointer-events-none absolute -top-20 -right-20 size-72 opacity-20"
                style={LITE ? undefined : { transform: 'rotate(calc(var(--sb-p, 0) * 45deg))' }}
                aria-hidden
              >
                <polygon points={starPoints(100, 100, 96)} fill="none" stroke="#C9962B" strokeWidth="0.9" />
                <polygon points={starPoints(100, 100, 62)} fill="none" stroke="#C9962B" strokeWidth="0.9" />
              </svg>

              <div className="relative">
                <div className="flex items-center justify-between gap-4 border-b border-plaster/15 pb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-turq-soft">
                    <span className="size-2 rounded-full bg-turq" />
                    <span>
                      {cur.n} / {SCENES.length} · {cur.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Oldingi sahna"
                      disabled={active === 0}
                      onClick={() => jumpTo(Math.max(0, active - 1))}
                      className="rounded-md border border-plaster/20 p-1.5 text-plaster/80 transition hover:bg-plaster/10 disabled:opacity-35"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Keyingi sahna"
                      disabled={active === SCENES.length - 1}
                      onClick={() => jumpTo(Math.min(SCENES.length - 1, active + 1))}
                      className="rounded-md border border-plaster/20 p-1.5 text-plaster/80 transition hover:bg-plaster/10 disabled:opacity-35"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Scroll holati chizig'i */}
                <div className="mt-4 grid grid-cols-4 gap-1.5" role="tablist" aria-label="Storyboard sahnalari">
                  {SCENES.map((s, i) => (
                    <button
                      key={s.n}
                      type="button"
                      role="tab"
                      aria-selected={active === i}
                      onClick={() => jumpTo(i)}
                      className="group py-1 text-left"
                    >
                      <span className="block h-1 overflow-hidden rounded-full bg-plaster/15">
                        <span
                          className={`block h-full rounded-full transition-transform duration-300 origin-left ${
                            i <= active ? 'scale-x-100 bg-turq' : 'scale-x-0 bg-turq'
                          }`}
                        />
                      </span>
                    </button>
                  ))}
                </div>

                <div key={active} className={LITE ? 'mt-7' : 'mt-7 animate-[tile-in_.38s_cubic-bezier(.16,1,.3,1)_both]'}>
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">{cur.title}</h3>
                  <div className="mt-6">
                    <ActiveScene />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
