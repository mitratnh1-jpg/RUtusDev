import { useEffect, useRef } from 'react';

const TXT = `import { createRoot } from 'react-dom/client'; const res = await fetch('/api/leads', { method: 'POST' }); wrangler deploy --minify; select * from leads where status = 'new'; <section id="contact" class="dark"> export default function App() { return <Nav /> } npm run build && npm run deploy; supabase.auth.getSession(); const rows = await env.MEDIA.list(); `;
const RAMP = ' .:-=+*#%@';

// Huruf kode yang bergulir, memadat menjadi "bola" ASCII yang melayang; bereaksi pada kursor/sentuhan.
export default function CodeRain({ seed = 0, calm = false }: { seed?: number; calm?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const calmRef = useRef(calm);  // kartu belakang (calm) hanya ±6 fps; kartu depan tetap ±24 fps
  calmRef.current = calm;
  useEffect(() => {
    const c = ref.current!, g = c.getContext('2d')!, box = c.parentElement!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CW = 5.6, CH = 9.5;
    let w = 0, h = 0, cols = 0, rows = 0, raf = 0, last = 0, vis = true, lastW = 0;
    const m = { x: -1, y: -1 };
    const size = () => {
      lastW = c.offsetWidth;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = c.offsetWidth; h = c.offsetHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CW); rows = Math.ceil(h / CH); g.font = `${CH - 1}px "JetBrains Mono", monospace`; g.textBaseline = 'top';
    };
    const draw = (now: number) => {
      raf = reduce ? 0 : requestAnimationFrame(draw);
      if (!vis || document.hidden || now - last < (calmRef.current ? 200 : 66)) return; // ±15 fps (±5 fps bila calm): cukup untuk efek huruf bergulir
      last = now;
      const t = now / 1000 + seed * 7;
      g.clearRect(0, 0, w, h);
      let fs = '';  // mengganti fillStyle itu mahal: hanya bila warnanya memang berbeda
      const cx = 0.5 + 0.26 * Math.sin(t * 0.45), cy = 0.55 + 0.18 * Math.cos(t * 0.33), asp = w / h;
      for (let r = 0; r < rows; r++) {
        const sp = 6 + ((r * 7 + seed * 3) % 9) * 2, off = Math.floor(r * 37 + t * sp * (r % 2 ? 1 : -1) + 4000);
        for (let k = 0; k < cols; k++) {
          const u = k / cols, v = r / rows;
          let d = Math.max(0, 1 - Math.hypot((u - cx) * asp, v - cy) / 0.62);
          if (m.x >= 0) d += Math.max(0, 1 - Math.hypot((u - m.x) * asp, v - m.y) / 0.2) * 0.9;
          let ch: string;
          if (d > 0.22) { ch = RAMP[Math.min(9, Math.floor(d * 9 + Math.random() * 1.4))]; const c2 = `rgba(53,70,255,${(Math.round(Math.min(0.95, 0.3 + d * 0.7) * 10) / 10)})`; if (c2 !== fs) g.fillStyle = fs = c2; }
          else {
            ch = TXT[(((off + k) % TXT.length) + TXT.length) % TXT.length];
            if (Math.random() < 0.012) ch = '#%@*+=<>/'[Math.floor(Math.random() * 9)];
            if (fs !== 'g') g.fillStyle = (fs = 'g', 'rgba(105,98,90,.42)');
          }
          if (ch !== ' ') g.fillText(ch, k * CW, r * CH);
        }
      }
    };
    const rs = () => { if (c.offsetWidth !== lastW) size(); };
    const move = (e: PointerEvent) => { const b = c.getBoundingClientRect(); m.x = (e.clientX - b.left) / b.width; m.y = (e.clientY - b.top) / b.height; if (reduce) draw(performance.now()); };
    const leave = () => { m.x = m.y = -1; };
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: 0 });
    io.observe(box); box.addEventListener('pointermove', move); box.addEventListener('pointerleave', leave); addEventListener('resize', rs);
    size(); raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); io.disconnect(); box.removeEventListener('pointermove', move); box.removeEventListener('pointerleave', leave); removeEventListener('resize', rs); };
  }, [seed]);
  return <canvas className="rain" ref={ref} aria-hidden="true" />;
}
