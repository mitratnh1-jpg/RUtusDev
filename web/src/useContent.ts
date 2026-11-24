import { useEffect, useState } from 'react';
import type { Content } from './types';

// Konten dari CMS. Bila gagal/kosong, halaman memakai konten bawaan.
export function useContent(): Content | null {
  const [c, setC] = useState<Content | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/public/content', { signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setC(d as Content))
      .catch(() => {});
    return () => ac.abort();
  }, []);
  return c;
}
