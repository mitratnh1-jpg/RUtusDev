import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './tailwind.css';

// Cloudflare Web Analytics (tanpa cookie). Aktif hanya bila VITE_CF_BEACON_TOKEN diisi (32 karakter hex).
const beacon = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;
if (beacon && /^[a-f0-9]{32}$/i.test(beacon)) {
  const s = document.createElement('script');
  s.defer = true; s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: beacon }));
  document.head.appendChild(s);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
