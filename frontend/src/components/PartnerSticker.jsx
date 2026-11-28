import { useState } from 'react';
import { ArrowUpRight, Info, X } from 'lucide-react';
import { api } from '../lib/api';

// Begona logotiplar ishlatilmaydi (mualliflik huquqi): hamkor nomining bosh harfi va nomdan olingan rang.
function PartnerMark({ name, id }) {
  let h = 0;
  for (const ch of String(id || name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const letter = String(name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white shadow-inner"
      style={{ background: `linear-gradient(135deg, hsl(${h} 55% 38%), hsl(${(h + 40) % 360} 60% 28%))` }}
    >
      {letter}
    </span>
  );
}

export default function PartnerSticker({ partners }) {
  const [dismissed, setDismissed] = useState(false);
  const [clickedId, setClickedId] = useState('');

  if (dismissed || !Array.isArray(partners) || !partners.length) return null;

  const list = partners.slice(0, 3);
  const hasInstallment = list.some((p) => p.installment);

  const onPartnerOpen = (p) => {
    setClickedId(p.id);
    api.trackPartnerClick(p.id, 'assistant_ad').catch(() => {});
  };

  return (
    <div className="mt-3 rounded-2xl border border-plaster/14 bg-[#071633] p-3 text-plaster">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-plaster/60">Hamkor takliflari</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Takliflarni yopish"
          className="rounded-full p-1 text-plaster/45 hover:bg-plaster/10 hover:text-plaster"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-turq/25 bg-[#061228]/90 p-2.5">
            <PartnerMark name={p.name} id={p.id} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-plaster">{p.name}</span>
                <span className="rounded-full border border-ochre/50 bg-ochre/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-ochre">
                  Reklama
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-plaster/70" title={p.tagline}>{p.tagline}</p>
            </div>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => onPartnerOpen(p)}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-turq px-3 py-1.5 text-xs font-bold text-cobalt-night transition hover:bg-[#32BDB6]"
            >
              {clickedId === p.id ? 'Ochildi' : 'Saytga o‘tish'} <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        ))}
      </div>

      {hasInstallment && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-plaster/65">
          <Info className="mt-px size-3.5 shrink-0 text-ochre" aria-hidden="true" />
          Muddatli to'lovda umumiy narx oshishi mumkin. Shartlarni hamkor saytida tekshiring.
        </p>
      )}
      <p className="mt-1 text-[10px] text-plaster/45">Mizan hamkorlar bilan hozircha shartnoma tuzmagan: bu tavsiya, kafolat emas.</p>
    </div>
  );
}
