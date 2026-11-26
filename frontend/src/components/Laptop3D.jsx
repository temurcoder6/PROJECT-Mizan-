import { useEffect, useRef, useState } from 'react';

const SCREEN_W = 1280;
const SCREEN_H = 800;

// Noutbuk, telefon bilan bir xil material: kobalt qopqoq qirrasi (.glaze yaltirog'i), ingichka oxra hoshiya,
// suvoq rangli (#F4F1EA) klaviatura tagligi. Ekran — haqiqiy ilova (?demo=1 iframe), kompyuter o'lchamida, sig'diriladi.
// Faqat transform animatsiya qilinadi; html.lite'da (.lite-static) og'ish va hover burilishi o'chadi.
export default function Laptop3D({ route, className = '' }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.5);
  const src = `${window.location.pathname}?demo=1#${route}`;

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / SCREEN_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`group relative mx-auto w-full max-w-[780px] ${className}`}>
      {/* bitta yumshoq kontakt soyasi (blur filtrisiz) */}
      <div
        className="pointer-events-none absolute -bottom-7 left-1/2 h-12 w-[112%] -translate-x-1/2"
        style={{ background: 'radial-gradient(closest-side, rgba(3,10,26,.5), rgba(3,10,26,.18) 60%, rgba(3,10,26,0))' }}
        aria-hidden
      />
      <div style={{ perspective: '2000px' }}>
        <div className="lite-static origin-bottom transition-transform duration-700 [transform:rotateX(7deg)_rotateY(-7deg)] group-hover:[transform:rotateX(0deg)_rotateY(0deg)]">
          <div
            className="glaze rounded-t-[1.3rem] p-[3px]"
            style={{
              backgroundColor: '#0A1F45',
              borderColor: 'rgba(201,150,43,.75)',
              borderBottomWidth: 0,
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22)',
            }}
          >
            <div className="rounded-t-[1.1rem] bg-[#040b1a] px-[10px] pt-[10px] pb-[8px]" style={{ boxShadow: '0 0 0 1px rgba(201,150,43,.28)' }}>
              <div className="relative overflow-hidden rounded-[6px] bg-white" ref={box} style={{ aspectRatio: `${SCREEN_W} / ${SCREEN_H}` }}>
                <span className="pointer-events-none absolute top-0 left-1/2 z-10 h-[14px] w-24 -translate-x-1/2 rounded-b-xl bg-[#040b1a]" aria-hidden>
                  {/* jonli ko'rsatkich: firuza faqat shu yerda */}
                  <span className="absolute top-[4px] left-1/2 size-[4px] -translate-x-1/2 rounded-full bg-[#1FA6A0]" />
                </span>
                <iframe
                  title="Mizan ilovasi, kompyuter ko'rinishi (namuna ma'lumot bilan)"
                  src={src}
                  loading="lazy"
                  className="absolute top-0 left-0 border-0 bg-white"
                  style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                />
                <span
                  className="pointer-events-none absolute inset-0 z-20"
                  style={{ background: 'linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 30%)' }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
          {/* suvoq taglik: oxra chiziqli yuqori qirra, kobalt pastki chok */}
          <div
            className="relative -mx-[5%] h-[14px] rounded-b-[1.2rem]"
            style={{
              background: 'linear-gradient(180deg, #F4F1EA 0%, #e6e0d3 70%, #cfc6b4 100%)',
              boxShadow: 'inset 0 1px 0 rgba(201,150,43,.85), inset 0 -2px 0 #0A1F45',
            }}
          >
            <span className="pointer-events-none absolute top-0 left-1/2 h-[6px] w-24 -translate-x-1/2 rounded-b-lg bg-[#d9d1c0]" style={{ boxShadow: 'inset 0 -1px 0 rgba(201,150,43,.55)' }} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
