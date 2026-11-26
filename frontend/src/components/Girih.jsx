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

export function StarMark({ className = 'size-8', live = false }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <polygon points={starPoints(16, 16, 15)} className="fill-cobalt stroke-ochre" strokeWidth="1" />
      <polygon points={starPoints(16, 16, 8.2)} className={live ? 'fill-turq' : 'fill-plaster'} />
    </svg>
  );
}

// Fon uchun girih to'ri: bitta pattern, takrorlanadi. Rasm emas, juda yengil.
export function GirihField({ id, className = '', opacity = 0.16, size = 96 }) {
  const h = size / 2;
  return (
    <svg className={`pointer-events-none absolute inset-0 size-full ${className}`} aria-hidden>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <polygon points={starPoints(h, h, h * 0.62)} fill="none" stroke="#C9962B" strokeWidth="1" />
          <polygon points={starPoints(0, 0, h * 0.3)} fill="none" stroke="#C9962B" strokeWidth="1" />
          <polygon points={starPoints(size, 0, h * 0.3)} fill="none" stroke="#C9962B" strokeWidth="1" />
          <polygon points={starPoints(0, size, h * 0.3)} fill="none" stroke="#C9962B" strokeWidth="1" />
          <polygon points={starPoints(size, size, h * 0.3)} fill="none" stroke="#C9962B" strokeWidth="1" />
          <path d={`M${h} ${h - h * 0.62}L${h} 0M${h} ${h + h * 0.62}L${h} ${size}M${h - h * 0.62} ${h}L0 ${h}M${h + h * 0.62} ${h}L${size} ${h}`} stroke="#C9962B" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
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
