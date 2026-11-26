import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Chat from './Chat';

// Chatbot untuk halaman anak yang dirender Worker (/articles, /work/*, /services/*): halaman itu bukan aplikasi React, jadi
// worker/pages.ts memuat bundel ini lewat <script type="module" src="/chat-embed.js"> dan bundel ini memasang Chat sendiri.
// Namanya sengaja tetap (tanpa hash) lewat vite.config.ts; berkas statis selalu divalidasi ulang oleh Cloudflare sehingga aman.
type Content = { services?: { title?: string }[]; settings?: { contact?: { whatsapp?: string; email?: string } } };

function Embed() {
  const [p, setP] = useState<{ wa: string; email: string; services: string[] } | null>(null);
  useEffect(() => {
    const done = (c: Content | null) => {
      const ct = c?.settings?.contact ?? {};
      setP({
        wa: /^\d{6,16}$/.test(ct.whatsapp || '') ? ct.whatsapp! : '',  // kosong = tombol WhatsApp disembunyikan
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email || '') ? ct.email! : 'hello@rutusdev.com',
        services: Array.isArray(c?.services) ? c!.services!.map(x => String(x.title || '')).filter(Boolean) : [],
      });
    };
    fetch('/api/public/content').then(r => r.json()).then(done, () => done(null));
  }, []);
  return p ? <Chat {...p} /> : null;
}

// Tunda sebentar agar tidak bersaing dengan pemuatan halaman (sama seperti ChatLoader di landing).
setTimeout(() => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  createRoot(host).render(<Embed />);
}, 1500);
