import { categoryLabel } from '../categories.js';
import { repliesFor } from './replies.js';

// Turns advice items (numbers already computed by formulas) into text in the user's language.
export function adviceText(items, lang) {
  const T = repliesFor(lang);
  const label = (id) => (id ? categoryLabel(id, lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uz') : '');
  const lines = items.map((i) => {
    if (i.t === 'over') return T.advOver({ ...i, catLabel: label(i.cat) });
    if (i.t === 'cat') return T.advCat({ ...i, catLabel: label(i.cat) });
    if (i.t === 'habit') return T.advHabit(i);
    if (i.t === 'none') return T.advNone();
    return T.advFew(i);
  });
  const single = items.length === 1 && (items[0].t === 'none' || items[0].t === 'few');
  return single ? lines[0] : [T.advIntro(), ...lines].join('\n');
}
