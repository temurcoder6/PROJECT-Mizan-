export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const CYR_TO_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sh', ъ: "'", ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
};

export function cyrToLat(s) {
  return [...s]
    .map((ch) => {
      const lo = ch.toLowerCase();
      const m = CYR_TO_LAT[lo];
      if (m === undefined) return ch;
      return ch === lo || !m ? m : m[0].toUpperCase() + m.slice(1);
    })
    .join('');
}

const LAT_PAIRS = { "o'": 'ў', "g'": 'ғ', sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ye: 'е' };
const LAT_SINGLE = {
  a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з',
};
const isLatin = (ch) => /[a-z]/i.test(ch || '');

// Uzbek Latin -> Cyrillic, used to answer users who write in Cyrillic.
export function latToCyr(input) {
  const s = input.replace(/[‘’ʻʼ`´]/g, "'");
  let out = '';
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    const upper = ch !== ch.toLowerCase();
    const two = s.slice(i, i + 2).toLowerCase();
    const yoBeforeApostrophe = two === 'yo' && s[i + 2] === "'";
    if (LAT_PAIRS[two] && !yoBeforeApostrophe) {
      const c = LAT_PAIRS[two];
      out += upper ? c.toUpperCase() : c;
      i += 2;
      continue;
    }
    const lo = ch.toLowerCase();
    if (lo === 'e' && !isLatin(s[i - 1])) {
      out += upper ? 'Э' : 'э';
    } else if (ch === "'" && isLatin(s[i - 1]) && isLatin(s[i + 1])) {
      out += 'ъ';
    } else if (LAT_SINGLE[lo] && isLatin(ch)) {
      out += upper ? LAT_SINGLE[lo].toUpperCase() : LAT_SINGLE[lo];
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
}

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
