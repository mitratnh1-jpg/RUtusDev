import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as RPE } from 'react';
import CodeRain from './CodeRain';

type Variant = 'web' | 'app';
const LAYERS: Record<Variant, string[]> = { web: ['Website', 'Landing page', 'Aplikasi'], app: ['CRM', 'Dashboard', 'Faktur'] };
const PHRASES = ['prospek baru masuk…', 'peluang → penawaran…', 'penawaran → faktur…', 'faktur lunas ✓'];

function Typer() {
  const [s, setS] = useState('');
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setS(PHRASES[0]); return; }
    let i = 0, n = 0, dir = 1, id = 0;
    const tick = () => {
      const p = PHRASES[i];
      n += dir; setS(p.slice(0, n));
      let wait = 55 + Math.random() * 50;
      if (dir === 1 && n >= p.length) { dir = -1; wait = 1300; }
      else if (dir === -1 && n <= 0) { dir = 1; i = (i + 1) % PHRASES.length; wait = 350; }
      id = window.setTimeout(tick, wait);
    };
    id = window.setTimeout(tick, 400);
    return () => clearTimeout(id);
  }, []);
  return <code className="typer">{s}<u /></code>;
}

// Tumpukan kartu: geser (drag/swipe) kartu depan untuk memindahkannya ke belakang.
// Kartu belakang "turun" membentang mengikuti posisi gulir halaman.
export default function Deck({ variant }: { variant: Variant }) {
  const [order, setOrder] = useState([0, 1, 2]);
  const [drag, setDrag] = useState<{ x: number; y: number; fly?: boolean } | null>(null);
  const [used, setUsed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const st = useRef({ id: -1, sx: 0, sy: 0, on: false });
  const names = LAYERS[variant];

  useEffect(() => {
    const el = root.current!;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.style.setProperty('--p', '1'); return; }
    let raf = 0;
    const f = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      el.style.setProperty('--p', Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.85))).toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(f); };
    f(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', on); removeEventListener('resize', on); };
  }, []);

  const toBack = (dir: number) => {
    const w = root.current?.clientWidth || 300;
    setDrag({ x: dir * w * 1.05, y: 0, fly: true }); setUsed(true);
    setTimeout(() => { setOrder(o => [...o.slice(1), o[0]]); setDrag(null); }, 230);
  };
  const down = (e: RPE<HTMLDivElement>) => { st.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, on: false }; };
  const move = (e: RPE<HTMLDivElement>) => {
    const s = st.current; if (s.id !== e.pointerId) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (!s.on) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      s.on = true; e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag({ x: dx, y: dy * 0.25 });
  };
  const up = (e: RPE<HTMLDivElement>) => {
    const s = st.current; if (s.id !== e.pointerId) return; s.id = -1;
    if (!s.on) return;
    const dx = e.clientX - s.sx;
    if (Math.abs(dx) > 70) toBack(dx > 0 ? 1 : -1); else setDrag(null);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toBack(e.key === 'ArrowLeft' ? -1 : 1); }
  };
  const bring = (id: number) => { setUsed(true); setOrder(o => { const i = o.indexOf(id); return [...o.slice(i), ...o.slice(0, i)]; }); };

  return (
    <div className={'deck ' + variant} ref={root} role="group" aria-label={`Tumpukan kartu ${names[order[0]]}. Geser kartu depan untuk melihat kartu lain.`}>
      {[...order].reverse().map(id => {
        const d = order.indexOf(id), front = d === 0;
        const style: CSSProperties & Record<string, string | number> = { '--d': d, zIndex: 10 - d };
        if (front && drag) { style.transform = `translate3d(${drag.x}px,${drag.y}px,0) rotate(${drag.x / 22}deg)`; style.opacity = drag.fly ? 0.0 : 1; }
        const props = front
          ? { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key, tabIndex: 0 }
          : { onClick: () => bring(id), 'aria-label': `Tampilkan kartu ${names[id]}`, role: 'button' as const, tabIndex: 0, onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') bring(id); } };
        return (
          <div key={id} className={'dk' + (front ? ' front' : '') + (front && drag && !drag.fly ? ' drag' : '')} style={style} {...props}>
            {variant === 'web' ? (
              <>
                <div className="bar"><b /><b /><b /><em>{names[id]}</em></div>
                <div className="body"><CodeRain seed={id} /></div>
              </>
            ) : (
              <>
                <div className="bar2">Modul</div>
                <div className="mbody">
                  <span className={'sq' + (id === 0 ? ' b' : '')} />
                  <div><strong>{names[id]}</strong>{front ? <Typer /> : <span className="ln" />}</div>
                </div>
                <div className="bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              </>
            )}
          </div>
        );
      })}
      <p className={'hint' + (used ? ' gone' : '')} aria-hidden="true">← geser kartu →</p>
    </div>
  );
}
