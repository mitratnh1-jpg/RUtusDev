import { useEffect, useRef } from 'react';

type P = { x: number; y: number; r: number; a: number; vx: number; vy: number };

// Titik-titik halus di hero; memadat di tengah dan menyala biru di dekat kursor/sentuhan.
export default function Dots() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')!, parent = c.parentElement!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, vis = true, lastW = 0, pts: P[] = [];
    const m = { x: -999, y: -999 };
    const size = () => {
      lastW = c.offsetWidth;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = c.offsetWidth; h = c.offsetHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(340, Math.max(140, Math.floor(w / 3)));
      pts = Array.from({ length: n }, () => {
        const g = (Math.random() + Math.random() + Math.random()) / 3; // sebaran condong ke tengah
        return { x: w * (0.15 + g * 0.7) + (Math.random() - 0.5) * w * 0.3, y: Math.random() * h, r: Math.random() * 1.3 + 0.35,
          a: Math.random() * 0.7 + 0.2, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18 };
      });
    };
    let last = 0;
    const draw = (now = 0) => {
      if (!reduce) raf = requestAnimationFrame(draw);
      if (!vis || document.hidden) return;
      if (!reduce && now - last < 30) return;  // ±30 fps: titik bergerak lambat, 60 fps tidak terlihat bedanya tapi membebani CPU saat scroll
      last = now;
      x.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0; }
        const d = Math.hypot(p.x - m.x, p.y - m.y), near = d < 120;
        x.fillStyle = near ? `rgba(120,140,255,${1 - d / 120})` : `rgba(255,255,255,${p.a * 0.7})`;
        x.beginPath(); x.arc(p.x, p.y, near ? p.r * 2.2 : p.r, 0, 7); x.fill();
      }
    };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; if (reduce) draw(); };
    const rs = () => { if (c.offsetWidth !== lastW) size(); };
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && reduce) draw(); }, { threshold: 0 });
    io.observe(parent); parent.addEventListener('pointermove', move); addEventListener('resize', rs);
    size(); draw(performance.now());
    return () => { cancelAnimationFrame(raf); io.disconnect(); parent.removeEventListener('pointermove', move); removeEventListener('resize', rs); };
  }, []);
  return <canvas id="dots" ref={ref} aria-hidden="true" />;
}
