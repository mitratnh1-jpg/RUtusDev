import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as RKE, type MouseEvent as RME, type PointerEvent as RPE, type ReactNode } from 'react';
import Reveal from './Reveal';
import { reducedMotion } from './scroll';
import { KATALOG, KATALOG_NOTE } from '../../shared/katalog';

// Ikon garis 24×24 per kategori (stroke mengikuti warna teks kartu).
const ICON: Record<string, ReactNode> = {
  page: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9h18M7 14h6M7 17h3" /></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16M13 9h5M13 13h5M13 17h3" /></>,
  cart: <><path d="M3 4h2.2l2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 8H6.2" /><circle cx="9.5" cy="19" r="1.4" /><circle cx="16.5" cy="19" r="1.4" /></>,
  app: <><rect x="3" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><path d="M17.2 14v6.5M14 17.2h6.5" /></>,
  cloud: <><path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.6a4.5 4.5 0 0 1-.5 8.9H7Z" /><path d="M12 12v4.5m0 0-1.8-1.8M12 16.5l1.8-1.8" /></>,
  shield: <><path d="M12 3 5 6v5.5c0 4.3 2.8 7.6 7 9.5 4.2-1.9 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  plus: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" /></>,
  flow: <><circle cx="5.5" cy="6" r="2.2" /><circle cx="18.5" cy="12" r="2.2" /><circle cx="5.5" cy="18" r="2.2" /><path d="M7.7 6h4.8a3 3 0 0 1 3 3v.8M7.7 18h4.8a3 3 0 0 0 3-3v-.8" /></>,
};

const N = KATALOG.length;

export default function Catalog() {
  const track = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState(0);            // 0..1 posisi geser, untuk bilah progres
  const [idx, setIdx] = useState(0);            // kartu paling dekat pusat
  const [shown, setShown] = useState(false);    // animasi masuk berjalan sekali
  const drag = useRef({ id: -1, x: 0, left: 0, moved: false });
  const raf = useRef(0);

  // Hitung "fokus" tiap kartu (1 = tepat di tengah): kartu tengah sedikit lebih besar dan jelas, tepi mengecil lembut.
  const update = useCallback(() => {
    const el = track.current; if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2, kids = Array.from(el.children) as HTMLElement[];
    kids.forEach(k => {
      const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid), f = Math.max(0, 1 - d / (el.clientWidth * 0.62));
      k.style.setProperty('--f', f.toFixed(3));
    });
    // Indeks = kartu yang sejajar tepi kiri; di ujung kanan selalu kartu terakhir.
    const max = el.scrollWidth - el.clientWidth, step = kids.length > 1 ? (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft : 1;
    setIdx(el.scrollLeft >= max - 2 ? kids.length - 1 : Math.min(kids.length - 1, Math.round(el.scrollLeft / Math.max(1, step))));
    setPos(el.scrollLeft / Math.max(1, max));
  }, []);
  const onScroll = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(update); };

  useEffect(() => {
    update();
    const el = track.current!;
    const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null; ro?.observe(el);
    if (reducedMotion() || !('IntersectionObserver' in window)) { setShown(true); return () => ro?.disconnect(); }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => { io.disconnect(); ro?.disconnect(); cancelAnimationFrame(raf.current); };
  }, [update]);

  const go = (d: number) => {
    const el = track.current; if (!el) return;
    const kids = el.children, to = Math.max(0, Math.min(N - 1, idx + d)), k = kids[to] as HTMLElement;
    el.scrollTo({ left: k.offsetLeft - 20, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  // Seret dengan mouse (sentuhan memakai geser bawaan browser). Klik setelah menyeret dibatalkan agar tidak membuka tautan.
  const down = (e: RPE<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = track.current!; drag.current = { id: e.pointerId, x: e.clientX, left: el.scrollLeft, moved: false };
  };
  const move = (e: RPE<HTMLUListElement>) => {
    const d = drag.current, el = track.current!; if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) { d.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('is-drag'); }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const up = (e: RPE<HTMLUListElement>) => {
    const d = drag.current; if (d.id !== e.pointerId) return; d.id = -1;
    track.current!.classList.remove('is-drag');
    if (d.moved) setTimeout(() => { d.moved = false; }, 0);
  };
  const noClickAfterDrag = (e: RME) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); } };

  // Efek kartu: miring mengikuti kursor + cahaya sorot. Hanya untuk mouse; layar sentuh memakai efek tekan.
  const tilt = (e: RPE<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || reducedMotion() || drag.current.moved) return;
    const c = e.currentTarget, r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); c.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    c.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`); c.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
  };
  const rest = (e: RPE<HTMLElement>) => { const c = e.currentTarget; c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };

  const onKey = (e: RKE) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };

  return (
    <div className="kat" id="catalog">
      <div className="wrap">
        <Reveal>
          <p className="pill">Katalog layanan &amp; estimasi harga</p>
          <h2><b>Pilih layanan, lihat estimasinya.</b> <span>Transparan sejak awal.</span></h2>
          <p className="lead dim">Biaya pengembangan satu kali, domain, cloud/server, dan pemeliharaan dipisahkan, jadi Anda hanya membayar yang benar-benar dibutuhkan. Geser kartu, lalu buka halaman rinciannya.</p>
        </Reveal>
        <div className="kat-ctrl">
          <span className="kat-count" aria-live="polite"><b>{String(idx + 1).padStart(2, '0')}</b> / {String(N).padStart(2, '0')}</span>
          <div className="kat-prog" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0.1, pos)})` }} /></div>
          <button type="button" aria-label="Kartu sebelumnya" onClick={() => go(-1)} disabled={idx === 0}>←</button>
          <button type="button" aria-label="Kartu berikutnya" onClick={() => go(1)} disabled={idx === N - 1}>→</button>
        </div>
      </div>

      <ul className={'kat-track wrap' + (shown ? ' in' : '')} ref={track} tabIndex={0} aria-label="Daftar layanan, geser ke samping"
        onScroll={onScroll} onKeyDown={onKey} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={noClickAfterDrag}>
        {KATALOG.map((k, i) => (
          <li className="kcard" key={k.slug} style={{ '--i': i } as CSSProperties}>
            <a className="kc" href={`/layanan/${k.slug}`} draggable={false} onPointerMove={tilt} onPointerLeave={rest} aria-label={`${k.short}: ${k.headline}. Lihat detail`}>
              <span className="kc-glow" aria-hidden="true" />
              <span className="kc-top">
                <span className="kc-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICON[k.icon]}</svg></span>
                <span className="kc-no">{k.no}</span>
              </span>
              <h3>{k.short}</h3>
              <span className="kc-price">{k.headline}</span>
              <span className="kc-sum">{k.summary}</span>
              <ul className="kc-pts">{k.points.map(p => <li key={p}>{p}</li>)}</ul>
              <span className="kc-go">Lihat detail <i aria-hidden="true">→</i></span>
            </a>
          </li>
        ))}
      </ul>

      <div className="wrap">
        <div className="kat-dots" role="presentation">
          {KATALOG.map((k, i) => <button type="button" key={k.slug} className={i === idx ? 'on' : ''} aria-label={`Ke kartu ${i + 1}: ${k.short}`} onClick={() => go(i - idx)} />)}
        </div>
        <p className="small kat-note">{KATALOG_NOTE}</p>
        <p className="links"><a href="/layanan">Lihat semua layanan &amp; harga <i>→</i></a><a href="#contact">Minta penawaran <i>→</i></a></p>
      </div>
    </div>
  );
}
