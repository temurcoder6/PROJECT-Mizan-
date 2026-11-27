import { useState } from 'react';
import { ArrowUpRight, Gift, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';

function AnimatedSticker({ animated = true }) {
  return (
    <div className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ochre/25 via-turq/20 to-cobalt border border-ochre/40 shadow-lg ${animated ? 'animate-[bounce_3s_ease-in-out_infinite]' : ''}`}>
      <svg viewBox="0 0 48 48" className="size-8" aria-hidden="true">
        <defs>
          <linearGradient id="stkGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2C46B" />
            <stop offset="100%" stopColor="#1FA6A0" />
          </linearGradient>
        </defs>
        <rect x="8" y="14" width="32" height="22" rx="6" fill="url(#stkGrad)" opacity="0.92" />
        <path d="M8 21h32" stroke="#071633" strokeWidth="3" />
        <circle cx="16" cy="29" r="2.5" fill="#071633" />
        <path d="M24 8l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#F2C46B" />
      </svg>
      <Sparkles className={`absolute -top-1.5 -right-1.5 size-4 text-ochre ${animated ? 'animate-pulse' : ''}`} />
    </div>
  );
}

export default function PartnerSticker({ partners, animated = true }) {
  const [dismissed, setDismissed] = useState(false);
  const [clickedId, setClickedId] = useState('');

  if (dismissed || !Array.isArray(partners) || !partners.length) return null;

  const onPartnerOpen = (p) => {
    setClickedId(p.id);
    api.trackPartnerClick(p.id, 'assistant_sticker').catch(() => {});
  };

  return (
    <div className="mt-3 rounded-2xl border border-ochre/35 bg-gradient-to-r from-[#081A3D] via-[#0B2350] to-[#071633] p-3 text-plaster shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-ochre uppercase">
          <Gift className="size-3.5" /> Qulay taklif (Hamkor)
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Taklifni yopish"
          className="rounded-full p-1 text-plaster/45 hover:bg-plaster/10 hover:text-plaster"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {partners.slice(0, 2).map((p, idx) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-turq/25 bg-[#061228]/90 p-2.5">
            {idx === 0 && <AnimatedSticker animated={animated} />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-plaster">{p.name}</span>
                <span className="rounded-full bg-turq/15 px-2 py-0.5 text-[10px] font-semibold text-turq-soft ring-1 ring-turq/30">
                  {p.badge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-plaster/70 line-clamp-2">{p.benefit || p.tagline}</p>
            </div>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onPartnerOpen(p)}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-turq px-3 py-1.5 text-xs font-bold text-cobalt-night transition hover:bg-[#32BDB6]"
            >
              {clickedId === p.id ? 'Ochildi' : "Ko'rish"} <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
