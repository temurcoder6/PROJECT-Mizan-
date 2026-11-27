import { useState } from 'react';

// Koshin geometriyasi: sakkiz qirrali girih yulduzi (ikkita kesishgan kvadrat). Faqat chiziq, arzon SVG.

export function starPoints(cx, cy, R, ratio = 0.765) {
  const pts = [];
  for (let k = 0; k < 16; k++) {
    const a = (Math.PI / 8) * k - Math.PI / 2;
    const r = k % 2 === 0 ? R : R * ratio;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export function StarMark({ className = 'size-8', live = false, interactive = false }) {
  const [turns, setTurns] = useState(0);
  const spin = () => {
    if (!interactive) return;
    setTurns((t) => t + 1);
  };
  return (
    <svg
      viewBox="0 0 32 32"
      onClick={spin}
      style={interactive ? { transform: `rotate(${turns * 360}deg)` } : undefined}
      className={`${className} ${interactive ? 'cursor-pointer transition-transform duration-700 ease-out active:scale-90' : ''}`}
      aria-hidden
    >
      <polygon points={starPoints(16, 16, 15)} className="fill-cobalt stroke-ochre" strokeWidth="1" />
      <polygon points={starPoints(16, 16, 8.2)} className={live ? 'fill-turq' : 'fill-plaster'} />
    </svg>
  );
}

// Fon uchun girih to'ri: bir marta keshlangan SVG data-URI rasm (DOM'da yuzlab polygon qatlamlar chizmaydi).
const fieldCache = new Map();
function fieldBg(size) {
  let uri = fieldCache.get(size);
  if (uri) return uri;
  const h = size / 2;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>` +
    `<g fill='none' stroke='#C9962B' stroke-width='1'>` +
    `<polygon points='${starPoints(h, h, h * 0.62)}'/>` +
    `<polygon points='${starPoints(0, 0, h * 0.3)}'/>` +
    `<polygon points='${starPoints(size, 0, h * 0.3)}'/>` +
    `<polygon points='${starPoints(0, size, h * 0.3)}'/>` +
    `<polygon points='${starPoints(size, size, h * 0.3)}'/>` +
    `<path d='M${h} ${h - h * 0.62}L${h} 0M${h} ${h + h * 0.62}L${h} ${size}M${h - h * 0.62} ${h}L0 ${h}M${h + h * 0.62} ${h}L${size} ${h}'/>` +
    `</g></svg>`;
  uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  fieldCache.set(size, uri);
  return uri;
}

export function GirihField({ className = '', opacity = 0.16, size = 96 }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      style={{
        backgroundImage: fieldBg(size),
        backgroundSize: `${size}px ${size}px`,
        backgroundRepeat: 'repeat',
        opacity,
      }}
      aria-hidden
    />
  );
}

// Ro'yxat belgisi: kichik yulduz.
export function StarBullet({ className = '' }) {
  return (
    <svg viewBox="0 0 16 16" className={`mt-1.5 size-3 shrink-0 ${className}`} aria-hidden>
      <polygon points={starPoints(8, 8, 7.5)} className="fill-current" />
    </svg>
  );
}
