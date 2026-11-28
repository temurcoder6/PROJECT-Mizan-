import { useEffect, useState } from 'react';
import { Download, Film } from 'lucide-react';

const VIDEO = {
  id: 'asosiy',
  duration: '0:47',
  title: 'Qisqa tanishtirish · 47 soniya',
  summary: "Muammo, kunlik reja, ikki bosishda kiritish, maqsad qachon va qancha pul yig'ish hisobi, xavfsizlik: bitta ixcham rolikda.",
  src: '/tanitish.mp4?v=sardor6',
  filename: 'mizan-tanishtirish.mp4',
};

// Yagona ixcham tanishtirish videosi: dastlabki skrollni to'smaslik uchun metadata bo'sh vaqtda yuklanadi.
export default function ExplainerVideo() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [metaReady, setMetaReady] = useState(false);

  useEffect(() => {
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = schedule(() => setMetaReady(true), { timeout: 2500 });
    return () => cancel(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-cobalt-night text-plaster" id="tanishtirish">
      <div className="mx-auto w-full max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-plaster/90">
              <Film className="h-4 w-4 text-ochre" aria-hidden="true" />
              <span>{VIDEO.title}</span>
            </div>
            <a
              href={VIDEO.src}
              download={VIDEO.filename}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ochre/35 bg-cobalt-deep/75 px-3 py-1.5 text-xs font-semibold text-plaster/85 transition hover:border-ochre hover:text-plaster"
            >
              <Download className="h-3.5 w-3.5 text-ochre" aria-hidden="true" />
              <span>Yuklab olish ({VIDEO.duration})</span>
            </a>
          </div>

          <p className="mb-4 text-xs text-plaster/65">{VIDEO.summary}</p>

          <div
            className="rounded-2xl p-[6px]"
            style={{
              background: '#0A1F45',
              boxShadow: 'inset 0 0 0 1px rgba(201,150,43,0.55), 0 24px 48px -28px rgba(3,10,26,0.9)',
            }}
          >
            {failed ? (
              <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl bg-cobalt-night px-6 text-center text-sm text-plaster/75">
                <p>Videoni yuklab bo‘lmadi.</p>
                <p className="mt-1 text-xs text-plaster/50">Server ishlayotganini tekshiring va qayta urinib ko‘ring.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFailed(false);
                    setAttempt((n) => n + 1);
                  }}
                  className="mt-4 rounded-lg border border-ochre/45 bg-cobalt px-4 py-2 text-xs font-semibold text-plaster transition hover:border-ochre hover:bg-cobalt-deep"
                >
                  Qayta yuklash
                </button>
              </div>
            ) : (
                <video
                key={`${VIDEO.id}-${attempt}`}
                className="block aspect-video w-full rounded-xl bg-cobalt-night"
                src={VIDEO.src}
                controls
                playsInline
                preload={metaReady ? 'metadata' : 'none'}
                aria-label={VIDEO.title}
                onError={() => setFailed(true)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
