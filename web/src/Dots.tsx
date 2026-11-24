import { useEffect, useRef } from 'react';

type P = { x: number; y: number; r: number; a: number; vx: number; vy: number };

// Titik-titik halus di hero; menyala biru muda di dekat kursor.
export default function Dots() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')!, parent = c.parentElement!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, pts: P[] = [];
    const m = { x: -999, y: -999 };
    const size = () => {
      w = c.width = c.offsetWidth; h = c.height = c.offsetHeight;
      pts = Array.from({ length: Math.min(260, Math.floor(w / 5)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.3, a: Math.random() * 0.6 + 0.2,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15 }));
    };
    const draw = () => {
      x.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0; }
        const d = Math.hypot(p.x - m.x, p.y - m.y), near = d < 140;
        x.fillStyle = near ? `rgba(56,189,248,${1 - d / 140})` : `rgba(255,255,255,${p.a * 0.6})`;
        x.beginPath(); x.arc(p.x, p.y, near ? p.r * 2 : p.r, 0, 7); x.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; if (reduce) draw(); };
    parent.addEventListener('pointermove', move); addEventListener('resize', size);
    size(); draw();
    return () => { cancelAnimationFrame(raf); parent.removeEventListener('pointermove', move); removeEventListener('resize', size); };
  }, []);
  return <canvas id="dots" ref={ref} aria-hidden="true" />;
}
