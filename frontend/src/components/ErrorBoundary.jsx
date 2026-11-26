import { Component } from 'react';

// Kutilmagan xato butun ilovani oq ekranga aylantirmasin: tushunarli xabar, qayta yuklash va ma'lumotni yuklab olish.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Mizan xatosi:', error);
  }

  backup = () => {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pulim.')) data[k] = localStorage.getItem(k);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mizan-zaxira.json';
      a.click();
    } catch {
      // zaxira ham bo'lmasa, foydalanuvchi sahifani qayta yuklaydi
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen grid place-items-center bg-[#060E1F] p-6 text-center text-plaster">
        <div className="app-glass max-w-sm rounded-3xl p-6">
          <p className="font-display text-2xl font-semibold text-plaster">Nimadir xato ketdi</p>
          <p className="mt-2 text-sm text-plaster/70">Ma'lumotlaringiz o'chmagan. Sahifani qayta yuklab ko'ring. Takrorlansa, avval zaxira nusxani yuklab oling.</p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => location.reload()} className="rounded-xl bg-turq px-4 py-3 font-semibold text-cobalt-night transition hover:bg-[#32BDB6]">Qayta yuklash</button>
            <button onClick={this.backup} className="rounded-xl border border-plaster/18 bg-[#0A1F45] px-4 py-3 font-semibold text-plaster transition hover:border-ochre/45">Zaxira nusxani yuklab olish</button>
          </div>
        </div>
      </div>
    );
  }
}
