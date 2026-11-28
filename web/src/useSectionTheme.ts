import { useEffect, useState, type RefObject } from 'react';
import { onScrollFrame } from './scroll';

// Tema warna elemen melayang (tombol dan jendela chat) mengikuti bagian halaman (data-nav) yang sedang berada di
// belakangnya, sama seperti header: 'light' | 'dark' | 'blue'. Titik periksa = tengah vertikal elemen itu sendiri,
// bukan 36px dari atas seperti header, jadi tombol di pojok bawah berubah warna saat bagian di bawahnya berganti.
export type SectionTheme = 'light' | 'dark' | 'blue';
const THEMES = ['light', 'dark', 'blue'];

export function useSectionTheme(ref: RefObject<HTMLElement>): SectionTheme {
  const [theme, setTheme] = useState<SectionTheme>('dark');
  useEffect(() => { let cur: SectionTheme | null = null; return onScrollFrame((_y, vh) => {
    const r = ref.current?.getBoundingClientRect(), probe = r && r.height ? r.top + r.height / 2 : vh - 44;
    let found: SectionTheme | null = null;
    for (const e of Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'))) {
      const b = e.getBoundingClientRect();
      if (b.top <= probe && b.bottom > probe) { const t = e.dataset.nav || 'dark'; found = (THEMES.includes(t) ? t : 'dark') as SectionTheme; }
    }
    if (!found || found === cur) return undefined;  // celah antarbagian / tidak berubah: tidak perlu render ulang
    cur = found;
    const t = found;
    return () => setTheme(t);
  }); }, [ref]);
  return theme;
}
