// Qisqa tanishtirish roligi (1 daqiqa, 120 kadr/s). Video faqat metadata yuklaydi:
// sahifa ochilganda og'ir fayl tushmaydi, bosilganda o'ynaydi.
export default function ExplainerVideo() {
  return (
    <section className="relative overflow-hidden bg-cobalt-night text-plaster">
      <div className="mx-auto w-full max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-sm font-semibold text-plaster/70">Qisqa tanishtirish · 1 daqiqa</p>
          <div className="rounded-2xl p-[6px]" style={{ background: '#0A1F45', boxShadow: 'inset 0 0 0 1px rgba(201,150,43,0.55), 0 24px 48px -28px rgba(3,10,26,0.9)' }}>
            <video
              className="block aspect-video w-full rounded-xl bg-cobalt-night"
              src="/tanitish.mp4"
              controls
              playsInline
              preload="metadata"
              aria-label="Mizan qisqa tanishtirish roligi"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
