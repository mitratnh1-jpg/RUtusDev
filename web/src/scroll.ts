// Satu pendengar scroll bersama untuk seluruh halaman, dibatasi satu kali per frame (rAF).
// Semua efek terkait scroll memakai ini agar tidak ada banyak handler yang bersaing.
// DUA FASE: tiap pelanggan membaca (getBoundingClientRect, dll.) lalu boleh mengembalikan fungsi "tulis".
// Semua pembacaan selesai lebih dulu, baru semua penulisan dijalankan. Tanpa ini, baca-tulis-baca-tulis bergantian
// memaksa browser menghitung ulang layout berkali-kali dalam satu frame (penyebab scroll tersendat).
type Fn = (y: number, vh: number) => void | (() => void);
const subs = new Set<Fn>();
let raf = 0, bound = false;
const run = () => {
  raf = 0;
  const y = scrollY, vh = innerHeight, writes: (() => void)[] = [];
  subs.forEach(f => { const w = f(y, vh); if (w) writes.push(w); });
  for (const w of writes) w();
};
const req = () => { if (!raf) raf = requestAnimationFrame(run); };
export function onScrollFrame(fn: Fn): () => void {
  subs.add(fn);
  if (!bound) { bound = true; addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); }
  req();
  return () => { subs.delete(fn); };
}
export const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
