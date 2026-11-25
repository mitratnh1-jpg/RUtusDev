import { useEffect, useState, type ReactNode } from 'react';
import { errMsg } from './api';

export function Pager({ page, total, per, onPage }: { page: number; total: number; per: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / per));
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button className="g" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Sebelumnya</button>
      <span className="dim">Halaman {page} dari {pages} · {total} data</span>
      <button className="g" disabled={page >= pages} onClick={() => onPage(page + 1)}>Berikutnya →</button>
    </div>
  );
}

// Memuat data sekali (dan ulang bila deps berubah); menampilkan "Memuat…" atau pesan galat.
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; err: string; reload: () => void } {
  const [data, setData] = useState<T | null>(null), [err, setErr] = useState(''), [n, setN] = useState(0);
  useEffect(() => {
    let off = false; setErr('');
    fn().then(d => { if (!off) setData(d); }).catch(e => { if (!off) setErr(errMsg(e)); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { data, err, reload: () => setN(x => x + 1) };
}

export const Status = ({ err, loading }: { err: string; loading: boolean }): ReactNode =>
  err ? <p className="err">{err}</p> : loading ? <p>Memuat…</p> : null;
