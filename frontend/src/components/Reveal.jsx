import { useEffect, useRef, useState } from 'react';
import { LITE } from '../lib/perf';

function prefersReduced() {
  if (typeof window === 'undefined') return true;
  return LITE || document.documentElement.classList.contains('lite') || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

// Koshin kabi sokin paydo bo'lish: faqat transform va opacity; lite rejimda darhol ko'rinadi.
export function Reveal({ children, className = '', delay = 0, y = 14 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => prefersReduced() || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const style = prefersReduced()
    ? undefined
    : {
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 520ms cubic-bezier(.16,1,.3,1) ${delay}ms, transform 520ms cubic-bezier(.16,1,.3,1) ${delay}ms`,
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

// 1px oxra chiziq: ko'rinishga kirganda chapdan o'ngga chiziladi.
export function OchreRule({ className = '', delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => prefersReduced() || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const style = prefersReduced()
    ? undefined
    : {
        transform: shown ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left center',
        transition: `transform 650ms cubic-bezier(.16,1,.3,1) ${delay}ms`,
      };

  return <span ref={ref} className={`block h-px bg-ochre/65 ${className}`} style={style} aria-hidden />;
}
