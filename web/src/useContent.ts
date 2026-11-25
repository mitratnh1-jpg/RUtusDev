import { useEffect, useState } from 'react';
import type { Content } from './types';

// Konten dari CMS. Bila gagal/kosong, halaman memakai konten bawaan.
export function useContent(): Content | null {
  const [c, setC] = useState<Content | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/public/content', { signal: ac.signal, cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || typeof d !== 'object') return;
        // Jaga bentuk data: bila API mengirim objek error, bagian itu jadi array/objek kosong (halaman tetap tampil dengan konten bawaan).
        const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
        const set = d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings) ? d.settings : {};
        setC({ ...d, services: arr(d.services), projects: arr(d.projects), testimonials: arr(d.testimonials), articles: arr(d.articles), clients: arr(d.clients), settings: set } as Content);
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);
  return c;
}
