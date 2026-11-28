import { useEffect, useState } from 'react';
import { SERVICE_VALUES } from '../../shared/formOptions';

// Pilihan layanan/paket yang dibawa ke formulir kontak dari bagian lain (tombol "Pilih paket", tautan ?pilih=... dari halaman katalog).
// Disimpan di modul karena formulir dimuat belakangan (lazy) dan bisa belum ada saat pilihan dibuat.
let cur = '';
const subs = new Set<(v: string) => void>();
const ok = (v: string | null): v is string => !!v && SERVICE_VALUES.includes(v);
try { const v = new URLSearchParams(location.search).get('pilih'); if (ok(v)) cur = v; } catch { /* abaikan */ }

export function pickService(v: string) { if (!ok(v)) return; cur = v; subs.forEach(f => f(v)); }
export function usePicked(): string {
  const [v, setV] = useState(cur);
  useEffect(() => { subs.add(setV); setV(cur); return () => { subs.delete(setV); }; }, []);
  return v;
}
