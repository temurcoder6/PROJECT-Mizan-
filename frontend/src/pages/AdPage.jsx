import { ArrowLeft } from 'lucide-react';
import PromoAd from '../components/PromoAd';

// Short ad with a person, kept apart from the main site so it can be polished and recorded on its own.
export default function AdPage({ onExit }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#0B1B16] text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-[#C8F169]/10 blur-3xl" aria-hidden />
      <div className="relative z-20 p-4">
        <button type="button" onClick={onExit} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
          <ArrowLeft className="size-4" /> Saytga
        </button>
      </div>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-4 pb-16">
        <h1 className="mb-8 text-center font-serif text-2xl font-bold">Qisqa reklama roligi (alohida)</h1>
        <PromoAd />
      </div>
    </div>
  );
}
