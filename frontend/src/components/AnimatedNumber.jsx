import { useEffect, useRef, useState } from 'react';
import { money } from '../lib/format';
import { useStore } from '../store';

// Summa o'zgarganda eski qiymatdan yangisiga silliq o'tadi. Birinchi ko'rinishda sakramaydi;
// animatsiya o'chirilgan bo'lsa yoki brauzer "kamroq harakat" so'ragan bo'lsa darhol yangi qiymat.
export default function AnimatedNumber({ value, format = money, ms = 450 }) {
  const { settings } = useStore();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!settings.animations || reduce || from === value || !Number.isFinite(from) || !Number.isFinite(value)) {
      setShown(value);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Orqa fonda rAF to'xtab qolsa ham oxirgi qiymat albatta qo'yiladi.
    const done = setTimeout(() => setShown(value), ms + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [value, settings.animations, ms]);

  return <>{format(shown)}</>;
}
