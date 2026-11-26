import { useEffect, useState } from 'react';

// Buzilgan yoki eski localStorage qiymati ilovani qulatmasin: shakli mos kelmasa boshlang'ich qiymat olinadi.
export function sameShape(value, initial) {
  if (Array.isArray(initial)) return Array.isArray(value);
  if (initial !== null && typeof initial === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (initial === null || initial === undefined) return true;
  return typeof value === typeof initial;
}

export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return sameShape(parsed, initial) ? parsed : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode, file:// previews); the app keeps working in memory.
    }
  }, [key, value]);
  return [value, setValue];
}

export function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows) {
  // A text cell starting with = + - @ would run as a formula when the CSV is opened in Excel; a leading quote defuses it.
  const cell = (c) => {
    let s = String(c ?? '');
    if (typeof c === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n');
}
