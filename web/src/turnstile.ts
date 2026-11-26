import { useEffect, useState } from 'react';

// Site key Turnstile untuk formulir kontak. Urutan sumber:
//  1. VITE_TURNSTILE_SITE_KEY saat build (bila bukan placeholder);
//  2. /api/public/config saat runtime (variabel TURNSTILE_SITE_KEY di Worker), sehingga situs tetap bekerja walau
//     web/.env masih berisi placeholder atau variabel build belum diisi.
// Tidak ada sumber yang valid = 'missing': formulir menampilkan pesan jelas, bukan gagal diam-diam.
const valid = (k: unknown): k is string => typeof k === 'string' && !/^GANTI/i.test(k) && /^[0-9A-Za-z_-]{10,64}$/.test(k);

export type TurnstileKey = { key: string; state: 'loading' | 'ready' | 'missing' };

export function useTurnstileKey(): TurnstileKey {
  const built = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const fromBuild = valid(built) ? built : '';
  const [res, setRes] = useState<TurnstileKey>(fromBuild ? { key: fromBuild, state: 'ready' } : { key: '', state: 'loading' });
  useEffect(() => {
    if (fromBuild) return;
    const ac = new AbortController();
    fetch('/api/public/config', { signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setRes(valid(d?.turnstileSiteKey) ? { key: d.turnstileSiteKey, state: 'ready' } : { key: '', state: 'missing' }))
      .catch(() => { if (!ac.signal.aborted) setRes({ key: '', state: 'missing' }); });
    return () => ac.abort();
  }, [fromBuild]);
  return res;
}
