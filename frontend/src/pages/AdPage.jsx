import { ArrowLeft } from 'lucide-react';
import PromoAd from '../components/PromoAd';

// Short ad with a person, kept apart from the main site so it can be polished and recorded on its own.
export default function AdPage({ onExit }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#060E1F] text-plaster">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-cobalt/35 blur-3xl" aria-hidden />
      <div className="relative z-20 p-4">
        <button type="button" onClick={onExit} className="flex items-center gap-2 rounded-full border border-plaster/15 bg-plaster/8 px-4 py-2 text-sm font-semibold hover:border-ochre/45 hover:bg-plaster/15">
          <ArrowLeft className="size-4" /> Saytga
        </button>
      </div>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-4 pb-16">
        <h1 className="font-display mb-8 text-center text-2xl font-semibold tracking-[-0.02em]">Qisqa reklama roligi (alohida)</h1>
        <PromoAd />
      </div>
    </div>
  );
}
