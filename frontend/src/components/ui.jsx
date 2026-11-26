import { useEffect, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatDigitsInput } from '../lib/format';

export const inputCls =
  'w-full rounded-xl border border-plaster/16 bg-[#071633]/85 px-3 py-2.5 text-[15px] text-plaster outline-none transition placeholder:text-plaster/35 focus:border-turq focus:ring-4 focus:ring-turq/15';

export function MoneyInput({ ref: outerRef, value, onChange, className = inputCls, maxDigits = 12, ...props }) {
  const ref = useRef(null);
  const caretRef = useRef(null);

  const setRefs = (el) => {
    ref.current = el;
    if (typeof outerRef === 'function') outerRef(el);
    else if (outerRef) outerRef.current = el;
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && caretRef.current !== null && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  const handleChange = (e) => {
    const raw = e.target.value;
    const sel = e.target.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, sel).replace(/\D/g, '').length;
    const formatted = formatDigitsInput(raw, maxDigits);
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBefore) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    caretRef.current = pos;
    onChange(formatted);
  };

  return (
    <input
      ref={setRefs}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={`${className} tabular-nums`}
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <section className={`app-glass rounded-2xl p-4 text-plaster sm:p-5 ${className}`} {...props}>
      {children}
    </section>
  );
}

export function CardTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-plaster">
        {Icon && <Icon className="size-4.5 text-ochre" aria-hidden />}
        {children}
      </h2>
      {action}
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-turq text-cobalt-night hover:bg-[#32BDB6] shadow-sm shadow-black/35',
  ghost: 'bg-plaster/10 text-plaster/90 hover:bg-plaster/16',
  outline: 'bg-[#0A1F45]/75 text-plaster ring-1 ring-plaster/18 hover:border-ochre/40 hover:bg-[#123066]/80',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500',
  subtle: 'text-plaster/70 hover:bg-plaster/10 hover:text-plaster',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ label, icon: Icon, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-9 items-center justify-center rounded-lg text-plaster/65 transition hover:bg-plaster/10 hover:text-plaster ${className}`}
      {...props}
    >
      <Icon className="size-4.5" aria-hidden />
    </button>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-plaster/65">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-plaster/50">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl border border-plaster/12 bg-[#061228] p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
            value === o.value ? 'bg-cobalt text-plaster ring-1 ring-ochre/45 shadow-sm' : 'text-plaster/60 hover:text-plaster'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, color = 'bg-turq', className = '' }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-[#061228] ring-1 ring-plaster/10 ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-plaster/10 text-plaster/85 ring-plaster/12',
    green: 'bg-turq/18 text-turq-soft ring-turq/30',
    red: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
    amber: 'bg-ochre/18 text-[#F2C46B] ring-ochre/35',
    blue: 'bg-sky-500/15 text-sky-300 ring-sky-400/25',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tones[tone]}`}>{children}</span>;
}

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-plaster/18 bg-[#061228]/50 px-4 py-8 text-center">
      {Icon && <Icon className="size-7 text-ochre/70" aria-hidden />}
      <p className="font-semibold text-plaster">{title}</p>
      {text && <p className="max-w-sm text-sm text-plaster/65">{text}</p>}
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020713]/75 backdrop-blur-xs sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="app-dock animate-sheet max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-5 text-plaster shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between border-b border-plaster/12 pb-3">
          <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-plaster">{title}</h3>
          <IconButton label="Yopish" icon={X} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = 'slate', icon: Icon, sub }) {
  const tones = { slate: 'text-plaster', green: 'text-turq-soft', red: 'text-rose-400' };
  return (
    <div className="app-glass rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-plaster/60">
        {Icon && <Icon className="size-3.5 text-ochre" aria-hidden />}
        {label}
      </div>
      <div className={`font-display mt-1.5 text-lg font-semibold tracking-[-0.02em] tabular-nums sm:text-xl ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-plaster/55">{sub}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? 'bg-turq' : 'bg-plaster/20'}`}
    >
      <span className={`inline-block size-5 rounded-full bg-plaster shadow transition ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Estimate() {
  return <Badge tone="green">Hisobi ochiq</Badge>;
}
