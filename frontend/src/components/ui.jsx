import { useEffect } from 'react';
import { X } from 'lucide-react';

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15';

export function Card({ className = '', children, ...props }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5 ${className}`} {...props}>
      {children}
    </section>
  );
}

export function CardTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
        {Icon && <Icon className="size-4.5 text-emerald-600" aria-hidden />}
        {children}
      </h2>
      {action}
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
  ghost: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  outline: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  subtle: 'text-slate-600 hover:bg-slate-100',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
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
      className={`inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${className}`}
      {...props}
    >
      <Icon className="size-4.5" aria-hidden />
    </button>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl bg-slate-100 p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, color = 'bg-emerald-500', className = '' }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-transparent ${tones[tone]}`}>{children}</span>;
}

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
      {Icon && <Icon className="size-7 text-slate-300" aria-hidden />}
      <p className="font-semibold text-slate-700">{title}</p>
      {text && <p className="max-w-sm text-sm text-slate-500">{text}</p>}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="animate-sheet max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <IconButton label="Yopish" icon={X} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = 'slate', icon: Icon, sub }) {
  const tones = { slate: 'text-slate-900', green: 'text-emerald-600', red: 'text-rose-600' };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Estimate() {
  return <Badge tone="green">Hisobi ochiq</Badge>;
}
