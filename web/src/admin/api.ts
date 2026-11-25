// Klien API admin. Token disimpan di sessionStorage (kunci 't', dibaca juga oleh halaman cetak) dan hanya hidup selama tab terbuka.
declare global {
  interface Window {
    CFG: { SUPABASE_URL: string; ANON_KEY: string; TURNSTILE_SITE_KEY: string };
    turnstile?: { render(el: HTMLElement, o: { sitekey: string; theme?: string }): string; getResponse(id?: string): string; reset(id?: string): void };
  }
}

let token = sessionStorage.getItem('t') || '';
let onExpire: () => void = () => {};
export const getToken = () => token;
export const setToken = (t: string) => { token = t; if (t) sessionStorage.setItem('t', t); else sessionStorage.removeItem('t'); };
export const setOnExpire = (f: () => void) => { onExpire = f; };

export type Page<T> = { rows: T[]; total: number; page: number; per: number };
type Opt = { method?: string; json?: unknown; body?: BodyInit };

function expired(): never { setToken(''); onExpire(); throw new Error('Sesi berakhir'); }
async function fail(r: Response): Promise<never> {
  const d = (await r.json().catch(() => ({}))) as { error?: string; detail?: string };
  throw new Error(r.status === 403 ? d.detail || 'Akses ditolak untuk peran Anda.' : d.detail || d.error || String(r.status));
}

export async function api<T = any>(path: string, o: Opt = {}): Promise<T> {
  const r = await fetch('/api/admin/' + path, { method: o.method || 'GET', body: o.json ? JSON.stringify(o.json) : o.body,
    headers: { Authorization: 'Bearer ' + token, ...(o.json ? { 'Content-Type': 'application/json' } : {}) } });
  if (r.status === 401) expired();
  if (!r.ok) await fail(r);
  return (await r.json().catch(() => ({}))) as T;
}

export async function upload(file: File, alt = ''): Promise<{ object_key: string }> {
  const r = await fetch('/api/admin/media?alt=' + encodeURIComponent(alt), { method: 'POST', body: file, headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) expired();
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error === 'type' ? 'Hanya PNG/JPG/WebP/GIF' : d.error === 'size' ? 'Maks 5 MB' : d.detail || d.error || String(r.status));
  return Array.isArray(d) ? d[0] : d;
}

export async function downloadPdf(kind: string, id: string, name: string): Promise<void> {
  const x = await fetch(`/api/admin/pdf/${kind}/${id}`, { headers: { Authorization: 'Bearer ' + token } });
  if (x.status === 401) expired();
  if (!x.ok) { const d = await x.json().catch(() => ({})); throw new Error(x.status === 403 ? d.detail || 'Akses ditolak.' : 'Gagal membuat PDF'); }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await x.blob()); a.download = name + '.pdf'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
