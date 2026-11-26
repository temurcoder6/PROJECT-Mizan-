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
      <div role="alert" className="min-h-screen grid place-items-center bg-stone-50 p-6 text-center">
        <div className="max-w-sm">
          <p className="text-2xl font-bold text-stone-900">Nimadir xato ketdi</p>
          <p className="mt-2 text-stone-600">Ma'lumotlaringiz o'chmagan. Sahifani qayta yuklab ko'ring. Takrorlansa, avval zaxira nusxani yuklab oling.</p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => location.reload()} className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">Qayta yuklash</button>
            <button onClick={this.backup} className="rounded-xl border border-stone-300 px-4 py-3 font-semibold text-stone-700">Zaxira nusxani yuklab olish</button>
          </div>
        </div>
      </div>
    );
  }
}
