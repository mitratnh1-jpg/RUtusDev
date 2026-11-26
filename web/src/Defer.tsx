import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';

// Formulir kontak (dan skrip Turnstile-nya) dimuat terpisah: baru diunduh saat bagian itu mendekati layar, saat alamat memakai #contact,
// atau saat browser idle. Placeholder tetap membawa id="contact" dan tinggi perkiraan, jadi tautan #contact dan tombol chat tetap bekerja
// dan halaman tidak bergeser saat formulir muncul.
const Contact = lazy(() => import('./Contact'));
type P = { wa?: string; email: string };

const shell = (children?: ReactNode, ref?: Ref<HTMLElement>) => (
  <section ref={ref} className="dark contact-s" id="contact" data-nav="dark" style={children ? undefined : { minHeight: 620 }} aria-busy={children ? undefined : true}>{children}</section>
);

export default function Defer(p: P) {
  const [on, setOn] = useState(() => typeof location !== 'undefined' && location.hash === '#contact');
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (on) return;
    const go = () => setOn(true);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) go(); }, { rootMargin: '900px 0px' }) : null;
    if (ref.current) io?.observe(ref.current); else go();
    // Cadangan: unduh saat browser idle, tetapi baru setelah 3 detik agar tidak bersaing dengan muat awal.
    let idle = 0;
    const wait = window.setTimeout(() => { idle = (window as any).requestIdleCallback ? (window as any).requestIdleCallback(go, { timeout: 3000 }) : window.setTimeout(go, 1000); }, 3000);
    window.addEventListener('hashchange', go);
    return () => { io?.disconnect(); window.removeEventListener('hashchange', go); clearTimeout(wait); if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idle); else clearTimeout(idle); };
  }, [on]);
  return on ? <Suspense fallback={shell()}><Contact {...p} /></Suspense> : shell(undefined, ref);
}
