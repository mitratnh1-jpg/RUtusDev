import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { api, upload, downloadPdf, errMsg, type Page } from './api';
import { T, GRP, L, type Field, type Tab } from './meta';
import { Pager, useLoad, Status } from './ui';
import type { Can, Row } from './types';

const parseItems = (txt: string) => txt.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a[0]).map(a => ({
  desc: a[0], qty: Number((a[1] || '1').replace(',', '.').replace(/[^\d.]/g, '')) || 1, price: Number((a[2] || '0').replace(/[^\d]/g, '')) || 0 }));
const parseGallery = (txt: string) => txt.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a[0]).map(a => ({ object_key: a[0], alt_text: a[1] || '' }));

function sub(t: Tab, r: Row): string {
  const base = (t.sub || []).map(k => L(r[k])).filter(Boolean).join(' · ');
  return base || (r.status ? L(r.status) : r.is_published === false ? 'Draf' : '') + (r.published_at ? ' · terbit ' + String(r.published_at).slice(0, 10) : '');
}

// Daftar + formulir untuk satu tabel. Daftar dipaginasi di server (20 baris per halaman).
export default function Crud({ tab, can }: { tab: string; can: Can }) {
  const t = T[tab], cw = can(GRP[tab], 'w');
  const [page, setPage] = useState(1), [editing, setEditing] = useState<Row | null>(null);
  const list = useLoad<Page<Row>>(() => api<Page<Row>>(`${tab}?page=${page}`), [tab, page]);
  const refs = useLoad<Record<string, Row[]>>(async () => {
    const out: Record<string, Row[]> = {};
    for (const [, ty, src] of t.f || []) if ((ty === 'ref' || ty === 'multi') && src && !out[src]) out[src] = await api<Row[]>(src);
    return out;
  }, [tab]);
  const d = list.data;
  // Halaman terakhir bisa kosong setelah hapus data: mundur otomatis ke halaman yang masih ada.
  useEffect(() => { if (d && !d.rows.length && page > 1 && d.total > 0) setPage(Math.max(1, Math.ceil(d.total / d.per))); }, [d, page]);

  const done = () => { setEditing(null); list.reload(); };
  return (
    <>
      <h1>{t.label}</h1>
      {!t.ro && cw && !editing && <button onClick={() => setEditing({})}>+ Tambah</button>}
      {editing && refs.data && <Form key={editing.id || 'new'} tab={tab} t={t} r={editing} refs={refs.data} can={can} onSaved={done} onClose={() => setEditing(null)} />}
      <Status err={list.err || refs.err} loading={!d || !refs.data} />
      {d && (d.rows.length ? d.rows.map(r => (
        <div className="row" key={r.id}>
          <div><b>{r[t.title || 'id']}</b><small>{sub(t, r)}</small></div>
          <div><button className="g" onClick={() => { setEditing(r); window.scrollTo(0, 0); }}>{cw ? 'Edit' : 'Lihat'}</button></div>
        </div>)) : <p>Belum ada data.</p>)}
      {d && <Pager page={d.page} total={d.total} per={d.per} onPage={setPage} />}
    </>
  );
}

function Form({ tab, t, r, refs, can, onSaved, onClose }: { tab: string; t: Tab; r: Row; refs: Record<string, Row[]>; can: Can; onSaved: () => void; onClose: () => void }) {
  const fields = t.f || [], g = GRP[tab];
  const ro = !!t.ro || !can(g, 'w');
  const [v, setV] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    for (const [k, ty, opt] of fields) {
      o[k] = ty === 'check' ? !!r[k]
        : ty === 'multi' ? (Array.isArray(r[k]) ? r[k] : [])
        : ty === 'gallery' ? (r.gallery || []).map((x: Row) => (x.alt_text ? `${x.object_key} | ${x.alt_text}` : x.object_key)).join('\n')
        : ty === 'items' ? (r.items || []).map((x: Row) => `${x.desc} | ${x.qty} | ${x.price}`).join('\n')
        : ty === 'select' ? r[k] || (opt as string[])[0]
        : Array.isArray(r[k]) ? r[k].join(', ') : r[k] ?? '';
    }
    return o;
  });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = (k: string, x: unknown) => setV(p => ({ ...p, [k]: x }));
  const guard = async (fn: () => Promise<void>) => { setErr(''); setBusy(true); try { await fn(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); } };

  const submit = (e: FormEvent) => { e.preventDefault(); guard(async () => {
    const o: Record<string, unknown> = {};
    for (const [k, ty] of fields) o[k] = ty === 'gallery' ? parseGallery(v[k]) : ty === 'items' ? parseItems(v[k]) : ty === 'check' ? !!v[k] : ty === 'number' ? Number(v[k]) || 0 : v[k];
    await api(r.id ? `${tab}/${r.id}` : tab, { method: r.id ? 'PATCH' : 'POST', json: o });
    onSaved();
  }); };

  const pickImage = (k: string, multi: boolean) => (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files || [])]; e.target.value = '';
    guard(async () => {
      for (const f of files) {
        const key = (await upload(f)).object_key;
        if (multi) setV(p => ({ ...p, [k]: (String(p[k]).trim() ? String(p[k]).trim() + '\n' : '') + key })); else set(k, key);
      }
    });
  };

  const input = ([k, ty = 'text', opt]: Field) => {
    if (ty === 'check') return <label className="c" key={k}><input type="checkbox" checked={!!v[k]} onChange={e => set(k, e.target.checked)} />{L(k)}</label>;
    if (ty === 'textarea') return <label key={k}>{L(k)}<textarea rows={5} value={v[k]} onChange={e => set(k, e.target.value)} /></label>;
    if (ty === 'items') return <label key={k}>{L(k)}<textarea rows={6} placeholder="Pembuatan landing page | 1 | 3500000" value={v[k]} onChange={e => set(k, e.target.value)} /></label>;
    if (ty === 'ref') return (
      <label key={k}>{L(k)}
        <select value={v[k] ?? ''} onChange={e => set(k, e.target.value)}>
          <option value="">— tidak ada —</option>
          {(refs[opt] || []).map(x => <option key={x.id} value={x.id}>{x.name || x.title}</option>)}
        </select>
      </label>);
    if (ty === 'multi') return (
      <fieldset key={k}><legend>{L(k)}</legend>
        {(refs[opt] || []).map(x => (
          <label className="c" key={x.id}>
            <input type="checkbox" checked={(v[k] as string[]).includes(x.id)} onChange={e => set(k, e.target.checked ? [...v[k], x.id] : (v[k] as string[]).filter(i => i !== x.id))} />{x.name}
          </label>)) }
        {!(refs[opt] || []).length && <small>Belum ada. Tambahkan di tab Teknologi.</small>}
      </fieldset>);
    if (ty === 'gallery') return (
      <label key={k}>{L(k)}
        <textarea rows={4} placeholder="uploads/… | teks alternatif" value={v[k]} onChange={e => set(k, e.target.value)} />
        <input type="file" accept="image/*" multiple onChange={pickImage(k, true)} />
      </label>);
    if (ty === 'select') return <label key={k}>{L(k)}<select value={v[k]} onChange={e => set(k, e.target.value)}>{(opt as string[]).map(o => <option key={o} value={o}>{L(o)}</option>)}</select></label>;
    if (ty === 'image') return (
      <label key={k}>{L(k)}
        <input value={v[k]} placeholder="uploads/…" onChange={e => set(k, e.target.value)} />
        <input type="file" accept="image/*" onChange={pickImage(k, false)} />
      </label>);
    return <label key={k}>{L(k)}<input type={ty} value={v[k]} onChange={e => set(k, e.target.value)} /></label>;
  };

  return (
    <form onSubmit={submit}>
      <fieldset className="plain" disabled={ro || busy}>{fields.map(input)}</fieldset>
      <div>
        {!ro && <button disabled={busy}>Simpan</button>}{' '}
        <button type="button" className="g" onClick={onClose}>Tutup</button>{' '}
        {r.id && !t.ro && can(g, 'd') && <button type="button" className="d" disabled={busy} onClick={() => confirm('Hapus data ini?') && guard(async () => { await api(`${tab}/${r.id}`, { method: 'DELETE' }); onSaved(); })}>Hapus</button>}{' '}
        {t.print && r.id && <>
          <button type="button" className="g" disabled={busy} onClick={() => guard(() => downloadPdf(t.print!, r.id, r.number || t.print!))}>Unduh PDF</button>{' '}
          <button type="button" className="g" onClick={() => window.open(`/admin/cetak.html?t=${t.print}&id=${r.id}`, '_blank')}>Cetak</button>
        </>}{' '}
        {tab === 'leads' && r.id && can('crm', 'w') && <button type="button" className="g" disabled={busy} onClick={() => guard(async () => {
          await api(`leads/${r.id}/convert`, { method: 'POST' }); alert('Prospek dijadikan peluang (status: Baru). Lihat di tab Alur penjualan.'); onSaved();
        })}>Jadikan peluang</button>}
      </div>
      <p className="err">{err}</p>
    </form>
  );
}
