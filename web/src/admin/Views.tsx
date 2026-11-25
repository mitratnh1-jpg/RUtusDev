import { useState, type FormEvent } from 'react';
import { api, upload, errMsg, type Page } from './api';
import { L, STAGES, rp } from './meta';
import { Pager, useLoad, Status } from './ui';
import type { Can, Row } from './types';

export function Pipeline({ can }: { can: Can }) {
  const { data, err, reload } = useLoad(() => Promise.all([api<Row[]>('deals'), api<Row[]>('organizations'), api<Row[]>('invoices')]), []);
  const [e2, setE2] = useState('');
  if (!data) return <><h1>Pipeline</h1><Status err={err} loading /></>;
  const [ds, orgs, invs] = data;
  const piutang = invs.filter(i => ['terkirim', 'dibayar_sebagian'].includes(i.status)).reduce((a, i) => a + ((i.items || []) as Row[]).reduce((b, x) => b + x.qty * x.price, 0) - Number(i.paid_amount || 0), 0);
  const on: Record<string, string> = Object.fromEntries(orgs.map(o => [o.id, o.name]));
  const sum = (f: (d: Row) => boolean) => ds.filter(f).reduce((a, d) => a + Number(d.value || 0), 0);
  const move = async (id: string, stage: string) => { setE2(''); try { await api('deals/' + id, { method: 'PATCH', json: { stage } }); } catch (x) { setE2(errMsg(x)); } reload(); };
  return (
    <>
      <h1>Pipeline</h1>
      <p style={{ color: 'var(--dim)' }}>Nilai pipeline aktif: <b style={{ color: '#fff' }}>{rp(sum(d => !['menang', 'kalah'].includes(d.stage)))}</b> · Menang: <b style={{ color: '#7ee787' }}>{rp(sum(d => d.stage === 'menang'))}</b> · Piutang invoice: <b style={{ color: '#ffd479' }}>{rp(piutang)}</b></p>
      <p style={{ color: 'var(--dim)' }}>Tambah peluang di tab <b>Peluang</b>, atau ubah prospek menjadi peluang di tab <b>Prospek</b>. Pindahkan tahap lewat menu di tiap kartu.</p>
      <p className="err">{e2}</p>
      <div className="kan">{STAGES.map(st => { const c = ds.filter(d => d.stage === st); return (
        <section key={st}><h3>{L(st)} <small>{c.length}</small></h3>
          {c.map(d => (
            <div className="k" key={d.id}><b>{d.title}</b><small>{on[d.organization_id] || ''} {d.value ? rp(d.value) : ''}</small>
              <select value={st} disabled={!can('crm', 'w')} onChange={e => move(d.id, e.target.value)}>{STAGES.map(x => <option key={x} value={x}>{L(x)}</option>)}</select></div>))}
        </section>); })}</div>
    </>
  );
}

export function Media({ can }: { can: Can }) {
  const [page, setPage] = useState(1), [msg, setMsg] = useState('');
  const { data, err, reload } = useLoad(() => api<Page<Row>>(`media?page=${page}`), [page]);
  const add = async (f?: File) => { if (!f) return; setMsg(''); try { await upload(f); setPage(1); reload(); } catch (x) { setMsg(errMsg(x)); } };
  const del = async (id: string) => { if (!confirm('Hapus gambar?')) return; try { await api('media/' + id, { method: 'DELETE' }); reload(); } catch (x) { setMsg(errMsg(x)); } };
  return (
    <>
      <h1>Media</h1>
      {can('content', 'w') && <form><label>Unggah gambar (maks 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; add(f); }} /></label><p className="err">{msg}</p></form>}
      <Status err={err} loading={!data} />
      {data && <div className="grid">{data.rows.map(r => (
        <div key={r.id}><img src={`/media/${r.object_key}?w=320`} alt="" loading="lazy" /><p>{r.object_key}</p>
          {can('content', 'd') && <button className="d" onClick={() => del(r.id)}>Hapus</button>}</div>))}</div>}
      {data && !data.rows.length && <p>Belum ada gambar.</p>}
      {data && <Pager page={data.page} total={data.total} per={data.per} onPage={setPage} />}
    </>
  );
}

const SET: Record<string, [string, string?][]> = {
  hero: [['eyebrow'], ['headline'], ['headline_dim'], ['subheadline', 'textarea'], ['cta_primary'], ['cta_secondary']],
  contact: [['whatsapp'], ['email']], stats: [['projects'], ['timeline']] };
const SET_TITLE: Record<string, string> = { hero: 'Hero', stats: 'Statistik landing (kosongkan = disembunyikan)', contact: 'Kontak' };

function SettingsForm({ k, init, writable }: { k: string; init: Record<string, string>; writable: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string }>({ ok: false, t: '' });
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const o: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((x, n) => { o[n] = String(x); });
    try { await api('settings/' + k, { method: 'PUT', json: o }); setMsg({ ok: true, t: 'Tersimpan. Perubahan tampil di situs paling lambat ±1 menit.' }); }
    catch (x) { setMsg({ ok: false, t: errMsg(x) }); }
  };
  return (
    <form onSubmit={submit}><b>{SET_TITLE[k]}</b>
      <fieldset className="plain" disabled={!writable}>
        {SET[k].map(([n, ty]) => <label key={n}>{L(n)}{ty === 'textarea' ? <textarea name={n} rows={3} defaultValue={init[n] ?? ''} /> : <input name={n} defaultValue={init[n] ?? ''} />}</label>)}
      </fieldset>
      {writable && <div><button>Simpan</button></div>}
      <p className={msg.ok ? 'ok' : 'err'}>{msg.t}</p>
    </form>
  );
}

export function Settings({ can }: { can: Can }) {
  const { data, err } = useLoad(() => api<Row[]>('settings'), []);
  if (!data) return <><h1>Pengaturan</h1><Status err={err} loading /></>;
  const v: Record<string, Record<string, string>> = Object.fromEntries(data.map(r => [r.key, r.value]));
  return (
    <>
      <h1>Pengaturan</h1>
      <p style={{ color: 'var(--dim)' }}>Kosongkan kolom untuk memakai teks bawaan. WhatsApp: angka saja, contoh 628123456789 (kosong = tombol WhatsApp disembunyikan). Statistik hanya tampil bila diisi dengan data asli.</p>
      {Object.keys(SET).map(k => <SettingsForm key={k} k={k} init={v[k] || {}} writable={can('content', 'w')} />)}
    </>
  );
}
