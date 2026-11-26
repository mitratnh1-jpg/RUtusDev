import { useEffect, useState } from 'react';
import type { Content } from './types';

// Konten dari CMS. Bila gagal/kosong, halaman memakai konten bawaan.
// `loading` = true sampai permintaan selesai (berhasil, gagal, atau lewat 8 detik), dipakai untuk menampilkan skeleton.
export function useContentState(): { c: Content | null; loading: boolean } {
  const [c, setC] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ac = new AbortController(), timer = window.setTimeout(() => ac.abort(), 8000);
    fetch('/api/public/content', { signal: ac.signal, cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || typeof d !== 'object') return;
        // Jaga bentuk data: bila API mengirim objek error, bagian itu jadi array/objek kosong (halaman tetap tampil dengan konten bawaan).
        const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
        const set = d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings) ? d.settings : {};
        setC({ ...d, services: arr(d.services), projects: arr(d.projects), testimonials: arr(d.testimonials), articles: arr(d.articles), clients: arr(d.clients), settings: set } as Content);
      })
      .catch(() => {})
      .finally(() => { window.clearTimeout(timer); setLoading(false); });
    return () => { window.clearTimeout(timer); ac.abort(); };
  }, []);
  return { c, loading };
}
export function useContent(): Content | null { return useContentState().c; }
